"use client";

/**
 * OnboardingTour — lightweight guided walkthrough for new users.
 *
 * Shows after:
 *   1. First login (onboarding wizard just completed), OR
 *   2. User clicks "Take a tour" from profile page
 *
 * Steps highlight key UI elements using data-tour="<step-id>" attributes.
 * Tour completion stored in localStorage so it only auto-shows once.
 *
 * i18n: receives labels dict, falls back to English keys.
 */

import { useState, useEffect, useCallback, useRef } from "react";

interface TourStep {
  target: string;        // data-tour attribute value
  titleKey: string;      // i18n key for step title
  descKey: string;       // i18n key for step description
  fallbackTitle: string; // English fallback
  fallbackDesc: string;  // English fallback
  position: "top" | "bottom" | "left" | "right";
  arrow?: "center" | "start" | "end";
}

const STEPS: TourStep[] = [
  {
    target: "copilot-bubble",
    titleKey: "tour_copilot_title",
    descKey: "tour_copilot_desc",
    fallbackTitle: "Meet Your AI Copilot",
    fallbackDesc: "This small icon is your most powerful tool. Ask about any stock price, get real-time OHLCV data, AI analysis, and market insights — in 8 languages: English, 中文, 日本語, 한국어, Tiếng Việt, ภาษาไทย, Bahasa Melayu, Bahasa Indonesia. Try it now!",
    position: "top",
    arrow: "end",
  },
  {
    target: "search-bar",
    titleKey: "tour_search_title",
    descKey: "tour_search_desc",
    fallbackTitle: "Search any stock",
    fallbackDesc: "Type a ticker or company name to jump straight to its analysis page. Works across all 13 markets.",
    position: "bottom",
  },
  {
    target: "watchlist-star",
    titleKey: "tour_watchlist_title",
    descKey: "tour_watchlist_desc",
    fallbackTitle: "Add to your watchlist",
    fallbackDesc: "Click the star on any stock card to track it. Your watchlist syncs across devices and feeds the AI copilot.",
    position: "bottom",
  },
  {
    target: "nav-watchlist",
    titleKey: "tour_nav_watchlist_title",
    descKey: "tour_nav_watchlist_desc",
    fallbackTitle: "Your watchlist",
    fallbackDesc: "All your starred stocks in one place. See prices, changes, and AI alerts at a glance.",
    position: "bottom",
  },
  {
    target: "nav-ai",
    titleKey: "tour_nav_ai_title",
    descKey: "tour_nav_ai_desc",
    fallbackTitle: "AI Analysis",
    fallbackDesc: "Deep-dive into any stock with our AI agents. Get fundamental, technical, and macro analysis in your language.",
    position: "bottom",
  },
  {
    target: "nav-screener",
    titleKey: "tour_nav_screener_title",
    descKey: "tour_nav_screener_desc",
    fallbackTitle: "Stock Screener",
    fallbackDesc: "Find actionable buy and sell candidates filtered by our AI scoring system. Updated daily for each market.",
    position: "bottom",
  },
  {
    target: "nav-studio",
    titleKey: "tour_nav_studio_title",
    descKey: "tour_nav_studio_desc",
    fallbackTitle: "AI Studio",
    fallbackDesc: "Create your own custom AI strategies. Define rules, backtest, and let AI run your analysis automatically.",
    position: "bottom",
  },
];

const STORAGE_KEY = "datapai_tour_completed";

type Labels = Record<string, string>;
function tl(labels: Labels, key: string, fallback: string): string {
  return labels[key] || fallback;
}

interface Props {
  labels: Labels;
  /** Force-show even if previously completed */
  force?: boolean;
  /** Auto-show for new users who just finished onboarding */
  autoShow?: boolean;
}

export default function OnboardingTour({ labels, force, autoShow }: Props) {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Check if tour should auto-show
  useEffect(() => {
    if (force) {
      setActive(true);
      return;
    }
    if (autoShow) {
      const done = localStorage.getItem(STORAGE_KEY);
      if (!done) {
        // Small delay so page finishes rendering
        const timer = setTimeout(() => setActive(true), 800);
        return () => clearTimeout(timer);
      }
    }
  }, [force, autoShow]);

  // Listen for "Take a Tour" button clicks (nav bar + homepage auto-trigger)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("[data-start-tour]");
      if (target) {
        e.preventDefault();
        setStep(0);
        setActive(true);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  // Position the tooltip relative to the target element
  const positionTooltip = useCallback(() => {
    if (!active) return;
    const currentStep = STEPS[step];
    const el = document.querySelector(`[data-tour="${currentStep.target}"]`);
    if (!el) {
      setPos(null);
      return;
    }
    // Scroll element into view first, then measure viewport coords
    el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    // Small delay to let scroll settle before measuring
    requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      setPos({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    });
  }, [active, step]);

  useEffect(() => {
    positionTooltip();
    window.addEventListener("resize", positionTooltip);
    window.addEventListener("scroll", positionTooltip);
    return () => {
      window.removeEventListener("resize", positionTooltip);
      window.removeEventListener("scroll", positionTooltip);
    };
  }, [positionTooltip]);

  const finish = useCallback(() => {
    setActive(false);
    setStep(0);
    localStorage.setItem(STORAGE_KEY, "1");
  }, []);

  const next = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      finish();
    }
  }, [step, finish]);

  const prev = useCallback(() => {
    if (step > 0) setStep((s) => s - 1);
  }, [step]);

  // Keyboard navigation
  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      if (e.key === "ArrowRight" || e.key === "Enter") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [active, next, prev, finish]);

  if (!active) {
    // Render nothing when not active — tour can be triggered externally
    return null;
  }

  const currentStep = STEPS[step];
  const title = tl(labels, currentStep.titleKey, currentStep.fallbackTitle);
  const desc = tl(labels, currentStep.descKey, currentStep.fallbackDesc);

  // Calculate tooltip position
  let tooltipStyle: React.CSSProperties = { position: "absolute", zIndex: 10002 };
  if (pos) {
    const GAP = 12;
    switch (currentStep.position) {
      case "bottom":
        tooltipStyle.top = pos.top + pos.height + GAP;
        tooltipStyle.left = Math.max(8, pos.left + pos.width / 2 - 160);
        break;
      case "top":
        tooltipStyle.top = pos.top - GAP;
        tooltipStyle.left = Math.max(8, pos.left + pos.width / 2 - 160);
        tooltipStyle.transform = "translateY(-100%)";
        break;
      case "left":
        tooltipStyle.top = pos.top + pos.height / 2 - 60;
        tooltipStyle.left = pos.left - GAP;
        tooltipStyle.transform = "translateX(-100%)";
        break;
      case "right":
        tooltipStyle.top = pos.top + pos.height / 2 - 60;
        tooltipStyle.left = pos.left + pos.width + GAP;
        break;
    }
    // Clamp right edge
    if (typeof tooltipStyle.left === "number" && tooltipStyle.left > window.innerWidth - 340) {
      tooltipStyle.left = window.innerWidth - 340;
    }
  }

  return (
    <div ref={overlayRef} style={{ position: "fixed", inset: 0, zIndex: 10000 }}>
      {/* Semi-transparent overlay with cutout */}
      <svg
        style={{ position: "fixed", inset: 0, width: "100%", height: "100%", zIndex: 10000 }}
        pointerEvents="none"
      >
        <defs>
          <mask id="tour-mask">
            <rect width="100%" height="100%" fill="white" />
            {pos && (
              <rect
                x={pos.left - 6}
                y={pos.top - 6}
                width={pos.width + 12}
                height={pos.height + 12}
                rx={8}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.55)"
          mask="url(#tour-mask)"
          pointerEvents="all"
          onClick={finish}
        />
      </svg>

      {/* Highlight ring around target */}
      {pos && (
        <div
          style={{
            position: "absolute",
            top: pos.top - 6,
            left: pos.left - 6,
            width: pos.width + 12,
            height: pos.height + 12,
            borderRadius: 8,
            border: "2px solid #2e8b57",
            boxShadow: "0 0 0 4px rgba(46,139,87,0.25), 0 0 20px rgba(46,139,87,0.15)",
            zIndex: 10001,
            pointerEvents: "none",
            transition: "all 0.3s ease",
          }}
        />
      )}

      {/* Tooltip card */}
      <div style={tooltipStyle}>
        <div
          style={{
            width: 320,
            background: "#fff",
            borderRadius: 12,
            boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            padding: "20px",
            position: "relative",
          }}
        >
          {/* Step counter */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#2e8b57", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {tl(labels, "tour_step_label", "Step")} {step + 1} / {STEPS.length}
            </span>
            <button
              onClick={finish}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 18, lineHeight: 1 }}
              aria-label="Close tour"
            >
              ×
            </button>
          </div>

          {/* Progress bar */}
          <div style={{ height: 3, background: "#e5e7eb", borderRadius: 2, marginBottom: 14 }}>
            <div
              style={{
                height: "100%",
                background: "#2e8b57",
                borderRadius: 2,
                width: `${((step + 1) / STEPS.length) * 100}%`,
                transition: "width 0.3s ease",
              }}
            />
          </div>

          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#252525", marginBottom: 6 }}>{title}</h3>
          <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.5, marginBottom: 16 }}>{desc}</p>

          {/* Navigation buttons */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button
              onClick={finish}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#9ca3af",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {tl(labels, "tour_skip", "Skip tour")}
            </button>
            <div style={{ display: "flex", gap: 8 }}>
              {step > 0 && (
                <button
                  onClick={prev}
                  style={{
                    padding: "6px 16px",
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    background: "#fff",
                    color: "#374151",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {tl(labels, "tour_back", "Back")}
                </button>
              )}
              <button
                onClick={next}
                style={{
                  padding: "6px 16px",
                  borderRadius: 8,
                  border: "none",
                  background: "#2e8b57",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {step < STEPS.length - 1
                  ? tl(labels, "tour_next", "Next")
                  : tl(labels, "tour_finish", "Got it!")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

/**
 * ProfileBadge — compact nav indicator with dropdown menu.
 *
 * States:
 *   - onboarding not done → pulsing orange dot → links to /profile/onboarding
 *   - onboarding done → coloured dot + "Profile" label → dropdown with:
 *       • My Profile (→ /profile)
 *       • Take a tour (clears tour storage, reloads to trigger tour)
 */

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

const RISK_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  CONSERVATIVE: { bg: "#eff6ff", text: "#1d4ed8", dot: "#3b82f6" },
  MODERATE:     { bg: "#f0fdf4", text: "#166534", dot: "#22c55e" },
  AGGRESSIVE:   { bg: "#fff7ed", text: "#9a3412", dot: "#f97316" },
  SPECULATIVE:  { bg: "#fdf4ff", text: "#7e22ce", dot: "#a855f7" },
};

interface Props {
  riskTolerance:  string | null;
  onboardingDone: boolean;
  profileLabel?: string;
  setupLabel?: string;
  tourLabel?: string;
}

export default function ProfileBadge({ riskTolerance, onboardingDone, profileLabel, setupLabel, tourLabel }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Not set up yet → pulsing prompt
  if (!onboardingDone || !riskTolerance) {
    return (
      <button
        onClick={() => router.push("/profile/onboarding")}
        title={setupLabel || "Set up your investor profile"}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:brightness-95"
        style={{ background: "#fff7ed", color: "#9a3412", border: "1px solid #fed7aa" }}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ background: "#f97316" }} />
          <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "#f97316" }} />
        </span>
        {setupLabel || "Set up profile"}
      </button>
    );
  }

  const cfg = RISK_COLORS[riskTolerance] ?? RISK_COLORS["MODERATE"];

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        title={profileLabel || "Profile"}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:brightness-95"
        style={{ background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.dot}40` }}
      >
        <span className="inline-block w-2 h-2 rounded-full" style={{ background: cfg.dot }} />
        {profileLabel || "Profile"}
        <svg className="w-3 h-3 ml-0.5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[160px]"
        >
          <button
            onClick={() => { setOpen(false); router.push("/profile"); }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <span className="text-base">👤</span>
            {profileLabel || "Profile"}
          </button>
          <button
            onClick={() => {
              setOpen(false);
              localStorage.removeItem("datapai_tour_completed");
              window.location.href = "/";
            }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <span className="text-base">🎯</span>
            {tourLabel || "Take a tour"}
          </button>
        </div>
      )}
    </div>
  );
}

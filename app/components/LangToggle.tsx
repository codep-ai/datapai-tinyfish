"use client";

/**
 * LangToggle — language selector dropdown.
 * Sets a `lang` cookie (1 year) and reloads the page so server components
 * re-render with the new language.
 */

import { useState, useRef, useEffect } from "react";
import type { Lang } from "@/lib/translations";

type LangOption = {
  lang: string;
  display_name: string;
  flag_emoji: string;
};

export default function LangToggle({
  current,
  languages,
  buttonLabel,
}: {
  current: Lang;
  languages: LangOption[];
  buttonLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function select(lang: string) {
    document.cookie = `lang=${lang}; path=/; max-age=31536000; SameSite=Lax`;
    setOpen(false);
    window.location.reload();
  }

  const currentLang = languages.find((l) => l.lang === current);
  const label = buttonLabel
    ? `${currentLang?.flag_emoji ?? ""} ${buttonLabel}`
    : currentLang
    ? `${currentLang.flag_emoji} ${currentLang.display_name}`
    : current.toUpperCase();

  return (
    <div ref={ref} className="relative" data-tour="lang-toggle">
      <button
        onClick={() => setOpen(!open)}
        className="text-sm font-semibold px-2.5 py-1 rounded-md border transition-colors hover:bg-gray-50"
        style={{
          fontSize: "0.82rem",
          color: "#2e8b57",
          borderColor: "#d1fae5",
          background: "#f0fdf4",
        }}
      >
        {label}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1"
          style={{ maxHeight: "320px", overflowY: "auto" }}
        >
          {languages.map((l) => (
            <button
              key={l.lang}
              onClick={() => select(l.lang)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 ${
                l.lang === current ? "bg-green-50 text-[#2e8b57] font-semibold" : "text-gray-700"
              }`}
            >
              <span>{l.flag_emoji}</span>
              <span>{l.display_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

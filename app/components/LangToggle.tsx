"use client";

/**
 * LangToggle — EN / 中文 switch.
 * Sets a `lang` cookie (1 year) and reloads the page so server components
 * re-render with the new language.
 */

import type { Lang } from "@/lib/translations";

export default function LangToggle({ current }: { current: Lang }) {
  function toggle() {
    const next: Lang = current === "en" ? "zh" : "en";
    document.cookie = `lang=${next}; path=/; max-age=31536000; SameSite=Lax`;
    window.location.reload();
  }

  return (
    <button
      onClick={toggle}
      title={current === "en" ? "切换到中文" : "Switch to English"}
      className="text-sm font-semibold px-2.5 py-1 rounded-md border transition-colors hover:bg-gray-50"
      style={{
        fontSize: "0.82rem",
        color: "#2e8b57",
        borderColor: "#d1fae5",
        background: "#f0fdf4",
        letterSpacing: current === "zh" ? "0.02em" : undefined,
      }}
    >
      {current === "en" ? "中文" : "EN"}
    </button>
  );
}

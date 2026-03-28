"use client";
import { useState, useRef, useEffect } from "react";

interface Market {
  href: string;
  label: string;
  flag: string;
}

export default function MarketDropdown({ markets, buttonLabel }: { markets: Market[]; buttonLabel: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="text-gray-500 hover:text-[#2e8b57] transition-colors font-medium px-4 py-2 rounded-md hover:bg-gray-50 flex items-center gap-1"
        style={{ fontSize: "0.92rem" }}
      >
        {buttonLabel}
        <svg className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[180px]">
          {markets.map((m) => (
            <a
              key={m.href}
              href={m.href}
              className="flex items-center gap-2.5 px-4 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
              style={{ fontSize: "0.88rem" }}
              onClick={() => setOpen(false)}
            >
              <span>{m.flag}</span>
              <span>{m.label}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";

interface Props {
  count: number;
}

export default function ViewAlertsButton({ count }: Props) {
  if (count === 0) {
    return (
      <Link
        href="/alerts"
        className="bg-white text-brand font-semibold px-6 py-2.5 rounded uppercase tracking-wide text-sm hover:bg-white/90 transition-colors shadow-sm"
      >
        View Alerts →
      </Link>
    );
  }

  return (
    <Link
      href="/alerts"
      className="inline-block font-bold uppercase tracking-wide text-sm rounded transition-all duration-300"
      style={{
        background: "#fd8412",
        color: "#ffffff",
        fontWeight: 800,
        padding: "10px 28px",
        letterSpacing: "0.06em",
        textShadow: "0 1px 2px rgba(0,0,0,0.25)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)";
        (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 4px 10px rgba(0,0,0,.25)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.transform = "";
        (e.currentTarget as HTMLAnchorElement).style.boxShadow = "";
      }}
    >
      View {count} Alert{count !== 1 ? "s" : ""} →
    </Link>
  );
}

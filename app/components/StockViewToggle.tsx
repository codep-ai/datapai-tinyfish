"use client";
import { useState } from "react";

export default function StockViewToggle({
  gridView,
  listView,
  gridLabel = "Grid",
  listLabel = "List",
}: {
  gridView: React.ReactNode;
  listView: React.ReactNode;
  gridLabel?: string;
  listLabel?: string;
}) {
  const [view, setView] = useState<"grid" | "list">("grid");
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-4">
        <button
          onClick={() => setView("grid")}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
          style={
            view === "grid"
              ? { background: "#2e8b57", color: "#fff" }
              : { background: "#f3f4f6", color: "#6b7280" }
          }
        >
          ▦ {gridLabel}
        </button>
        <button
          onClick={() => setView("list")}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
          style={
            view === "list"
              ? { background: "#2e8b57", color: "#fff" }
              : { background: "#f3f4f6", color: "#6b7280" }
          }
        >
          ☰ {listLabel}
        </button>
      </div>
      {view === "grid" ? gridView : listView}
    </div>
  );
}

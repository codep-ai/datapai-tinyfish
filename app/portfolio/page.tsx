"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import ScreenshotImport from "../components/ScreenshotImport";

type Labels = Record<string, string>;

function getLangFromCookie(): string {
  if (typeof document === "undefined") return "en";
  const match = document.cookie.match(/(?:^|;\s*)lang=([^;]*)/);
  return match?.[1] ?? "en";
}

function useLabels(): Labels {
  const [labels, setLabels] = useState<Labels>({});
  useEffect(() => {
    const lang = getLangFromCookie();
    if (lang === "en") return;
    fetch(`/api/i18n/labels?lang=${lang}&category=portfolio,common,market`)
      .then((r) => r.json())
      .then(setLabels)
      .catch(() => {});
  }, []);
  return labels;
}

function ll(labels: Labels, key: string, fallback: string): string {
  return labels[key] ?? fallback;
}

interface Holding {
  id: string;
  ticker: string;
  exchange: string;
  shares: number;
  avg_cost: number;
  current_price: number | null;
  pnl_pct: number | null;
  pnl_value: number | null;
  added_at: string;
  notes: string | null;
}

interface Snapshot {
  snapshot_date: string;
  total_value: number;
  total_cost: number;
  daily_pnl: number;
  total_pnl: number;
  total_pnl_pct: number;
  benchmark_return: number;
}

interface PortfolioSummary {
  total_value: number;
  total_cost: number;
  total_pnl: number;
  total_pnl_pct: number;
  positions: number;
}

function fmtMoney(val: number | null): string {
  if (val == null) return "--";
  return val.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

function pctColor(val: number | null): string {
  if (val == null) return "text-gray-400";
  return val >= 0 ? "text-emerald-600" : "text-red-500";
}

function fmtPct(val: number | null): string {
  if (val == null) return "--";
  return `${val >= 0 ? "+" : ""}${Number(val).toFixed(2)}%`;
}

export default function PortfolioPage() {
  const labels = useLabels();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(true);

  // Add holding form
  const [showForm, setShowForm] = useState(false);
  const [ticker, setTicker] = useState("");
  const [exchange, setExchange] = useState("US");
  const [shares, setShares] = useState("");
  const [avgCost, setAvgCost] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/portfolio");
      const data = await res.json();
      if (!data.ok && res.status === 401) {
        setAuthed(false);
        setLoading(false);
        return;
      }
      if (data.ok) {
        setHoldings(data.holdings);
        setSnapshots(data.snapshots);
        setSummary(data.summary);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const addHolding = async () => {
    if (!ticker || !shares || !avgCost) return;
    await fetch("/api/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker, exchange, shares: Number(shares), avg_cost: Number(avgCost) }),
    });
    setTicker(""); setShares(""); setAvgCost(""); setShowForm(false);
    load();
  };

  const removeHolding = async (id: string) => {
    await fetch("/api/portfolio", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  };

  // Allocation percentages for simple chart
  const totalVal = holdings.reduce((s, h) => s + (h.current_price ?? h.avg_cost) * h.shares, 0);
  const COLORS = ["#2e8b57", "#6366f1", "#f59e0b", "#ef4444", "#06b6d4", "#8b5cf6", "#ec4899", "#10b981", "#3b82f6", "#f97316"];

  return (
    <div>
      {/* Hero */}
      <div
        className="w-full flex flex-col justify-center"
        style={{ background: "linear-gradient(45deg, seagreen, darkseagreen)", paddingTop: 28, paddingBottom: 28 }}
      >
        <div className="max-w-6xl mx-auto px-6 space-y-2">
          <h1 className="text-2xl font-bold text-white">
            {ll(labels, "port_title", "My Portfolio")}
          </h1>
          <p className="text-white/70 text-sm">
            {ll(labels, "port_subtitle", "Track holdings, P&L, and performance vs benchmark")}
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {!authed ? (
          <div className="text-center py-20 space-y-4">
            <p className="text-gray-500">{ll(labels, "port_login_required", "Please log in to view your portfolio")}</p>
            <Link href="/login" className="inline-block px-6 py-2 bg-[#2e8b57] text-white rounded-lg font-semibold hover:bg-[#267348]">
              {ll(labels, "nav_login", "Log In")}
            </Link>
          </div>
        ) : loading ? (
          <div className="text-center text-gray-400 py-20">Loading...</div>
        ) : (
          <>
            {/* KPI Cards */}
            {summary && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white rounded-xl border p-5 text-center">
                  <p className="text-2xl font-bold text-gray-800">{fmtMoney(summary.total_value)}</p>
                  <p className="text-xs text-gray-500 mt-1">{ll(labels, "port_total_value", "Total Value")}</p>
                </div>
                <div className="bg-white rounded-xl border p-5 text-center">
                  <p className="text-2xl font-bold text-gray-600">{fmtMoney(summary.total_cost)}</p>
                  <p className="text-xs text-gray-500 mt-1">{ll(labels, "port_total_cost", "Total Cost")}</p>
                </div>
                <div className="bg-white rounded-xl border p-5 text-center">
                  <p className={`text-2xl font-bold ${pctColor(summary.total_pnl)}`}>{fmtMoney(summary.total_pnl)}</p>
                  <p className="text-xs text-gray-500 mt-1">{ll(labels, "port_total_pnl", "Total P&L")}</p>
                </div>
                <div className="bg-white rounded-xl border p-5 text-center">
                  <p className={`text-2xl font-bold ${pctColor(summary.total_pnl_pct)}`}>{fmtPct(summary.total_pnl_pct)}</p>
                  <p className="text-xs text-gray-500 mt-1">{ll(labels, "port_return", "Return")}</p>
                </div>
                <div className="bg-white rounded-xl border p-5 text-center">
                  <p className="text-2xl font-bold text-gray-800">{summary.positions}</p>
                  <p className="text-xs text-gray-500 mt-1">{ll(labels, "port_positions", "Positions")}</p>
                </div>
              </div>
            )}

            {/* Allocation Bar */}
            {holdings.length > 0 && totalVal > 0 && (
              <div className="bg-white rounded-xl border p-5 space-y-3">
                <h2 className="text-sm font-semibold text-gray-700">{ll(labels, "port_allocation", "Allocation")}</h2>
                <div className="flex rounded-lg overflow-hidden h-6">
                  {holdings.map((h, i) => {
                    const pct = ((h.current_price ?? h.avg_cost) * h.shares) / totalVal * 100;
                    if (pct < 1) return null;
                    return (
                      <div
                        key={h.id}
                        className="relative group"
                        style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                        title={`${h.ticker} ${pct.toFixed(1)}%`}
                      >
                        {pct > 5 && (
                          <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-semibold">
                            {h.ticker}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-3 text-xs">
                  {holdings.map((h, i) => (
                    <span key={h.id} className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      {h.ticker} ({(((h.current_price ?? h.avg_cost) * h.shares) / totalVal * 100).toFixed(1)}%)
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Holdings Table */}
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="px-5 py-3 border-b bg-gray-50 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700">{ll(labels, "port_holdings", "Holdings")}</h2>
                <button
                  onClick={() => setShowForm(!showForm)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#2e8b57] text-white hover:bg-[#267348] transition"
                >
                  {showForm ? ll(labels, "port_cancel", "Cancel") : ll(labels, "port_add", "+ Add Holding")}
                </button>
              </div>

              {/* Add Form */}
              {showForm && (
                <div className="px-5 py-3 border-b bg-emerald-50/50 flex flex-wrap gap-3 items-end">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">{ll(labels, "pf_ticker", "Ticker")}</label>
                    <input className="border rounded px-2 py-1 text-sm w-24" value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} placeholder="AAPL" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">{ll(labels, "pf_exchange", "Exchange")}</label>
                    <select className="border rounded px-2 py-1 text-sm" value={exchange} onChange={(e) => setExchange(e.target.value)}>
                      {[["US","mkt_US"],["ASX","mkt_ASX"],["HKEX","mkt_HKEX"],["SET","mkt_SET"],["KLSE","mkt_KLSE"],["IDX","mkt_IDX"],["HOSE","mkt_HOSE"],["SSE","mkt_SSE"],["SZSE","mkt_SZSE"],["LSE","mkt_LSE"]].map(([v,k]) => (
                        <option key={v} value={v}>{ll(labels, k, v)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">{ll(labels, "pf_shares", "Shares")}</label>
                    <input className="border rounded px-2 py-1 text-sm w-20" type="number" value={shares} onChange={(e) => setShares(e.target.value)} placeholder="100" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">{ll(labels, "pf_avg_price", "Avg Price")}</label>
                    <input className="border rounded px-2 py-1 text-sm w-24" type="number" step="0.01" value={avgCost} onChange={(e) => setAvgCost(e.target.value)} placeholder="150.00" />
                  </div>
                  <button onClick={addHolding} className="text-xs font-semibold px-4 py-1.5 rounded-lg bg-[#2e8b57] text-white hover:bg-[#267348]">
                    {ll(labels, "port_save", "Save")}
                  </button>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 text-xs border-b">
                      <th className="px-4 py-2">{ll(labels, "port_ticker", "Ticker")}</th>
                      <th className="px-4 py-2">{ll(labels, "port_exchange", "Market")}</th>
                      <th className="px-4 py-2 text-right">{ll(labels, "port_shares", "Shares")}</th>
                      <th className="px-4 py-2 text-right">{ll(labels, "port_avg_cost", "Avg Cost")}</th>
                      <th className="px-4 py-2 text-right">{ll(labels, "port_current", "Current")}</th>
                      <th className="px-4 py-2 text-right">{ll(labels, "port_pnl", "P&L")}</th>
                      <th className="px-4 py-2 text-right">{ll(labels, "port_pnl_pct", "P&L %")}</th>
                      <th className="px-4 py-2 text-right">{ll(labels, "port_value", "Value")}</th>
                      <th className="px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {holdings.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                          {ll(labels, "port_empty", "No holdings yet. Click '+ Add Holding' to get started.")}
                        </td>
                      </tr>
                    ) : (
                      holdings.map((h) => (
                        <tr key={h.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-2">
                            <Link href={`/ticker/${h.ticker}?exchange=${h.exchange}`} className="text-[#2e8b57] font-medium hover:underline">
                              {h.ticker}
                            </Link>
                          </td>
                          <td className="px-4 py-2 text-gray-500 text-xs">{h.exchange}</td>
                          <td className="px-4 py-2 text-right">{Number(h.shares).toLocaleString()}</td>
                          <td className="px-4 py-2 text-right">{fmtMoney(Number(h.avg_cost))}</td>
                          <td className="px-4 py-2 text-right">{fmtMoney(h.current_price)}</td>
                          <td className={`px-4 py-2 text-right font-medium ${pctColor(h.pnl_value)}`}>{fmtMoney(h.pnl_value)}</td>
                          <td className={`px-4 py-2 text-right font-medium ${pctColor(h.pnl_pct)}`}>{fmtPct(h.pnl_pct)}</td>
                          <td className="px-4 py-2 text-right">{fmtMoney((h.current_price ?? Number(h.avg_cost)) * Number(h.shares))}</td>
                          <td className="px-4 py-2 text-right">
                            <button onClick={() => removeHolding(h.id)} className="text-red-400 hover:text-red-600 text-xs">
                              {ll(labels, "port_remove", "Remove")}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Equity Curve (snapshots) */}
            {snapshots.length > 0 && (
              <div className="bg-white rounded-xl border overflow-hidden">
                <div className="px-5 py-3 border-b bg-gray-50">
                  <h2 className="text-sm font-semibold text-gray-700">{ll(labels, "port_history", "Portfolio History")}</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 text-xs border-b">
                        <th className="px-4 py-2">{ll(labels, "port_date", "Date")}</th>
                        <th className="px-4 py-2 text-right">{ll(labels, "port_value", "Value")}</th>
                        <th className="px-4 py-2 text-right">{ll(labels, "port_daily_pnl", "Daily P&L")}</th>
                        <th className="px-4 py-2 text-right">{ll(labels, "port_total_pnl", "Total P&L")}</th>
                        <th className="px-4 py-2 text-right">{ll(labels, "port_return", "Return")}</th>
                        <th className="px-4 py-2 text-right">{ll(labels, "port_benchmark", "S&P 500")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {snapshots.map((s) => (
                        <tr key={s.snapshot_date} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-2 text-gray-500 text-xs">{s.snapshot_date}</td>
                          <td className="px-4 py-2 text-right">{fmtMoney(Number(s.total_value))}</td>
                          <td className={`px-4 py-2 text-right ${pctColor(Number(s.daily_pnl))}`}>{fmtMoney(Number(s.daily_pnl))}</td>
                          <td className={`px-4 py-2 text-right ${pctColor(Number(s.total_pnl))}`}>{fmtMoney(Number(s.total_pnl))}</td>
                          <td className={`px-4 py-2 text-right font-medium ${pctColor(Number(s.total_pnl_pct))}`}>{fmtPct(Number(s.total_pnl_pct))}</td>
                          <td className={`px-4 py-2 text-right ${pctColor(Number(s.benchmark_return))}`}>{fmtPct(Number(s.benchmark_return))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* Screenshot Import */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden mt-8">
          <div className="px-5 py-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">📸 {ll(labels, "import_title", "Import from Screenshot")}</h3>
            <p className="text-xs text-gray-400 mb-3">{ll(labels, "import_desc", "Upload a screenshot from your broker app to quickly add holdings.")}</p>
            <ScreenshotImport mode="portfolio" onComplete={load} labels={labels} />
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

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
    fetch(`/api/i18n/labels?lang=${lang}&category=performance,common,signal,market`)
      .then((r) => r.json())
      .then(setLabels)
      .catch(() => {});
  }, []);
  return labels;
}

function ll(labels: Labels, key: string, fallback: string): string {
  return labels[key] ?? fallback;
}

interface Summary {
  total_signals: number;
  wins: number;
  losses: number;
  win_rate: number;
  avg_return_7d: number;
  avg_return_30d: number;
  avg_return_90d: number;
  avg_alpha_7d: number;
  avg_alpha_30d: number;
  avg_alpha_90d: number;
}

interface DirStat {
  signal_direction: string;
  total: number;
  win_rate: number;
  avg_return_30d: number;
  avg_alpha_30d: number;
}

interface ExStat {
  exchange: string;
  total: number;
  win_rate: number;
  avg_return_30d: number;
}

interface Signal {
  ticker: string;
  exchange: string;
  signal_direction: string;
  signal_date: string;
  signal_price: number;
  return_7d: number | null;
  return_30d: number | null;
  return_90d: number | null;
  alpha_30d: number | null;
  outcome: string;
}

function pctColor(val: number | null): string {
  if (val == null) return "text-gray-400";
  return val >= 0 ? "text-emerald-600" : "text-red-500";
}

function fmtPct(val: number | string | null): string {
  if (val == null) return "--";
  const n = Number(val);
  if (isNaN(n)) return "--";
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

function dirBadge(dir: string): string {
  switch (dir) {
    case "STRONG_BUY": return "bg-emerald-600 text-white";
    case "BUY": return "bg-emerald-100 text-emerald-700";
    case "HOLD": return "bg-gray-100 text-gray-600";
    case "SELL": return "bg-red-100 text-red-600";
    case "STRONG_SELL": return "bg-red-600 text-white";
    default: return "bg-gray-100 text-gray-600";
  }
}

function dirLabel(dir: string, labels: Labels): string {
  const key = "sig_" + dir.toLowerCase();
  return ll(labels, key, dir);
}

export default function PerformancePage() {
  const labels = useLabels();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [byDir, setByDir] = useState<DirStat[]>([]);
  const [byEx, setByEx] = useState<ExStat[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = `/api/performance${filter ? `?direction=${filter}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.ok) {
        setSummary(data.summary);
        setByDir(data.by_direction);
        setByEx(data.by_exchange);
        setSignals(data.signals);
      }
    } catch {}
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      {/* Hero */}
      <div
        className="w-full flex flex-col justify-center"
        style={{ background: "linear-gradient(45deg, seagreen, darkseagreen)", paddingTop: 28, paddingBottom: 28 }}
      >
        <div className="max-w-6xl mx-auto px-6 space-y-2">
          <h1 className="text-2xl font-bold text-white">
            {ll(labels, "perf_title", "Signal Performance")}
          </h1>
          <p className="text-white/70 text-sm">
            {ll(labels, "perf_subtitle", "Track accuracy and returns of AI-generated trading signals across all markets")}
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {loading ? (
          <div className="text-center text-gray-400 py-20">Loading...</div>
        ) : !summary ? (
          <div className="text-center text-gray-400 py-20">No data available</div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border p-5 text-center">
                <p className="text-3xl font-bold text-[#2e8b57]">{summary.win_rate}%</p>
                <p className="text-xs text-gray-500 mt-1">{ll(labels, "perf_win_rate", "Win Rate")}</p>
              </div>
              <div className="bg-white rounded-xl border p-5 text-center">
                <p className="text-3xl font-bold text-gray-800">{summary.total_signals}</p>
                <p className="text-xs text-gray-500 mt-1">{ll(labels, "perf_total_signals", "Total Signals")}</p>
              </div>
              <div className="bg-white rounded-xl border p-5 text-center">
                <p className={`text-3xl font-bold ${pctColor(summary.avg_return_30d)}`}>{fmtPct(summary.avg_return_30d)}</p>
                <p className="text-xs text-gray-500 mt-1">{ll(labels, "perf_avg_return_30d", "Avg Return (30d)")}</p>
              </div>
              <div className="bg-white rounded-xl border p-5 text-center">
                <p className={`text-3xl font-bold ${pctColor(summary.avg_alpha_30d)}`}>{fmtPct(summary.avg_alpha_30d)}</p>
                <p className="text-xs text-gray-500 mt-1">{ll(labels, "perf_avg_alpha", "Avg Alpha vs S&P 500")}</p>
              </div>
            </div>

            {/* By Direction */}
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="px-5 py-3 border-b bg-gray-50">
                <h2 className="text-sm font-semibold text-gray-700">{ll(labels, "perf_by_direction", "Performance by Signal Direction")}</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 text-xs border-b">
                      <th className="px-5 py-2">{ll(labels, "perf_direction", "Direction")}</th>
                      <th className="px-5 py-2 text-right">{ll(labels, "perf_count", "Signals")}</th>
                      <th className="px-5 py-2 text-right">{ll(labels, "perf_win_rate", "Win Rate")}</th>
                      <th className="px-5 py-2 text-right">{ll(labels, "perf_avg_return_30d", "Avg Return (30d)")}</th>
                      <th className="px-5 py-2 text-right">{ll(labels, "perf_avg_alpha", "Alpha (30d)")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byDir.map((d) => (
                      <tr key={d.signal_direction} className="border-b hover:bg-gray-50">
                        <td className="px-5 py-2">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded ${dirBadge(d.signal_direction)}`}>
                            {dirLabel(d.signal_direction, labels)}
                          </span>
                        </td>
                        <td className="px-5 py-2 text-right">{d.total}</td>
                        <td className="px-5 py-2 text-right font-medium">{d.win_rate}%</td>
                        <td className={`px-5 py-2 text-right font-medium ${pctColor(d.avg_return_30d)}`}>{fmtPct(d.avg_return_30d)}</td>
                        <td className={`px-5 py-2 text-right font-medium ${pctColor(d.avg_alpha_30d)}`}>{fmtPct(d.avg_alpha_30d)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* By Exchange */}
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="px-5 py-3 border-b bg-gray-50">
                <h2 className="text-sm font-semibold text-gray-700">{ll(labels, "perf_by_exchange", "Performance by Market")}</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 text-xs border-b">
                      <th className="px-5 py-2">{ll(labels, "perf_market", "Market")}</th>
                      <th className="px-5 py-2 text-right">{ll(labels, "perf_count", "Signals")}</th>
                      <th className="px-5 py-2 text-right">{ll(labels, "perf_win_rate", "Win Rate")}</th>
                      <th className="px-5 py-2 text-right">{ll(labels, "perf_avg_return_30d", "Avg Return (30d)")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byEx.map((e) => (
                      <tr key={e.exchange} className="border-b hover:bg-gray-50">
                        <td className="px-5 py-2 font-medium">{ll(labels, "mkt_" + e.exchange, e.exchange)}</td>
                        <td className="px-5 py-2 text-right">{e.total}</td>
                        <td className="px-5 py-2 text-right font-medium">{e.win_rate}%</td>
                        <td className={`px-5 py-2 text-right font-medium ${pctColor(e.avg_return_30d)}`}>{fmtPct(e.avg_return_30d)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Filter + Recent Signals Table */}
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="px-5 py-3 border-b bg-gray-50 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700">{ll(labels, "perf_recent_signals", "Recent Signals")}</h2>
                <select
                  className="text-xs border rounded px-2 py-1 text-gray-600"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="">{ll(labels, "perf_all", "All Directions")}</option>
                  <option value="BUY">{dirLabel("BUY", labels)}</option>
                  <option value="STRONG_BUY">{dirLabel("STRONG_BUY", labels)}</option>
                  <option value="SELL">{dirLabel("SELL", labels)}</option>
                  <option value="STRONG_SELL">{dirLabel("STRONG_SELL", labels)}</option>
                  <option value="HOLD">{dirLabel("HOLD", labels)}</option>
                </select>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 text-xs border-b">
                      <th className="px-4 py-2">{ll(labels, "perf_ticker", "Ticker")}</th>
                      <th className="px-4 py-2">{ll(labels, "perf_market", "Market")}</th>
                      <th className="px-4 py-2">{ll(labels, "perf_direction", "Direction")}</th>
                      <th className="px-4 py-2">{ll(labels, "perf_date", "Date")}</th>
                      <th className="px-4 py-2 text-right">{ll(labels, "perf_price", "Price")}</th>
                      <th className="px-4 py-2 text-right">7d</th>
                      <th className="px-4 py-2 text-right">30d</th>
                      <th className="px-4 py-2 text-right">90d</th>
                      <th className="px-4 py-2 text-right">{ll(labels, "perf_alpha_short", "Alpha")}</th>
                      <th className="px-4 py-2 text-center">{ll(labels, "perf_outcome", "Result")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {signals.slice(0, 100).map((s, i) => (
                      <tr key={`${s.ticker}-${s.signal_date}-${i}`} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2">
                          <Link href={`/ticker/${s.ticker}?exchange=${s.exchange}`} className="text-[#2e8b57] font-medium hover:underline">
                            {s.ticker}
                          </Link>
                        </td>
                        <td className="px-4 py-2 text-gray-500 text-xs">{ll(labels, "mkt_" + s.exchange, s.exchange)}</td>
                        <td className="px-4 py-2">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded ${dirBadge(s.signal_direction)}`}>
                            {dirLabel(s.signal_direction, labels)}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-gray-500 text-xs">{s.signal_date}</td>
                        <td className="px-4 py-2 text-right">${s.signal_price != null ? Number(s.signal_price).toFixed(2) : "--"}</td>
                        <td className={`px-4 py-2 text-right ${pctColor(s.return_7d)}`}>{fmtPct(s.return_7d)}</td>
                        <td className={`px-4 py-2 text-right ${pctColor(s.return_30d)}`}>{fmtPct(s.return_30d)}</td>
                        <td className={`px-4 py-2 text-right ${pctColor(s.return_90d)}`}>{fmtPct(s.return_90d)}</td>
                        <td className={`px-4 py-2 text-right ${pctColor(s.alpha_30d)}`}>{fmtPct(s.alpha_30d)}</td>
                        <td className="px-4 py-2 text-center">
                          {s.outcome === "win" ? (
                            <span className="text-emerald-600 font-bold text-xs">WIN</span>
                          ) : s.outcome === "loss" ? (
                            <span className="text-red-500 font-bold text-xs">LOSS</span>
                          ) : (
                            <span className="text-gray-400 text-xs">--</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

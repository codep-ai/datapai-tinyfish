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

// ── Current synthesis row from /api/synthesis ──
interface SynthRow {
  ticker: string;
  exchange: string;
  direction: string;
  confidence: number | string;
  conviction: string;
  thesis: string | null;
  what_bulls_say: string | null;
  what_bears_say: string | null;
  key_risk: string | null;
  ta_direction: string | null;
  fa_direction: string | null;
  ma_direction: string | null;
  signals_aligned: boolean | null;
  computed_at: string;
}

type TabKey = "current" | "track";

export default function PerformancePage() {
  const labels = useLabels();
  const [tab, setTab] = useState<TabKey>("current");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [byDir, setByDir] = useState<DirStat[]>([]);
  const [byEx, setByEx] = useState<ExStat[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [synth, setSynth] = useState<SynthRow[]>([]);
  const [synthSummary, setSynthSummary] = useState<{ total: number; by_direction: Record<string, number>; latest_computed_at: string | null } | null>(null);
  const [expandedTicker, setExpandedTicker] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [perfRes, synthRes] = await Promise.all([
        fetch(`/api/performance${filter ? `?direction=${filter}` : ""}`),
        fetch(`/api/synthesis${filter ? `?direction=${filter}` : ""}`),
      ]);
      const perf = await perfRes.json();
      const sx   = await synthRes.json();
      if (perf.ok) {
        setSummary(perf.summary);
        setByDir(perf.by_direction);
        setByEx(perf.by_exchange);
        setSignals(perf.signals);
      }
      if (sx.ok) {
        setSynth(sx.items || []);
        setSynthSummary(sx.summary || null);
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
        {/* ── Tab switcher ────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 border-b border-gray-200">
          {([
            { k: "current" as TabKey, label: "Current Recommendations", count: synthSummary?.total ?? 0, sub: synthSummary?.latest_computed_at ? `Updated ${new Date(synthSummary.latest_computed_at).toLocaleDateString()}` : "" },
            { k: "track"   as TabKey, label: "Track Record",            count: summary?.total_signals ?? 0, sub: "Historical" },
          ]).map((t) => {
            const active = tab === t.k;
            return (
              <button
                key={t.k}
                onClick={() => setTab(t.k)}
                className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${active ? "border-[#2e8b57] text-[#2e8b57]" : "border-transparent text-gray-500 hover:text-gray-700"}`}
              >
                {t.label}
                <span className="ml-2 text-xs text-gray-400 font-normal">({t.count}{t.sub ? ` · ${t.sub}` : ""})</span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-20">Loading...</div>
        ) : tab === "current" ? (
          /* ── CURRENT RECOMMENDATIONS TAB ─────────────────────────── */
          synth.length === 0 ? (
            <div className="text-center text-gray-400 py-20">
              No current recommendations yet. The synthesis engine runs nightly across the
              monitored universe; check back tomorrow.
            </div>
          ) : (
            <>
              {/* Direction distribution mini-cards */}
              <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                {(["STRONG_BUY", "BUY", "HOLD", "SELL", "STRONG_SELL"] as const).map((d) => {
                  const n = synthSummary?.by_direction?.[d] ?? 0;
                  return (
                    <div key={d} className="bg-white rounded-xl border p-4 text-center">
                      <p className={`text-2xl font-bold ${d === "STRONG_BUY" || d === "BUY" ? "text-emerald-600" : d === "STRONG_SELL" || d === "SELL" ? "text-red-500" : "text-gray-500"}`}>{n}</p>
                      <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wide">{dirLabel(d, labels)}</p>
                    </div>
                  );
                })}
              </div>

              {/* Recommendations table — click row to expand thesis */}
              <div className="bg-white rounded-xl border overflow-hidden">
                <div className="px-5 py-3 border-b bg-gray-50 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-700">AI Analyst — Latest Calls</h2>
                  <select
                    className="text-xs border rounded px-2 py-1 text-gray-600"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="">All Directions</option>
                    <option value="STRONG_BUY">{dirLabel("STRONG_BUY", labels)}</option>
                    <option value="BUY">{dirLabel("BUY", labels)}</option>
                    <option value="HOLD">{dirLabel("HOLD", labels)}</option>
                    <option value="SELL">{dirLabel("SELL", labels)}</option>
                    <option value="STRONG_SELL">{dirLabel("STRONG_SELL", labels)}</option>
                  </select>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 text-xs border-b">
                        <th className="px-4 py-2">Ticker</th>
                        <th className="px-4 py-2">Market</th>
                        <th className="px-4 py-2">Call</th>
                        <th className="px-4 py-2 text-right">Confidence</th>
                        <th className="px-4 py-2">Conviction</th>
                        <th className="px-4 py-2">Why (thesis)</th>
                        <th className="px-4 py-2 text-right">Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {synth.map((r, i) => {
                        const conf = Number(r.confidence);
                        const isOpen = expandedTicker === `${r.ticker}-${r.exchange}`;
                        return (
                          <>
                            <tr key={`${r.ticker}-${r.exchange}-${i}`} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => setExpandedTicker(isOpen ? null : `${r.ticker}-${r.exchange}`)}>
                              <td className="px-4 py-2">
                                <Link href={`/ticker/${r.ticker}?exchange=${r.exchange}`} onClick={(e) => e.stopPropagation()} className="text-[#2e8b57] font-medium hover:underline">
                                  {r.ticker}
                                </Link>
                              </td>
                              <td className="px-4 py-2 text-gray-500 text-xs">{ll(labels, "mkt_" + r.exchange, r.exchange)}</td>
                              <td className="px-4 py-2">
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${dirBadge(r.direction)}`}>
                                  {dirLabel(r.direction, labels)}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-right font-medium">{isNaN(conf) ? "—" : `${Math.round(conf * 100)}%`}</td>
                              <td className="px-4 py-2 text-xs text-gray-600">{r.conviction || "—"}</td>
                              <td className="px-4 py-2 text-xs text-gray-700 max-w-md truncate" title={r.thesis ?? ""}>
                                {r.thesis ?? "—"}
                              </td>
                              <td className="px-4 py-2 text-right text-xs text-gray-400">
                                {r.computed_at ? new Date(r.computed_at).toLocaleDateString() : "—"}
                              </td>
                            </tr>
                            {isOpen && (
                              <tr key={`${r.ticker}-${r.exchange}-${i}-detail`} className="bg-gray-50">
                                <td colSpan={7} className="px-6 py-4 text-xs text-gray-700 space-y-2">
                                  {r.thesis && <div><span className="font-bold text-gray-800">Thesis:</span> {r.thesis}</div>}
                                  {r.what_bulls_say && <div><span className="font-bold text-emerald-700">Bulls say:</span> {r.what_bulls_say}</div>}
                                  {r.what_bears_say && <div><span className="font-bold text-red-700">Bears say:</span> {r.what_bears_say}</div>}
                                  {r.key_risk && <div><span className="font-bold text-amber-700">Key risk:</span> {r.key_risk}</div>}
                                  <div className="flex gap-4 pt-2 text-[10px] text-gray-500 uppercase tracking-wide">
                                    {r.ta_direction && <span>TA: <span className="font-semibold text-gray-700">{r.ta_direction}</span></span>}
                                    {r.fa_direction && <span>FA: <span className="font-semibold text-gray-700">{r.fa_direction}</span></span>}
                                    {r.ma_direction && <span>News: <span className="font-semibold text-gray-700">{r.ma_direction}</span></span>}
                                    {r.signals_aligned !== null && <span>Signals: <span className="font-semibold text-gray-700">{r.signals_aligned ? "ALIGNED" : "CONFLICTING"}</span></span>}
                                  </div>
                                  <div className="flex gap-2 pt-3 mt-1 border-t border-gray-200">
                                    <a
                                      href={`/debate/${r.ticker}?exchange=${r.exchange}`}
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-xs px-3 py-1.5 rounded-full bg-[#2e8b57] hover:bg-[#236a44] text-white font-semibold transition-colors"
                                    >
                                      🎬 Watch full debate →
                                    </a>
                                    <a
                                      href={`/ticker/${r.ticker}/intel?exchange=${r.exchange}`}
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-xs px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold transition-colors"
                                    >
                                      Full intel →
                                    </a>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )
        ) : !summary ? (
          <div className="text-center text-gray-400 py-20">No track-record data yet</div>
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

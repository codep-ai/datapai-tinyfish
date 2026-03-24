/**
 * /intel  —  AI analysis landing page
 * Search for any stock → /ticker/[symbol]/intel
 * Lists monitored universe with cached AI signal badges.
 */

import Link from "next/link";
import { getCachedTaSignal, getActiveStocks } from "@/lib/db";
import { getLang } from "@/lib/getLang";
import { loadTranslations } from "@/lib/i18n";
import { t } from "@/lib/translations";
import TickerSearch from "../components/TickerSearch";

export const dynamic = "force-dynamic";

// ─── Signal badge helper (server-side) ───────────────────────────────────────

function signalColor(md: string): { bg: string; text: string; label: string } {
  const m = md.match(/\*\*Signal\*\*[:\s\-]+\[?([^\]\n*]+)\]?/i)
           ?? md.match(/Signal[:\s]+([A-Z/ ]+)/i);
  const raw = (m?.[1] ?? "").trim().toUpperCase();
  if (raw.includes("STRONG BUY"))  return { bg: "#d1fae5", text: "#065f46", label: "STRONG BUY ↑↑" };
  if (raw.includes("BUY"))         return { bg: "#ecfdf5", text: "#047857", label: "BUY ↑" };
  if (raw.includes("STRONG SELL")) return { bg: "#fee2e2", text: "#991b1b", label: "STRONG SELL ↓↓" };
  if (raw.includes("SELL"))        return { bg: "#fff1f2", text: "#be123c", label: "SELL ↓" };
  if (raw.includes("HOLD") || raw.includes("NEUTRAL"))
                                   return { bg: "#fffbea", text: "#92400e", label: "HOLD →" };
  return { bg: "#f3f4f6", text: "#6b7280", label: "No signal" };
}

export default async function IntelLandingPage() {
  const lang = await getLang();
  const labels = await loadTranslations(lang);

  // Load all active stocks from DB (across exchanges)
  const [nasdaqStocks, nyseStocks, asxStocks, vnStocksHose, vnStocksHnx] = await Promise.all([
    getActiveStocks("NASDAQ", lang, 500),
    getActiveStocks("NYSE", lang, 500),
    getActiveStocks("ASX", lang, 500),
    getActiveStocks("HOSE", lang, 500),
    getActiveStocks("HNX", lang, 500),
  ]);
  const allStocks = [...nasdaqStocks, ...nyseStocks, ...asxStocks, ...vnStocksHose, ...vnStocksHnx];

  // Pre-load any cached TA signals for the monitored universe
  const signals = await Promise.all(
    allStocks.map(async (tk) => ({
      ticker: { symbol: tk.symbol, name: tk.name, exchange: tk.exchange },
      signal: await getCachedTaSignal(tk.symbol, 24), // show up to 24h old signals
    }))
  );

  const withSignal    = signals.filter((s) => !!s.signal);
  const withoutSignal = signals.filter((s) => !s.signal);

  return (
    <div>
      {/* Hero */}
      <div
        className="w-full flex flex-col justify-center"
        style={{ background: "linear-gradient(45deg, seagreen, darkseagreen)", paddingTop: "36px", paddingBottom: "36px" }}
      >
        <div className="max-w-6xl mx-auto px-6 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span
              className="text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest"
              style={{ background: "rgba(255,255,255,0.2)", color: "#fff" }}
            >
              {t(labels,"intel_badge")}
            </span>
            <span className="text-white/70 text-xs">
              🌊 TinyFish IR scan · Yahoo Finance · Gemini · GPT‑5.1
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-white">
            {t(labels,"intel_hero_title")}
          </h1>

          <p className="text-white/80 text-sm max-w-xl">
            {t(labels,"intel_hero_desc")}
          </p>

          <TickerSearch placeholder={t(labels,"intel_search")} intelMode />
        </div>
      </div>

      {/* Monitored universe with signal status */}
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">

        {/* Stocks with cached AI signal */}
        {withSignal.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-[#252525] mb-5">
              {t(labels,"intel_withSignal")}
              <span className="text-base font-normal text-gray-400 ml-2">
                {t(labels,"intel_period")}
              </span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {withSignal.map(({ ticker, signal }) => {
                const sc = signalColor(signal!.signal_md);
                return (
                  <Link
                    key={ticker.symbol}
                    href={`/ticker/${ticker.symbol}/intel`}
                    className="bg-white border border-gray-200 rounded-xl px-4 py-4 shadow-sm hover:-translate-y-0.5 transition-all group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-base text-[#2e8b57] group-hover:opacity-80">
                        {ticker.symbol}
                      </span>
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: sc.bg, color: sc.text }}
                      >
                        {sc.label}
                      </span>
                    </div>
                    <div className="text-gray-400 text-xs truncate">{ticker.name}</div>
                    {signal!.current_price && (
                      <div className="text-gray-600 text-sm font-semibold mt-1.5">
                        {ticker.exchange === "ASX" ? "A$" : "$"}
                        {signal!.current_price.toFixed(2)}
                        {signal!.rsi && (
                          <span className="text-gray-400 text-xs ml-2">
                            RSI {signal!.rsi.toFixed(1)}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="text-gray-300 text-xs mt-1">
                      {new Date(signal!.generated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {" "}· {ticker.exchange}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* All monitored stocks — click to generate */}
        <div>
          <h2 className="text-2xl font-bold text-[#252525] mb-5">
            {withSignal.length > 0 ? t(labels,"intel_allStocks") : t(labels,"intel_clickGenerate")}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {withoutSignal.map(({ ticker }) => (
              <Link
                key={ticker.symbol}
                href={`/ticker/${ticker.symbol}/intel`}
                className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm hover:-translate-y-0.5 transition-all group"
              >
                <div className="font-bold text-sm text-[#2e8b57] group-hover:opacity-80">
                  {ticker.symbol}
                </div>
                <div className="text-gray-400 text-xs mt-0.5 truncate">{ticker.name}</div>
                <div className="text-gray-300 text-xs mt-1.5">{ticker.exchange} · {t(labels,"intel_noSignal")}</div>
              </Link>
            ))}
          </div>
        </div>

        {/* What is this */}
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          <h3 className="font-bold text-xl text-[#252525] mb-4">
            {t(labels,"intel_whatIs")}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm text-gray-500">
            <div>
              <div className="font-bold text-[#2e8b57] mb-2">{t(labels,"intel_ta_heading")}</div>
              {t(labels,"intel_ta_desc")}
            </div>
            <div>
              <div className="font-bold text-[#6366f1] mb-2">{t(labels,"intel_chart_heading")}</div>
              {t(labels,"intel_chart_desc")}
            </div>
            <div>
              <div className="font-bold text-[#fd8412] mb-2">{t(labels,"intel_asx_heading")}</div>
              {t(labels,"intel_asx_desc")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

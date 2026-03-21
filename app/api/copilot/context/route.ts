/**
 * GET /api/copilot/context?page=<pathname>
 *
 * Returns page-specific context for the global AI copilot.
 * The copilot calls this on page navigation to learn what the user is looking at.
 */

import { getAuthUser } from "@/lib/auth";
import { UNIVERSE, ASX_UNIVERSE, UNIVERSE_ALL } from "@/lib/universe";
import {
  getWatchlist,
  getAlertSummaryMap,
  getLatestPricesForWatchlist,
  getMaterialEventsForTickers,
  getCachedTaSignal,
  getLatestAnalysisWithAgentContent,
  getStockSynthesisFlexible,
  getRecentRuns,
} from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = searchParams.get("page") ?? "/";

  let user: { userId: string; email: string } | null = null;
  try {
    user = await getAuthUser();
  } catch { /* anonymous */ }

  try {
    // ── US homepage ──────────────────────────────────────────────────────
    if (page === "/") {
      const [alertMap, recentRuns] = await Promise.all([
        getAlertSummaryMap(),
        getRecentRuns(1),
      ]);
      const usAlerts = UNIVERSE.filter((t) => !!alertMap[t.symbol]);
      return Response.json({
        ok: true,
        data: {
          page_type: "us_homepage",
          description: "US Stock Market homepage showing monitored US blue-chip stocks with website change intelligence.",
          stock_count: UNIVERSE.length,
          stocks: UNIVERSE.map((t) => `${t.symbol} (${t.name})`).join(", "),
          alerts_count: usAlerts.length,
          alerts_tickers: usAlerts.map((t) => t.symbol).join(", "),
          last_scan: recentRuns[0]
            ? `${new Date(recentRuns[0].started_at).toLocaleString()} — ${recentRuns[0].scanned_count} scanned, ${recentRuns[0].changed_count} changed`
            : "No recent scans",
        },
      });
    }

    // ── ASX page ─────────────────────────────────────────────────────────
    if (page === "/asx") {
      const alertMap = await getAlertSummaryMap();
      const asxAlerts = ASX_UNIVERSE.filter((t) => !!alertMap[t.symbol]);
      return Response.json({
        ok: true,
        data: {
          page_type: "asx_homepage",
          description: "ASX (Australian Securities Exchange) page showing monitored Australian blue-chip stocks.",
          stock_count: ASX_UNIVERSE.length,
          stocks: ASX_UNIVERSE.map((t) => `${t.symbol} (${t.name})`).join(", "),
          alerts_count: asxAlerts.length,
          alerts_tickers: asxAlerts.map((t) => t.symbol).join(", "),
        },
      });
    }

    // ── Watchlist page ───────────────────────────────────────────────────
    if (page === "/watchlist") {
      if (!user) {
        return Response.json({
          ok: true,
          data: {
            page_type: "watchlist",
            description: "User's personal watchlist page. User is not logged in.",
            stocks: [],
          },
        });
      }
      const watchlist = await getWatchlist(user.userId);
      if (watchlist.length === 0) {
        return Response.json({
          ok: true,
          data: {
            page_type: "watchlist",
            description: "User's personal watchlist page. Watchlist is empty.",
            stocks: [],
          },
        });
      }

      // Fetch prices and news for watchlist stocks
      const priceItems = watchlist.map((w) => ({
        symbol: w.exchange === "ASX" ? `${w.symbol}.AX` : w.symbol,
        exchange: w.exchange,
      }));
      const [priceMap, newsMap] = await Promise.all([
        getLatestPricesForWatchlist(priceItems),
        getMaterialEventsForTickers(
          watchlist.map((w) => ({ ticker: w.symbol, exchange: w.exchange === "ASX" ? "ASX" : "US" })),
          72,
          3
        ),
      ]);

      const stockSummaries = watchlist.map((w) => {
        const pKey = w.exchange === "ASX" ? `${w.symbol}.AX` : w.symbol;
        const price = priceMap[pKey];
        const news = newsMap[w.symbol] ?? [];
        const cp = w.exchange === "ASX" ? "A$" : "$";
        let summary = `${w.symbol} (${w.name}, ${w.exchange})`;
        if (price) {
          const close = Number(price.close);
          const pct = Number(price.change_pct);
          if (!isNaN(close)) summary += ` — ${cp}${close.toFixed(2)}`;
          if (!isNaN(pct)) summary += ` (${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%)`;
          summary += ` [${price.trade_date}]`;
        }
        if (news.length > 0) {
          summary += ` | Breaking: ${news.map((n: { severity: string; headline: string }) => `[${n.severity}] ${n.headline}`).join("; ")}`;
        }
        return summary;
      });

      return Response.json({
        ok: true,
        data: {
          page_type: "watchlist",
          description: `User's personal watchlist with ${watchlist.length} stocks. Includes live prices, news, and AI signals.`,
          stock_count: watchlist.length,
          stocks: stockSummaries,
        },
      });
    }

    // ── Alerts page ──────────────────────────────────────────────────────
    if (page === "/alerts") {
      const alertMap = await getAlertSummaryMap();
      const alertTickers = Object.keys(alertMap);
      return Response.json({
        ok: true,
        data: {
          page_type: "alerts",
          description: `Alerts page showing ${alertTickers.length} tickers with detected website/IR page changes.`,
          alerts_count: alertTickers.length,
          alerts: alertTickers.slice(0, 30).map((sym) => {
            const a = alertMap[sym];
            return `${sym}: score=${a.alert_score.toFixed(1)}, confidence=${Math.round(a.confidence * 100)}%, changed=${a.changed_pct?.toFixed(1) ?? "?"}%`;
          }),
        },
      });
    }

    // ── Ticker detail page ───────────────────────────────────────────────
    const tickerMatch = page.match(/^\/ticker\/([A-Z0-9.]+)/i);
    if (tickerMatch) {
      const sym = tickerMatch[1].toUpperCase();
      const tickerInfo = UNIVERSE_ALL.find((t) => t.symbol === sym);
      const exchange = tickerInfo?.exchange ?? "US";

      const [analysis, taSignal, synthesis] = await Promise.all([
        getLatestAnalysisWithAgentContent(sym).catch(() => null),
        getCachedTaSignal(sym, 48).catch(() => null),
        getStockSynthesisFlexible(sym, exchange).catch(() => null),
      ]);

      const ctx: Record<string, unknown> = {
        page_type: page.includes("/intel") ? "ticker_intel" : "ticker_detail",
        description: `Viewing ${sym} (${tickerInfo?.name ?? sym}) on ${exchange}. ${page.includes("/intel") ? "AI analysis page with TA/FA/MA/CA tools." : "Stock detail page with IR snapshots and alerts."}`,
        symbol: sym,
        company: tickerInfo?.name ?? sym,
        exchange,
      };

      if (taSignal?.signal_md) {
        ctx.ta_signal = taSignal.signal_md.slice(0, 1500);
      }
      if (analysis) {
        ctx.latest_analysis = {
          what_changed: analysis.agent_what_changed?.slice(0, 300),
          signal_type: analysis.signal_type,
          severity: analysis.severity,
        };
      }
      if (synthesis) {
        ctx.synthesis = {
          direction: synthesis.direction,
          confidence: synthesis.confidence,
          one_liner: synthesis.one_liner,
        };
      }

      return Response.json({ ok: true, data: ctx });
    }

    // ── Screener page ────────────────────────────────────────────────────
    if (page === "/screener") {
      return Response.json({
        ok: true,
        data: {
          page_type: "screener",
          description: "Stock screener page. Users can filter stocks by various criteria across US and ASX markets.",
          total_stocks: UNIVERSE_ALL.length,
        },
      });
    }

    // ── Pricing page ─────────────────────────────────────────────────────
    if (page === "/pricing") {
      return Response.json({
        ok: true,
        data: {
          page_type: "pricing",
          description: "Pricing page showing DataP.ai subscription plans: Explorer (free), Analyst ($29/mo), Pro ($79/mo), Enterprise (custom).",
        },
      });
    }

    // ── Default / unknown page ───────────────────────────────────────────
    return Response.json({
      ok: true,
      data: {
        page_type: "general",
        description: `DataP.ai website change intelligence platform. Page: ${page}. Covers ${UNIVERSE.length} US stocks and ${ASX_UNIVERSE.length} ASX stocks.`,
      },
    });
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

import { getLatestAnalysesBySignalType, getWatchlist, lookupStock } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { getLang } from "@/lib/getLang";
import AlertsClient from "./AlertsClient";

export const dynamic = "force-dynamic";

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const watchlistOnly = params.watchlist === "true";
  const lang = await getLang();

  const contentOnly = await getLatestAnalysesBySignalType("CONTENT_CHANGE", 100);
  const allSignals = await getLatestAnalysesBySignalType(null, 100);

  // Build name + exchange maps from DB for all unique tickers in results (localized)
  const allTickers = new Set([...contentOnly.map((a) => a.ticker), ...allSignals.map((a) => a.ticker)]);
  const lookupEntries = await Promise.all(
    [...allTickers].map(async (sym) => {
      const entry = await lookupStock(sym, lang);
      return [sym, entry] as [string, typeof entry];
    })
  );
  const universe = Object.fromEntries(lookupEntries.map(([sym, e]) => [sym, e?.name ?? sym]));
  const exchangeMap = Object.fromEntries(lookupEntries.map(([sym, e]) => [sym, e?.exchange ?? "US"]));

  // Filter to user's watchlist symbols if ?watchlist=true
  let filteredContent = contentOnly;
  let filteredAll = allSignals;
  if (watchlistOnly) {
    const user = await getAuthUser();
    if (user) {
      const items = await getWatchlist(user.userId);
      const symbols = new Set(items.map((i) => i.symbol));
      filteredContent = contentOnly.filter((a) => symbols.has(a.ticker));
      filteredAll = allSignals.filter((a) => symbols.has(a.ticker));
    }
  }

  return (
    <AlertsClient
      contentOnly={filteredContent}
      allSignals={filteredAll}
      universe={universe}
      exchangeMap={exchangeMap}
      watchlistOnly={watchlistOnly}
    />
  );
}

import { getLatestAnalysesBySignalType, getWatchlist } from "@/lib/db";
import { UNIVERSE_ALL } from "@/lib/universe";
import { getAuthUser } from "@/lib/auth";
import AlertsClient from "./AlertsClient";

export const dynamic = "force-dynamic";

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const watchlistOnly = params.watchlist === "true";

  const contentOnly = await getLatestAnalysesBySignalType("CONTENT_CHANGE", 100);
  const allSignals = await getLatestAnalysesBySignalType(null, 100);
  const universe = Object.fromEntries(UNIVERSE_ALL.map((t) => [t.symbol, t.name]));

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
      watchlistOnly={watchlistOnly}
    />
  );
}

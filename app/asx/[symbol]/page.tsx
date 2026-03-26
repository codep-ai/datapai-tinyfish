import { redirect } from "next/navigation";

/**
 * /asx/[symbol] — redirects to the unified ticker detail page at /ticker/[symbol].
 * TickerSearch routes ASX tickers here; we forward them seamlessly.
 */
export default async function AsxSymbolPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  redirect(`/ticker/${symbol.toUpperCase()}?exchange=ASX`);
}

/**
 * lib/plan-limits.ts
 * Central plan quota definitions and enforcement helpers.
 *
 * Add a check to any API route:
 *   const check = await checkPlanLimit(userId, "watchlist");
 *   if (!check.allowed) return NextResponse.json({ error: check.message, upgradeUrl: "/pricing" }, { status: 403 });
 *
 * ── Env-var overrides (useful for seed/beta testing) ──────────────────────────
 * Set any of these in .env.dev to override the default for a specific plan:
 *
 *   QUOTA_WATCH_WATCHLIST=50          # free plan watchlist limit
 *   QUOTA_WATCH_SCANS=5               # free plan daily scans
 *   QUOTA_INDIVIDUAL_WATCHLIST=200    # individual plan watchlist limit
 *   QUOTA_INDIVIDUAL_SCANS=50         # individual plan daily scans
 *   QUOTA_PROFESSIONAL_WATCHLIST=500
 *   QUOTA_PROFESSIONAL_SCANS=200
 *   QUOTA_WATCH_AI_SIGNALS=true       # enable AI signals for free plan
 *
 * Use -1 for unlimited. Booleans accept "true"/"1"/"yes".
 */

import { getUserById, getWatchlist, getUserScanCountToday } from "./db";

// ── Quota table ───────────────────────────────────────────────────────────────

export interface PlanLimits {
  watchlistStocks:  number;   // max stocks in watchlist (-1 = unlimited)
  scansPerDay:      number;   // manual on-demand scans per day (-1 = unlimited)
  aiSignals:        boolean;  // TA signal, chart analysis, ASX trading signal
  apiAccess:        boolean;  // REST API + webhooks
}

function envInt(key: string, fallback: number): number {
  const v = process.env[key];
  if (v === undefined || v === "") return fallback;
  const n = parseInt(v, 10);
  return isNaN(n) ? fallback : n;
}

function envBool(key: string, fallback: boolean): boolean {
  const v = process.env[key];
  if (v === undefined || v === "") return fallback;
  return v === "true" || v === "1" || v === "yes";
}

const BASE_LIMITS: Record<string, PlanLimits> = {
  watch: {
    watchlistStocks: 10,
    scansPerDay:     1,
    aiSignals:       false,
    apiAccess:       false,
  },
  individual: {
    watchlistStocks: 50,
    scansPerDay:     10,
    aiSignals:       true,
    apiAccess:       false,
  },
  professional: {
    watchlistStocks: 200,
    scansPerDay:     50,
    aiSignals:       true,
    apiAccess:       true,
  },
  business: {
    watchlistStocks: -1,
    scansPerDay:     -1,
    aiSignals:       true,
    apiAccess:       true,
  },
  enterprise: {
    watchlistStocks: -1,
    scansPerDay:     -1,
    aiSignals:       true,
    apiAccess:       true,
  },
};

/** Returns limits for the given plan, with any .env.dev overrides applied. */
export function getLimits(plan?: string | null): PlanLimits {
  const key = (plan ?? "watch").toLowerCase();
  const base = BASE_LIMITS[key] ?? BASE_LIMITS["watch"];
  const envKey = key.toUpperCase();
  return {
    watchlistStocks: envInt(`QUOTA_${envKey}_WATCHLIST`, base.watchlistStocks),
    scansPerDay:     envInt(`QUOTA_${envKey}_SCANS`,     base.scansPerDay),
    aiSignals:       envBool(`QUOTA_${envKey}_AI_SIGNALS`, base.aiSignals),
    apiAccess:       envBool(`QUOTA_${envKey}_API_ACCESS`,  base.apiAccess),
  };
}

// ── Check helpers ─────────────────────────────────────────────────────────────

interface CheckResult { allowed: boolean; message?: string }

export async function checkWatchlistLimit(userId: string): Promise<CheckResult> {
  const user = await getUserById(userId);
  const plan  = (user as unknown as Record<string, string>)?.plan ?? "watch";
  const limits = getLimits(plan);

  if (limits.watchlistStocks === -1) return { allowed: true };

  const items = await getWatchlist(userId);
  if (items.length >= limits.watchlistStocks) {
    return {
      allowed: false,
      message: `Your ${planLabel(plan)} plan allows up to ${limits.watchlistStocks} stocks in your watchlist. Upgrade to add more.`,
    };
  }
  return { allowed: true };
}

export async function checkAiSignalAccess(userId: string, symbol?: string): Promise<CheckResult> {
  const user = await getUserById(userId);
  const plan  = (user as unknown as Record<string, string>)?.plan ?? "watch";
  const limits = getLimits(plan);

  if (!limits.aiSignals) {
    // Free plan: allow AI signals for stocks in the user's watchlist (up to 10)
    if (symbol) {
      const watchlist = await getWatchlist(userId);
      const inWatchlist = watchlist.some((w) => w.symbol === symbol.toUpperCase());
      if (inWatchlist) {
        return { allowed: true }; // watchlist stock — unlock AI signals
      }
    }
    return {
      allowed: false,
      message: `AI signals are available for your watchlist stocks (up to ${limits.watchlistStocks}). Add this stock to your watchlist first, or upgrade to Individual ($49/mo) for unlimited access.`,
    };
  }
  return { allowed: true };
}

export async function checkScanLimit(userId: string, symbol?: string): Promise<CheckResult> {
  const user = await getUserById(userId);
  const plan  = (user as unknown as Record<string, string>)?.plan ?? "watch";
  const limits = getLimits(plan);

  if (limits.scansPerDay === -1) return { allowed: true };

  // Free plan: allow scans for watchlist stocks without counting against daily limit
  if (symbol && plan === "watch") {
    const watchlist = await getWatchlist(userId);
    const inWatchlist = watchlist.some((w) => w.symbol === symbol.toUpperCase());
    if (inWatchlist) {
      return { allowed: true }; // watchlist stock — no scan limit
    }
  }

  const count = await getUserScanCountToday(userId);
  if (count >= limits.scansPerDay) {
    return {
      allowed: false,
      message: `Your ${planLabel(plan)} plan allows ${limits.scansPerDay} on-demand scan${limits.scansPerDay === 1 ? "" : "s"} per day. Add this stock to your watchlist for unlimited scans, or upgrade for more.`,
    };
  }
  return { allowed: true };
}

export async function checkApiAccess(userId: string): Promise<CheckResult> {
  const user = await getUserById(userId);
  const plan  = (user as unknown as Record<string, string>)?.plan ?? "watch";
  const limits = getLimits(plan);

  if (!limits.apiAccess) {
    return {
      allowed: false,
      message: `REST API access requires the Professional plan ($299/mo) or higher.`,
    };
  }
  return { allowed: true };
}

function planLabel(plan: string): string {
  const labels: Record<string, string> = {
    watch: "Free", individual: "Individual",
    professional: "Professional", business: "Business", enterprise: "Enterprise",
  };
  return labels[plan] ?? plan;
}

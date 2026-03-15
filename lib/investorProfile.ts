/**
 * lib/investorProfile.ts
 *
 * All DB read/write helpers for datapai.investor_profile.
 * Keyed on TEXT user_id (Next.js UUID auth).
 *
 * Also exports buildProfileContext() — turns a profile into a system-prompt
 * block injected into every AI call so the LLM never has to ask the user
 * the same questions again.
 */

import { getPool } from "./db";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface InvestorProfile {
  user_id:              string;
  risk_tolerance:       "CONSERVATIVE" | "MODERATE" | "AGGRESSIVE" | "SPECULATIVE";
  investment_horizon:   "SHORT" | "MEDIUM" | "LONG";
  strategies:           string[];
  preferred_exchanges:  string[];
  preferred_sectors:    string[];
  excluded_sectors:     string[];
  portfolio_size:       "STARTER" | "RETAIL" | "HNW" | "INSTITUTIONAL";
  portfolio_tickers:    string[];
  analysis_preference:  "TA" | "FA" | "MIX" | "OTHER";
  preferred_lang:       string;   // "en" | "zh"
  response_style:       "BRIEF" | "BALANCED" | "DETAILED";
  show_risk_warnings:   boolean;
  esg_only:             boolean;
  tax_context:          string;
  screener_defaults:    ScreenerDefaults;
  onboarding_completed: boolean;
  onboarding_step:      number;
  created_at:           string;
  updated_at:           string;
}

export interface ScreenerDefaults {
  exchange?:  string;
  signal?:    string;
  sector?:    string;
  minScore?:  string;
  maxRisk?:   string;
  limit?:     number;
}

export type ProfileUpdate = Partial<Omit<InvestorProfile, "user_id" | "created_at" | "updated_at">>;

// Default profile returned when no row exists yet
const DEFAULT_PROFILE: Omit<InvestorProfile, "user_id" | "created_at" | "updated_at"> = {
  risk_tolerance:       "MODERATE",
  investment_horizon:   "MEDIUM",
  strategies:           [],
  preferred_exchanges:  ["US"],
  preferred_sectors:    [],
  excluded_sectors:     [],
  portfolio_size:       "RETAIL",
  portfolio_tickers:    [],
  analysis_preference:  "MIX",
  preferred_lang:       "en",
  response_style:       "BALANCED",
  show_risk_warnings:   true,
  esg_only:             false,
  tax_context:          "AU",
  screener_defaults:    {},
  onboarding_completed: false,
  onboarding_step:      0,
};

// ─── DB helpers ────────────────────────────────────────────────────────────

/**
 * Get profile for a user. Returns null if no row exists (not auto-created —
 * the API layer handles the "create on first save" flow to avoid ghost rows).
 */
export async function getInvestorProfile(userId: string): Promise<InvestorProfile | null> {
  const { rows } = await getPool().query<InvestorProfile>(
    `SELECT * FROM datapai.investor_profile WHERE user_id = $1`,
    [userId]
  );
  if (!rows[0]) return null;
  // Parse JSONB field safely
  const row = rows[0];
  if (typeof row.screener_defaults === "string") {
    try { row.screener_defaults = JSON.parse(row.screener_defaults); } catch { row.screener_defaults = {}; }
  }
  return row;
}

/**
 * Get profile or return the default shape (without writing to DB).
 * Use this for read-only operations like building system prompt context.
 */
export async function getInvestorProfileOrDefault(userId: string): Promise<InvestorProfile> {
  const profile = await getInvestorProfile(userId);
  if (profile) return profile;
  return {
    user_id:    userId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...DEFAULT_PROFILE,
  };
}

/**
 * Upsert profile — creates if not exists, partial-updates if exists.
 * Only supplied fields are changed; everything else keeps its current value.
 */
export async function upsertInvestorProfile(
  userId:  string,
  updates: ProfileUpdate
): Promise<InvestorProfile> {
  // Merge with existing (or defaults) so we always write a complete row
  const existing = await getInvestorProfileOrDefault(userId);
  const merged: InvestorProfile = { ...existing, ...updates, user_id: userId };

  await getPool().query(
    `INSERT INTO datapai.investor_profile (
        user_id, risk_tolerance, investment_horizon, strategies,
        preferred_exchanges, preferred_sectors, excluded_sectors,
        portfolio_size, portfolio_tickers,
        analysis_preference, preferred_lang,
        response_style, show_risk_warnings, esg_only, tax_context,
        screener_defaults, onboarding_completed, onboarding_step
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
      ON CONFLICT (user_id) DO UPDATE SET
        risk_tolerance       = EXCLUDED.risk_tolerance,
        investment_horizon   = EXCLUDED.investment_horizon,
        strategies           = EXCLUDED.strategies,
        preferred_exchanges  = EXCLUDED.preferred_exchanges,
        preferred_sectors    = EXCLUDED.preferred_sectors,
        excluded_sectors     = EXCLUDED.excluded_sectors,
        portfolio_size       = EXCLUDED.portfolio_size,
        portfolio_tickers    = EXCLUDED.portfolio_tickers,
        analysis_preference  = EXCLUDED.analysis_preference,
        preferred_lang       = EXCLUDED.preferred_lang,
        response_style       = EXCLUDED.response_style,
        show_risk_warnings   = EXCLUDED.show_risk_warnings,
        esg_only             = EXCLUDED.esg_only,
        tax_context          = EXCLUDED.tax_context,
        screener_defaults    = EXCLUDED.screener_defaults,
        onboarding_completed = EXCLUDED.onboarding_completed,
        onboarding_step      = EXCLUDED.onboarding_step,
        updated_at           = now()`,
    [
      userId,
      merged.risk_tolerance,
      merged.investment_horizon,
      merged.strategies,
      merged.preferred_exchanges,
      merged.preferred_sectors,
      merged.excluded_sectors,
      merged.portfolio_size,
      merged.portfolio_tickers,
      merged.analysis_preference,
      merged.preferred_lang,
      merged.response_style,
      merged.show_risk_warnings,
      merged.esg_only,
      merged.tax_context,
      JSON.stringify(merged.screener_defaults),
      merged.onboarding_completed,
      merged.onboarding_step,
    ]
  );

  return getInvestorProfileOrDefault(userId);
}

// ─── LLM Context Builder ───────────────────────────────────────────────────

const RISK_LABEL: Record<string, string> = {
  CONSERVATIVE: "Conservative (capital preservation, low volatility, dividends)",
  MODERATE:     "Moderate (balanced growth/income, medium-term horizon)",
  AGGRESSIVE:   "Aggressive (growth-focused, high-risk tolerance, can stomach -30%+ drawdowns)",
  SPECULATIVE:  "Speculative (high-conviction bets, momentum, leveraged plays acceptable)",
};

const HORIZON_LABEL: Record<string, string> = {
  SHORT:  "Short-term (weeks to 3 months — swing/momentum trader)",
  MEDIUM: "Medium-term (3–12 months — trend follower)",
  LONG:   "Long-term (1+ years — buy-and-hold, fundamental focus)",
};

const SIZE_LABEL: Record<string, string> = {
  STARTER:       "Starter portfolio (<$50k AUD)",
  RETAIL:        "Retail investor ($50k–$500k AUD)",
  HNW:           "High-net-worth ($500k–$2M AUD)",
  INSTITUTIONAL: "Institutional / fund desk ($2M+ AUD)",
};

/**
 * Convert a profile into a system-prompt block.
 * Injected at the start of EVERY AI call so the LLM knows who it is
 * talking to without ever asking repeated questions.
 */
export function buildProfileContext(profile: InvestorProfile): string {
  const lines: string[] = [
    "━━━ USER INVESTMENT PROFILE (known — do NOT ask about these again) ━━━",
  ];

  lines.push(`Risk tolerance:       ${RISK_LABEL[profile.risk_tolerance] ?? profile.risk_tolerance}`);
  // horizon may be a single value ("MEDIUM") or multi-select joined by "+" ("SHORT+LONG")
  const horizonParts = (profile.investment_horizon ?? "MEDIUM")
    .split("+")
    .map(h => HORIZON_LABEL[h.trim()] ?? h)
    .join(" + ");
  lines.push(`Investment horizon:   ${horizonParts}`);

  if (profile.strategies?.length) {
    lines.push(`Strategy focus:       ${profile.strategies.join(" + ")}`);
  }

  lines.push(`Markets:              ${profile.preferred_exchanges?.join(", ") || "US"}`);

  if (profile.preferred_sectors?.length) {
    lines.push(`Preferred sectors:    ${profile.preferred_sectors.join(", ")}`);
  }
  if (profile.excluded_sectors?.length) {
    lines.push(`Excluded sectors:     ${profile.excluded_sectors.join(", ")} — do not recommend these`);
  }

  lines.push(`Portfolio size:       ${SIZE_LABEL[profile.portfolio_size] ?? profile.portfolio_size}`);

  if (profile.portfolio_tickers?.length) {
    lines.push(`Current holdings:     ${profile.portfolio_tickers.join(", ")}`);
  }

  lines.push(`Response style:       ${profile.response_style === "BRIEF" ? "Brief bullets only — no preamble" :
    profile.response_style === "DETAILED" ? "Full detailed analysis with reasoning" :
    "Balanced — key points + brief reasoning"}`);

  if (profile.esg_only) {
    lines.push(`ESG filter:           ESG/ethical investments only — flag any ESG concerns`);
  }
  if (!profile.show_risk_warnings) {
    lines.push(`Risk warnings:        User has disabled repeated risk disclaimers`);
  }
  const analysisLabel: Record<string, string> = {
    TA:    "Technical Analysis (price action, indicators, chart patterns)",
    FA:    "Fundamental Analysis (valuation, earnings, margins, balance sheet)",
    MIX:   "Mixed TA + FA",
    OTHER: "Macro / Thematic",
  };
  // analysis_preference may be multi-select joined by "+" e.g. "TA+FA"
  const analysisParts = (profile.analysis_preference ?? "MIX")
    .split("+")
    .map(a => analysisLabel[a.trim()] ?? a)
    .join(" + ");
  lines.push(`Analysis preference:  ${analysisParts}`);

  if (profile.preferred_lang === "zh") {
    lines.push(`Language:             Respond in Simplified Chinese (简体中文) for all analysis`);
  }

  lines.push(`Tax jurisdiction:     ${profile.tax_context}`);

  lines.push("━━━ CRITICAL: Tailor every response to this profile. Never ask what risk tolerance, strategy, or horizon the user has. ━━━");

  return lines.join("\n");
}

/**
 * Quick one-liner for nav badge / display purposes.
 * e.g. "Aggressive · Growth + Momentum · US+ASX"
 */
export function profileSummaryLine(profile: InvestorProfile): string {
  const parts: string[] = [profile.risk_tolerance];
  if (profile.strategies?.length) parts.push(profile.strategies.slice(0, 2).join("+"));
  if (profile.preferred_exchanges?.length) parts.push(profile.preferred_exchanges.join("+"));
  return parts.join(" · ");
}

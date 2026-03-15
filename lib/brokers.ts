/**
 * lib/brokers.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Static broker comparison data — US and AU retail stock brokers.
 *
 * DATA POLICY
 * -----------
 * All information is sourced from publicly available broker websites and
 * regulatory disclosures.  This is NOT financial advice.  Fees and features
 * change frequently — always verify directly with the broker before opening
 * an account.
 *
 * Last reviewed: March 2026
 *
 * TO UPDATE: edit the arrays below and bump DATA_REVIEWED_DATE.
 */

export const DATA_REVIEWED_DATE = "March 2026";

// ── Types ─────────────────────────────────────────────────────────────────────

export type Market = "US" | "AU";

export interface Broker {
  id: string;
  name: string;
  /** Short tagline — used as subtitle in card view */
  tagline: string;
  market: Market;
  /** Regulator(s) e.g. "ASIC", "SEC / FINRA" */
  regulator: string;
  /** Homepage URL — used for "Visit broker" link only */
  url: string;
  /** Account opening / registration URL — direct link to sign-up or onboarding page */
  signupUrl: string;

  // ── Fees ────────────────────────────────────────────────────────────────────
  /** Human-readable commission string, e.g. "$0" or "$9.50 flat" */
  commissionStocks: string;
  /** Human-readable commission for ETFs */
  commissionETFs: string;
  /** Options commission — null if not offered */
  commissionOptions: string | null;
  /** Minimum account balance to open, e.g. "$0" or "$500" */
  accountMin: string;

  // ── Markets available ────────────────────────────────────────────────────────
  hasAUStocks: boolean;
  hasUSStocks: boolean;
  hasOptions: boolean;
  hasETFs: boolean;
  hasCrypto: boolean;
  /**
   * International stocks beyond home market.
   * e.g. AU broker offering US stocks, or US broker offering global markets.
   * Provide a short description, e.g. "US, UK, HK" or "150+ markets"
   */
  internationalMarkets: string | null;

  // ── Account types ────────────────────────────────────────────────────────────
  /** AU: CHESS-sponsored (true = you legally own shares, not the broker) */
  chessSponsored: boolean | null;   // null = not applicable (US broker)
  /** AU: SMSF account available */
  hasSMSF: boolean | null;
  /** US: IRA / retirement account available */
  hasIRA: boolean | null;
  /** US: Solo 401(k) for self-employed / small business — the US equivalent of AU SMSF */
  hasSolo401k: boolean | null;
  /** Joint account available */
  hasJointAccount: boolean;

  // ── Features ─────────────────────────────────────────────────────────────────
  hasFractionalShares: boolean;
  hasMobileApp: boolean;
  hasDesktopPlatform: boolean;

  /** Brief note on any important caveat or distinguishing feature */
  note?: string;
}

// ── US Brokers ────────────────────────────────────────────────────────────────
// Sources: broker.com public fee schedules, SEC/FINRA registration, press releases
// Ranked by approximate retail market share / AUM (not a recommendation ranking)

export const US_BROKERS: Broker[] = [
  {
    id: "fidelity",
    name: "Fidelity",
    tagline: "Zero-commission stocks & ETFs, strong research",
    market: "US",
    regulator: "SEC / FINRA",
    url: "https://www.fidelity.com",
    signupUrl: "https://www.fidelity.com/open-account/overview",
    commissionStocks: "$0",
    commissionETFs: "$0",
    commissionOptions: "$0.65/contract",
    accountMin: "$0",
    hasAUStocks: false, hasUSStocks: true, hasOptions: true, hasETFs: true, hasCrypto: false,
    internationalMarkets: "Select international via Fidelity Global Trading",
    chessSponsored: null, hasSMSF: null, hasIRA: true, hasSolo401k: true, hasJointAccount: true,
    hasFractionalShares: true, hasMobileApp: true, hasDesktopPlatform: true,
    note: "Fractional shares available for S&P 500 stocks",
  },
  {
    id: "schwab",
    name: "Charles Schwab",
    tagline: "Full-service zero-commission broker, acquired TD Ameritrade",
    market: "US",
    regulator: "SEC / FINRA",
    url: "https://www.schwab.com",
    signupUrl: "https://www.schwab.com/open-an-account",
    commissionStocks: "$0",
    commissionETFs: "$0",
    commissionOptions: "$0.65/contract",
    accountMin: "$0",
    hasAUStocks: false, hasUSStocks: true, hasOptions: true, hasETFs: true, hasCrypto: false,
    internationalMarkets: "Select markets via Schwab Global Account",
    chessSponsored: null, hasSMSF: null, hasIRA: true, hasSolo401k: true, hasJointAccount: true,
    hasFractionalShares: true, hasMobileApp: true, hasDesktopPlatform: true,
    note: "TD Ameritrade fully merged into Schwab (2023); thinkorswim platform retained",
  },
  {
    id: "interactive-brokers-us",
    name: "Interactive Brokers",
    tagline: "Low-cost global access, professional-grade tools",
    market: "US",
    regulator: "SEC / FINRA",
    url: "https://www.interactivebrokers.com",
    signupUrl: "https://www.interactivebrokers.com/en/trading/open-account.php",
    commissionStocks: "$0 (IBKR Lite) / $0.005/share (Pro, $1 min)",
    commissionETFs: "$0 (IBKR Lite)",
    commissionOptions: "$0.65/contract (Lite) / $0.15–$0.65 (Pro)",
    accountMin: "$0",
    hasAUStocks: true, hasUSStocks: true, hasOptions: true, hasETFs: true, hasCrypto: false,
    internationalMarkets: "150+ markets — AU, UK, EU, HK, JP, CA, SG and more",
    chessSponsored: null, hasSMSF: null, hasIRA: true, hasSolo401k: true, hasJointAccount: true,
    hasFractionalShares: true, hasMobileApp: true, hasDesktopPlatform: true,
    note: "Access to 150+ global markets; available to AU residents via IBKR Australia",
  },
  {
    id: "etrade",
    name: "E*TRADE (Morgan Stanley)",
    tagline: "Established broker with strong options tools",
    market: "US",
    regulator: "SEC / FINRA",
    url: "https://www.etrade.com",
    signupUrl: "https://us.etrade.com/open-account",
    commissionStocks: "$0",
    commissionETFs: "$0",
    commissionOptions: "$0.65/contract ($0.50 for 30+ trades/quarter)",
    accountMin: "$0",
    hasAUStocks: false, hasUSStocks: true, hasOptions: true, hasETFs: true, hasCrypto: false,
    internationalMarkets: null,
    chessSponsored: null, hasSMSF: null, hasIRA: true, hasSolo401k: true, hasJointAccount: true,
    hasFractionalShares: false, hasMobileApp: true, hasDesktopPlatform: true,
    note: "Owned by Morgan Stanley since 2020",
  },
  {
    id: "robinhood",
    name: "Robinhood",
    tagline: "Mobile-first zero-commission, includes crypto",
    market: "US",
    regulator: "SEC / FINRA",
    url: "https://robinhood.com",
    signupUrl: "https://robinhood.com/us/en/open-account",
    commissionStocks: "$0",
    commissionETFs: "$0",
    commissionOptions: "$0",
    accountMin: "$0",
    hasAUStocks: false, hasUSStocks: true, hasOptions: true, hasETFs: true, hasCrypto: true,
    internationalMarkets: null,
    chessSponsored: null, hasSMSF: null, hasIRA: true, hasSolo401k: false, hasJointAccount: false,
    hasFractionalShares: true, hasMobileApp: true, hasDesktopPlatform: true,
    note: "IRA with 1–3% match available (Robinhood Gold required for 3%)",
  },
  {
    id: "webull",
    name: "Webull",
    tagline: "Zero-commission with advanced charting tools",
    market: "US",
    regulator: "SEC / FINRA",
    url: "https://www.webull.com",
    signupUrl: "https://www.webull.com/activity",
    commissionStocks: "$0",
    commissionETFs: "$0",
    commissionOptions: "$0",
    accountMin: "$0",
    hasAUStocks: false, hasUSStocks: true, hasOptions: true, hasETFs: true, hasCrypto: true,
    internationalMarkets: null,
    chessSponsored: null, hasSMSF: null, hasIRA: true, hasSolo401k: false, hasJointAccount: false,
    hasFractionalShares: true, hasMobileApp: true, hasDesktopPlatform: true,
    note: "Extended hours trading (4am–8pm ET)",
  },
  {
    id: "merrill-edge",
    name: "Merrill Edge",
    tagline: "Integrated with Bank of America banking",
    market: "US",
    regulator: "SEC / FINRA",
    url: "https://www.merrilledge.com",
    signupUrl: "https://www.merrilledge.com/open-account",
    commissionStocks: "$0",
    commissionETFs: "$0",
    commissionOptions: "$0.65/contract",
    accountMin: "$0",
    hasAUStocks: false, hasUSStocks: true, hasOptions: true, hasETFs: true, hasCrypto: false,
    internationalMarkets: null,
    chessSponsored: null, hasSMSF: null, hasIRA: true, hasSolo401k: false, hasJointAccount: true,
    hasFractionalShares: false, hasMobileApp: true, hasDesktopPlatform: false,
    note: "Preferred Rewards members may earn commission credits",
  },
  {
    id: "vanguard",
    name: "Vanguard",
    tagline: "Low-cost ETF & mutual fund specialist",
    market: "US",
    regulator: "SEC / FINRA",
    url: "https://investor.vanguard.com",
    signupUrl: "https://investor.vanguard.com/investor-resources-education/open-account",
    commissionStocks: "$0",
    commissionETFs: "$0",
    commissionOptions: "$1/contract",
    accountMin: "$0 (brokerage) / $1,000 (some funds)",
    hasAUStocks: false, hasUSStocks: true, hasOptions: true, hasETFs: true, hasCrypto: false,
    internationalMarkets: null,
    chessSponsored: null, hasSMSF: null, hasIRA: true, hasSolo401k: true, hasJointAccount: true,
    hasFractionalShares: false, hasMobileApp: true, hasDesktopPlatform: false,
    note: "Owned by fund investors; best suited for long-term passive investors",
  },
  {
    id: "tradestation",
    name: "TradeStation",
    tagline: "Active trader platform with algorithmic tools",
    market: "US",
    regulator: "SEC / FINRA",
    url: "https://www.tradestation.com",
    signupUrl: "https://www.tradestation.com/open-account",
    commissionStocks: "$0 (TS Select / TS GO)",
    commissionETFs: "$0",
    commissionOptions: "$0.60/contract",
    accountMin: "$0 (TS GO) / $2,000 (TS Select)",
    hasAUStocks: false, hasUSStocks: true, hasOptions: true, hasETFs: true, hasCrypto: true,
    internationalMarkets: null,
    chessSponsored: null, hasSMSF: null, hasIRA: true, hasSolo401k: false, hasJointAccount: true,
    hasFractionalShares: false, hasMobileApp: true, hasDesktopPlatform: true,
    note: "EasyLanguage scripting for automated strategies",
  },
  {
    id: "tastytrade",
    name: "tastytrade",
    tagline: "Options-focused, $0 stock commissions",
    market: "US",
    regulator: "SEC / FINRA",
    url: "https://tastytrade.com",
    signupUrl: "https://tastytrade.com/open-account",
    commissionStocks: "$0",
    commissionETFs: "$0",
    commissionOptions: "$1/contract (open), $0 (close), max $10/leg",
    accountMin: "$0",
    hasAUStocks: false, hasUSStocks: true, hasOptions: true, hasETFs: true, hasCrypto: true,
    internationalMarkets: null,
    chessSponsored: null, hasSMSF: null, hasIRA: true, hasSolo401k: false, hasJointAccount: false,
    hasFractionalShares: false, hasMobileApp: true, hasDesktopPlatform: true,
    note: "Options capped at $10/leg makes it cost-effective for large trades",
  },
];

// ── AU Brokers ────────────────────────────────────────────────────────────────
// Sources: broker ASX fee schedules, ASIC registration, PDS documents
// Ranked by approximate retail market share (not a recommendation ranking)

export const AU_BROKERS: Broker[] = [
  {
    id: "commsec",
    name: "CommSec",
    tagline: "Australia's largest retail broker (CBA)",
    market: "AU",
    regulator: "ASIC",
    url: "https://www.commsec.com.au",
    signupUrl: "https://www2.commsec.com.au/public/cmc/commsec/static/apply-for-trading-account.html",
    commissionStocks: "$5 (≤$1k) / $10 (≤$3k) / $19.95 (≤$10k) / 0.12% over",
    commissionETFs: "Same as stocks",
    commissionOptions: null,
    accountMin: "$0",
    hasAUStocks: true, hasUSStocks: true, hasOptions: false, hasETFs: true, hasCrypto: false,
    internationalMarkets: "US stocks via CommSec International",
    chessSponsored: true, hasSMSF: true, hasIRA: null, hasSolo401k: null, hasJointAccount: true,
    hasFractionalShares: false, hasMobileApp: true, hasDesktopPlatform: true,
    note: "CHESS sponsored. Integrated with Commonwealth Bank accounts",
  },
  {
    id: "selfwealth",
    name: "SelfWealth",
    tagline: "Flat-fee ASX & US trading, CHESS sponsored",
    market: "AU",
    regulator: "ASIC",
    url: "https://www.selfwealth.com.au",
    signupUrl: "https://app.selfwealth.com.au/register",
    commissionStocks: "$9.50 flat (ASX) / USD $9.50 (US)",
    commissionETFs: "$9.50 flat",
    commissionOptions: null,
    accountMin: "$0",
    hasAUStocks: true, hasUSStocks: true, hasOptions: false, hasETFs: true, hasCrypto: false,
    internationalMarkets: "US stocks (NYSE / NASDAQ)",
    chessSponsored: true, hasSMSF: true, hasIRA: null, hasSolo401k: null, hasJointAccount: true,
    hasFractionalShares: false, hasMobileApp: true, hasDesktopPlatform: true,
    note: "CHESS sponsored. Flat fee regardless of trade size",
  },
  {
    id: "stake",
    name: "Stake",
    tagline: "Low-cost ASX & US stocks, app-first",
    market: "AU",
    regulator: "ASIC",
    url: "https://www.stake.com.au",
    signupUrl: "https://app.stake.com.au/signup",
    commissionStocks: "AUD $3 (ASX) / USD $0 (US on Stake Black)",
    commissionETFs: "Same as stocks",
    commissionOptions: null,
    accountMin: "$0",
    hasAUStocks: true, hasUSStocks: true, hasOptions: false, hasETFs: true, hasCrypto: false,
    internationalMarkets: "US stocks (NYSE / NASDAQ) with fractional shares",
    chessSponsored: true, hasSMSF: false, hasIRA: null, hasSolo401k: null, hasJointAccount: false,
    hasFractionalShares: true, hasMobileApp: true, hasDesktopPlatform: true,
    note: "CHESS sponsored for ASX. Fractional US shares available",
  },
  {
    id: "interactive-brokers-au",
    name: "Interactive Brokers (AU)",
    tagline: "Global market access, professional tools",
    market: "AU",
    regulator: "ASIC",
    url: "https://www.interactivebrokers.com.au",
    signupUrl: "https://www.interactivebrokers.com.au/en/trading/open-account.php",
    commissionStocks: "AUD $1 min / 0.08% (ASX). USD $1 min (US)",
    commissionETFs: "Same as stocks",
    commissionOptions: "AUD $0.70/contract (ASX options)",
    accountMin: "$0",
    hasAUStocks: true, hasUSStocks: true, hasOptions: true, hasETFs: true, hasCrypto: false,
    internationalMarkets: "150+ markets — US, UK, EU, HK, JP, CA, SG and more",
    chessSponsored: false, hasSMSF: true, hasIRA: null, hasSolo401k: null, hasJointAccount: true,
    hasFractionalShares: true, hasMobileApp: true, hasDesktopPlatform: true,
    note: "Not CHESS sponsored (custodian model). Access to 150+ global markets",
  },
  {
    id: "nabtrade",
    name: "nabtrade",
    tagline: "NAB's online broker, strong research",
    market: "AU",
    regulator: "ASIC",
    url: "https://www.nabtrade.com.au",
    signupUrl: "https://www.nabtrade.com.au/investor/open-account",
    commissionStocks: "$14.95 (≤$5k) / $19.95 (≤$20k) / 0.11% over",
    commissionETFs: "Same as stocks",
    commissionOptions: null,
    accountMin: "$0",
    hasAUStocks: true, hasUSStocks: true, hasOptions: false, hasETFs: true, hasCrypto: false,
    internationalMarkets: "US stocks via nabtrade International",
    chessSponsored: true, hasSMSF: true, hasIRA: null, hasSolo401k: null, hasJointAccount: true,
    hasFractionalShares: false, hasMobileApp: true, hasDesktopPlatform: true,
    note: "CHESS sponsored. Integrated with NAB Internet Banking",
  },
  {
    id: "superhero",
    name: "Superhero",
    tagline: "Low flat-fee with $0 ETF trades",
    market: "AU",
    regulator: "ASIC",
    url: "https://www.superhero.com.au",
    signupUrl: "https://www.superhero.com.au/signup",
    commissionStocks: "AUD $2 flat (ASX)",
    commissionETFs: "$0 (ASX ETFs)",
    commissionOptions: null,
    accountMin: "$0 (min $100 first trade)",
    hasAUStocks: true, hasUSStocks: true, hasOptions: false, hasETFs: true, hasCrypto: false,
    internationalMarkets: "US stocks (NYSE / NASDAQ)",
    chessSponsored: false, hasSMSF: true, hasIRA: null, hasSolo401k: null, hasJointAccount: false,
    hasFractionalShares: false, hasMobileApp: true, hasDesktopPlatform: false,
    note: "Custodian model (not CHESS sponsored). $0 ETF brokerage is a standout",
  },
  {
    id: "cmc-markets",
    name: "CMC Markets Stockbroking",
    tagline: "First 10 trades/month at $0 via Frequent Trader",
    market: "AU",
    regulator: "ASIC",
    url: "https://www.cmcmarkets.com/en-au/stockbroking",
    signupUrl: "https://www.cmcmarkets.com/en-au/open-account",
    commissionStocks: "$11 or 0.10% (higher of) / $0 first 10 trades/month (Frequent Trader)",
    commissionETFs: "Same as stocks",
    commissionOptions: null,
    accountMin: "$0",
    hasAUStocks: true, hasUSStocks: true, hasOptions: false, hasETFs: true, hasCrypto: false,
    internationalMarkets: "US stocks (NYSE / NASDAQ)",
    chessSponsored: true, hasSMSF: true, hasIRA: null, hasSolo401k: null, hasJointAccount: true,
    hasFractionalShares: false, hasMobileApp: true, hasDesktopPlatform: true,
    note: "CHESS sponsored. Frequent traders get first 10 trades/month free",
  },
  {
    id: "bell-direct",
    name: "Bell Direct",
    tagline: "Full-featured ASX broker with live data",
    market: "AU",
    regulator: "ASIC",
    url: "https://www.belldirect.com.au",
    signupUrl: "https://www.belldirect.com.au/open-an-account",
    commissionStocks: "$15 or 0.10% (higher of)",
    commissionETFs: "Same as stocks",
    commissionOptions: null,
    accountMin: "$0",
    hasAUStocks: true, hasUSStocks: false, hasOptions: false, hasETFs: true, hasCrypto: false,
    internationalMarkets: null,
    chessSponsored: true, hasSMSF: true, hasIRA: null, hasSolo401k: null, hasJointAccount: true,
    hasFractionalShares: false, hasMobileApp: true, hasDesktopPlatform: true,
    note: "CHESS sponsored. ASX-focused; no direct US trading",
  },
  {
    id: "westpac-share-trading",
    name: "Westpac Share Trading",
    tagline: "Westpac bank-integrated trading",
    market: "AU",
    regulator: "ASIC",
    url: "https://www.westpac.com.au/personal-banking/investments/share-trading",
    signupUrl: "https://www.westpac.com.au/personal-banking/investments/share-trading/open-an-account",
    commissionStocks: "$19.95 (≤$10k) / 0.10% over",
    commissionETFs: "Same as stocks",
    commissionOptions: null,
    accountMin: "$0",
    hasAUStocks: true, hasUSStocks: false, hasOptions: false, hasETFs: true, hasCrypto: false,
    internationalMarkets: null,
    chessSponsored: true, hasSMSF: false, hasIRA: null, hasSolo401k: null, hasJointAccount: true,
    hasFractionalShares: false, hasMobileApp: true, hasDesktopPlatform: false,
    note: "CHESS sponsored. Best for existing Westpac customers",
  },
  {
    id: "anz-share-investing",
    name: "ANZ Share Investing",
    tagline: "ANZ bank-integrated share trading",
    market: "AU",
    regulator: "ASIC",
    url: "https://www.anz.com.au/personal/investing/share-trading",
    signupUrl: "https://www.anz.com.au/personal/investing/share-trading/open-account",
    commissionStocks: "$19.95 (≤$10k) / 0.10% over",
    commissionETFs: "Same as stocks",
    commissionOptions: null,
    accountMin: "$0",
    hasAUStocks: true, hasUSStocks: false, hasOptions: false, hasETFs: true, hasCrypto: false,
    internationalMarkets: null,
    chessSponsored: true, hasSMSF: false, hasIRA: null, hasSolo401k: null, hasJointAccount: true,
    hasFractionalShares: false, hasMobileApp: true, hasDesktopPlatform: false,
    note: "CHESS sponsored. Best for existing ANZ customers",
  },
];

export const ALL_BROKERS = [...US_BROKERS, ...AU_BROKERS];

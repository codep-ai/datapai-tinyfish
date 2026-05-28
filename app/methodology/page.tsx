/**
 * /methodology — Public-facing AI methodology page.
 *
 * Anchor for B2B sales conversations and curious end users. Documents every
 * agent in the DataPai stock intelligence stack so the system is not a
 * black box. Server component, static-render-friendly.
 *
 * Source-of-truth for the agent inventory below: see the codebase scan in
 * the 2026-05-28 session — input agents in agents/fundamental/*,
 * agents/news_agent/*, scripts/compute_ta_*; debate agents in
 * agents/stock_synthesis/synthesis_pipeline.py; gates in same file.
 *
 * Keep this in sync with what the engine actually does — when you add or
 * retire an agent, edit `AGENTS` below.
 */
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "AI Methodology — DataPai Stock Intelligence",
  description:
    "How DataPai's 17 specialised AI agents debate every stock. From RSI/MACD technicals through multi-agent debate to governance gates — explained agent by agent.",
};

type Agent = {
  slug: string;
  name: string;
  group: "Input" | "Debate" | "Gate" | "Learning";
  role: string;
  ingests: string;
  strategy: string;
  example?: string;
};

const AGENTS: Agent[] = [
  // ── Input agents ───────────────────────────────────────────────────────
  {
    slug: "technical",
    name: "Technical Analyst",
    group: "Input",
    role: "Reads price action — momentum, trend, support/resistance.",
    ingests: "Daily OHLCV (5 years), intraday ticks, exchange-specific volume.",
    strategy:
      "Computes RSI, MACD, 20/50/200-day moving averages, Bollinger bands. Emits BUY/SELL/HOLD with confidence based on signal alignment across timeframes.",
    example:
      "RSI 72 (overbought) + MACD bearish crossover + price below 50-day MA → SELL 0.78.",
  },
  {
    slug: "valuation",
    name: "Valuation Agent",
    group: "Input",
    role: "Sub-agent inside Fundamental Composite. Are we paying a fair price?",
    ingests: "PE, PB, EV/EBITDA, EV/Sales, sector medians.",
    strategy:
      "Scores valuation 0–1 vs. sector. <0.3 = cheap, >0.7 = expensive. Penalises high PE on slow-growth names.",
  },
  {
    slug: "quality",
    name: "Quality Agent",
    group: "Input",
    role: "Sub-agent inside Fundamental Composite. Is this a good business?",
    ingests: "ROE, net margin, operating margin, debt/equity, current ratio.",
    strategy:
      "Tiers stocks A / B / C / D. A = ROE > 20%, margins expanding, balance sheet clean. D = unprofitable + over-leveraged.",
    example:
      "BHP: ROE 24.7%, margin 19% → Quality tier A.",
  },
  {
    slug: "growth",
    name: "Growth Agent",
    group: "Input",
    role: "Sub-agent inside Fundamental Composite. Is the business getting bigger?",
    ingests: "Revenue YoY, EPS YoY, forward consensus revenue/EPS growth.",
    strategy:
      "Scores momentum. Penalises decelerating growth even if absolute level is high.",
  },
  {
    slug: "analyst",
    name: "Analyst Consensus",
    group: "Input",
    role: "Sub-agent inside Fundamental Composite. What does Wall Street think?",
    ingests: "Aggregated broker ratings, price targets, recent upgrades/downgrades.",
    strategy:
      "Translates BUY/HOLD/SELL consensus + upside % into a confidence-weighted signal. Flags fresh downgrades as new evidence.",
  },
  {
    slug: "macro",
    name: "Macro Agent",
    group: "Input",
    role: "Top-down overlay — when the market regime overrides bottom-up.",
    ingests: "Treasury yields, sector rotation, commodity cycle, FX.",
    strategy:
      "Boosts/dampens directional confidence based on regime fit. A BUY on cyclicals during a tightening cycle gets demoted.",
  },
  {
    slug: "market_activity",
    name: "Market Activity Agent",
    group: "Input",
    role: "Watches what the company itself says (and what changed).",
    ingests:
      "Investor-relations pages crawled daily via TinyFish. Diffs sentence-level changes — guidance withdrawals, risk-section expansions, tone shifts.",
    strategy:
      "Early-warning signal. A removed guidance line or new risk disclosure often precedes a public announcement by days.",
  },
  {
    slug: "news",
    name: "News Classifier",
    group: "Input",
    role: "Reads every news item about the stock and classifies it.",
    ingests:
      "Google News (12h window), Finnhub real-time wire, SEC EDGAR 8-K filings, regional sources.",
    strategy:
      "Each item passed through Gemini for event_type (FRAUD/LEGAL/EARNINGS_MISS/...), severity (CRITICAL/HIGH/MEDIUM/LOW), and sentiment. CRITICAL events trigger downstream overrides.",
    example:
      "8-K filed citing SEC investigation → event_type=LEGAL, severity=CRITICAL, sentiment=VERY_NEGATIVE.",
  },

  // ── Debate agents (AG2 GroupChat) ──────────────────────────────────────
  {
    slug: "bull",
    name: "Bull Analyst",
    group: "Debate",
    role: "Argues the bullish thesis to the strongest standard of evidence.",
    ingests: "All 8 input agents' outputs + past lessons from Reflector.",
    strategy:
      "Highlights catalysts, refutes the bear's points, identifies what the market is missing. Hard-capped at 200 tokens to force concision (no essays).",
  },
  {
    slug: "bear",
    name: "Bear Analyst",
    group: "Debate",
    role: "Argues the bearish thesis and surfaces unpriced risks.",
    ingests: "Same as Bull, including Bull's argument (refuting in real-time).",
    strategy:
      "Leads with the strongest material risk. Pays special attention to CRITICAL/HIGH severity news, 8-K filings, and IR-page risk-section expansions. Hard-capped at 200 tokens.",
  },
  {
    slug: "risk",
    name: "Risk Manager",
    group: "Debate",
    role: "Sizes the position. Capital preservation is the brief, not direction.",
    ingests: "Bull's case, Bear's case, signal alignment, severity of any event.",
    strategy:
      "Recommends FULL / HALF / QUARTER / NONE position size + stop-loss + take-profit levels. CRITICAL negative events → QUARTER or NONE automatically.",
  },
  {
    slug: "pm",
    name: "Portfolio Manager",
    group: "Debate",
    role: "Makes the final call. Emits the JSON the rest of the platform consumes.",
    ingests: "All three prior debate arguments + the original signal context.",
    strategy:
      "Synthesises into direction (STRONG_BUY .. STRONG_SELL) + confidence 0–1 + conviction (HIGH/MEDIUM/LOW) + thesis (≤2 sentences) + what-bulls-say + what-bears-say + key-risk. JSON-only output, no preamble.",
  },

  // ── Governance gates ───────────────────────────────────────────────────
  {
    slug: "quality_gate",
    name: "Quality Gate",
    group: "Gate",
    role: "Post-debate guardrail — refuse to BUY low-quality companies.",
    ingests: "Quality Agent tier + is_profitable / is_growing / is_healthy flags.",
    strategy:
      "If PM emitted BUY/STRONG_BUY but quality tier is C/D, demote to HOLD with reduced confidence. Backtest-proven +~8% win rate.",
  },
  {
    slug: "regime_gate",
    name: "Regime Gate",
    group: "Gate",
    role: "Post-debate guardrail — don't fight the regime.",
    ingests: "TA direction + FA direction.",
    strategy:
      "If both TA and FA are bearish but PM said BUY (e.g. overruled by news optimism), demote to HOLD. Reduces drawdowns in bear markets.",
  },
  {
    slug: "sanity_override",
    name: "Sanity Override",
    group: "Gate",
    role: "Post-debate guardrail — catch impossible direction flips.",
    ingests: "All input agent directions vs. PM output direction.",
    strategy:
      "If every single input signal is bearish but PM said BUY (or vice versa), flag as inconsistent and demote to HOLD. Catches both LLM hallucinations and JSON-parse artefacts.",
  },
  {
    slug: "critical_news",
    name: "Critical News Override",
    group: "Gate",
    role: "Force protective action on material adverse events.",
    ingests: "News Classifier highest-severity event + sentiment.",
    strategy:
      "CRITICAL + NEGATIVE → force SELL with 85%+ confidence regardless of fundamentals. Fraud / bankruptcy / sanctions / major lawsuits do not get overruled by a low PE.",
  },

  // ── Learning loop ──────────────────────────────────────────────────────
  {
    slug: "reflector",
    name: "Reflector",
    group: "Learning",
    role: "Closes the loop — learns from realised outcomes.",
    ingests:
      "Every past debate + the realised 7/30/90-day stock return after the call was made.",
    strategy:
      "Extracts patterns like 'when FA=BUY and News=HOLD on commodity stocks, hit-rate over 30d is 58%'. Lessons get injected into the next debate's persona prompts. The system improves debate-by-debate.",
  },
];

const groupOrder: Agent["group"][] = ["Input", "Debate", "Gate", "Learning"];
const groupMeta: Record<Agent["group"], { title: string; tag: string; desc: string; color: string }> = {
  Input: {
    title: "Input Agents",
    tag: "Step 1 — Gather evidence",
    desc: "Eight specialised agents independently read the data. Each emits a direction, confidence, and 1-line summary. None of them talk to each other yet.",
    color: "#2e8b57",
  },
  Debate: {
    title: "Debate Agents",
    tag: "Step 2 — Argue it out",
    desc: "AG2 multi-agent group chat. Bull and Bear take opposing positions. Risk Manager sizes the trade. Portfolio Manager makes the final call.",
    color: "#1d4ed8",
  },
  Gate: {
    title: "Governance Gates",
    tag: "Step 3 — Guardrails",
    desc: "Post-debate sanity checks. If the call violates a hard rule (low-quality stock, bearish regime, impossible flip, critical news), it gets overridden — automatically, with reason logged.",
    color: "#a16207",
  },
  Learning: {
    title: "Learning Loop",
    tag: "Step 4 — Improve",
    desc: "The system measures every call against reality (7/30/90-day return), extracts patterns, and feeds them back into the next debate.",
    color: "#7c3aed",
  },
};

export default function MethodologyPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* Hero */}
      <header className="mb-8 border-b border-gray-200 pb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-[#2e8b57] mb-2">
          Methodology
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
          17 AI agents. One opinion. No black box.
        </h1>
        <p className="mt-3 text-gray-600 max-w-3xl">
          Every BUY/SELL/HOLD call on stock.datap.ai is the output of a structured pipeline: 8 input agents gather evidence, 4 debate agents argue it out, 4 governance gates apply guardrails, and a Reflector learns from realised returns. Here is exactly what each one does.
        </p>
        <div className="mt-4 flex gap-2 flex-wrap text-xs">
          <Link href="/performance" className="px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold">
            See the live track record →
          </Link>
          <Link href="/screener" className="px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold">
            Stock screener →
          </Link>
        </div>
      </header>

      {/* Pipeline overview */}
      <section className="mb-10 bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl p-5">
        <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
          The pipeline, end to end
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {groupOrder.map((g) => {
            const meta = groupMeta[g];
            const count = AGENTS.filter((a) => a.group === g).length;
            return (
              <div key={g} className="bg-white border border-gray-200 rounded-lg p-3">
                <div
                  className="text-[10px] font-bold uppercase tracking-wide mb-1"
                  style={{ color: meta.color }}
                >
                  {meta.tag}
                </div>
                <div className="text-sm font-bold text-gray-900">
                  {meta.title} <span className="text-gray-400 font-normal">· {count}</span>
                </div>
                <div className="text-xs text-gray-600 mt-1 leading-snug">{meta.desc}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Per-agent detail */}
      {groupOrder.map((group) => {
        const meta = groupMeta[group];
        const agentsInGroup = AGENTS.filter((a) => a.group === group);
        return (
          <section key={group} className="mb-10">
            <div className="mb-4 flex items-baseline gap-3 flex-wrap">
              <h2 className="text-xl font-bold text-gray-900">{meta.title}</h2>
              <span
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                style={{ background: `${meta.color}1a`, color: meta.color }}
              >
                {meta.tag}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {agentsInGroup.map((a) => (
                <article
                  key={a.slug}
                  className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-base font-bold text-gray-900">{a.name}</h3>
                  </div>
                  <p className="text-sm text-gray-700 mb-2.5 leading-snug">{a.role}</p>
                  <div className="space-y-1.5 text-xs">
                    <div>
                      <span className="font-semibold text-gray-500 uppercase tracking-wide text-[10px]">Ingests: </span>
                      <span className="text-gray-700">{a.ingests}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-500 uppercase tracking-wide text-[10px]">Strategy: </span>
                      <span className="text-gray-700">{a.strategy}</span>
                    </div>
                    {a.example && (
                      <div className="mt-2 bg-gray-50 border-l-2 border-gray-300 px-2.5 py-1.5 rounded-r">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Example: </span>
                        <span className="text-xs text-gray-700 italic">{a.example}</span>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}

      {/* Why this beats a single LLM */}
      <section className="mb-10 bg-[#2e8b57]/5 border border-[#2e8b57]/30 rounded-xl p-5">
        <h2 className="text-lg font-bold text-gray-900 mb-2">Why not just ask one LLM?</h2>
        <ul className="text-sm text-gray-700 space-y-2 leading-relaxed">
          <li>
            <strong>Specialisation.</strong> A single prompt has to do everything at once — read RSI, parse 10-K language, weigh BofA's downgrade, balance risk. Each of our agents is purpose-built for its narrow job, then their outputs get combined.
          </li>
          <li>
            <strong>Adversarial debate.</strong> Bull and Bear are deliberately biased against each other. The Portfolio Manager doesn't see a one-sided narrative — it sees both sides argued at their strongest. Hallucinations from one side get refuted by the other before they reach the final call.
          </li>
          <li>
            <strong>Governance gates.</strong> A 200B-parameter model can still emit "BUY 95%" on a stock that just filed for bankruptcy. Our gates catch that — they're rule-based, deterministic, and don't get talked out of their position.
          </li>
          <li>
            <strong>Reflector loop.</strong> The system measures itself. When a call goes wrong, the pattern gets extracted and injected into the next debate's prompts. Single-LLM systems have no memory of their failures.
          </li>
        </ul>
      </section>

      <footer className="text-xs text-gray-500 pt-4 border-t border-gray-200">
        Not financial advice. Decisions you make using DataPai are your own. Stocks can fall as well as rise.
        See <Link href="/performance" className="underline text-[#2e8b57]">/performance</Link> for the live track record updated nightly.
      </footer>
    </div>
  );
}

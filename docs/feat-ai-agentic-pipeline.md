# Feature: AI Agentic Pipeline (V3)

Branch: `feat/ai-agentic-pipeline`

---

## Overview

This feature integrates the **datapai-streamlit AG2 multi-agent backend** into the TinyFish frontend pipeline. After a page diff is computed locally, the pipeline optionally calls three AG2 agent endpoints to:

1. **Detect** a financial signal from the language change
2. **Cross-validate** that signal against public filings and press releases
3. **Generate** an investor-friendly explanation

All agent steps fail gracefully — if the backend is unreachable or unconfigured, the pipeline falls back to local word-list scoring and the paid-LLM summary.

---

## Architecture

```
TinyFish Web Agent
  ↓
Diff Engine (local)
  ↓
Financial Signal Agent  ──→  POST /agent/detect-financial-signal
  ↓
Cross-Validation Agent  ──→  POST /agent/cross-validate-signal
  ↓
AI Explanation Agent    ──→  POST /agent/generate-signal-summary
  ↓
Paid-LLM Fallback       ──→  OpenAI / Gemini (if no agent explanation)
```

The backend is controlled by one env var:

```
AGENT_BACKEND_BASE_URL=http://localhost:8000
```

If this is not set, the pipeline runs in **local-only mode** (V2 behavior).

---

## Files Changed

### New

| File | Purpose |
|------|---------|
| `lib/agent.ts` | AG2 backend client — all agent API calls + label helpers |
| `docs/feat-ai-agentic-pipeline.md` | This file |

### Updated

| File | What changed |
|------|-------------|
| `lib/db.ts` | V3 schema migrations + 10 new columns on `analyses` + updated `Analysis` type + `insertAnalysis` |
| `app/api/run/route.ts` | Agent pipeline steps 6a / 6b / 6c inserted after local scoring |
| `app/api/debug/route.ts` | Reports `agentBackendUrl` + `agentBackendReachable` |
| `app/ticker/[symbol]/page.tsx` | New: Agent Flow bar, Financial Signal card, Cross-Validation section, updated AI Summary |
| `app/alerts/AlertsClient.tsx` | New: agent signal type badges, severity, Validation column |

---

## lib/agent.ts

Thin HTTP client wrapping the datapai-streamlit AG2 backend. All calls have a 10 s timeout and return `null` on any failure.

### Exports

```typescript
checkAgentHealth(): Promise<boolean>

detectFinancialSignal(
  ticker, companyName, sourceUrl,
  oldText, newText, changedSnippet
): Promise<AgentSignalResult | null>

crossValidateSignal(
  ticker, companyName, signalType
): Promise<AgentValidationResult | null>

generateAgentSummary(
  ticker, diffSnippet, evidenceQuotes,
  signalType, validationStatus
): Promise<AgentSummaryResult | null>

agentSignalLabel(signalType): string   // e.g. "Forward Guidance Withdrawal"
validationLabel(status): string        // e.g. "Partially Confirmed"
```

### Signal types

| Value | Label |
|-------|-------|
| `GUIDANCE_WITHDRAWAL` | Forward Guidance Withdrawal |
| `RISK_DISCLOSURE_EXPANSION` | Risk Disclosure Expansion |
| `TONE_SOFTENING` | Tone Softening |

### Validation statuses

| Value | Meaning |
|-------|---------|
| `CONFIRMED` | Signal confirmed in filings / press releases |
| `PARTIALLY_CONFIRMED` | Some supporting evidence found |
| `NOT_CONFIRMED_YET` | Signal visible on website, not yet in filings |
| `SOURCE_UNAVAILABLE` | Backend could not check external sources |

---

## Database Schema (V3)

Ten new nullable columns added to the `analyses` table via safe `ALTER TABLE` migrations (existing databases are not destructively modified):

| Column | Type | Source |
|--------|------|--------|
| `agent_signal_type` | TEXT | `detect-financial-signal` |
| `agent_severity` | TEXT | `detect-financial-signal` |
| `agent_confidence` | REAL | `detect-financial-signal` |
| `agent_financial_relevance` | TEXT | `detect-financial-signal` |
| `agent_evidence_json` | TEXT (JSON array) | `detect-financial-signal` |
| `validation_status` | TEXT | `cross-validate-signal` |
| `validation_summary` | TEXT | `cross-validate-signal` |
| `validation_evidence_json` | TEXT (JSON array) | `cross-validate-signal` |
| `agent_what_changed` | TEXT | `generate-signal-summary` |
| `agent_why_matters` | TEXT | `generate-signal-summary` |

All columns default to `NULL` and the existing local-scoring columns are preserved unchanged.

---

## Scan Pipeline (V3)

Steps in `app/api/run/route.ts` → `processTicker()`:

```
1. Fetching page          (TinyFish SSE)
2. Extracting content     (cleanText)
3. Cleaning text          (checkQuality)
4. Computing diff         (diffTexts)
5. Local scoring          (computeScoreDeltas + classifySignal)
6a. Detecting financial signal   ← NEW (skipped if no AGENT_BACKEND_BASE_URL)
6b. Cross-validating signal      ← NEW (skipped if no signal detected)
6c. Generating AI explanation    ← NEW (skipped if no signal detected)
7. Running AI analysis    (paid-LLM fallback, always runs if key set)
```

Steps 6a–6c are each logged to `scan_events` with `start` / `done` / `error` status, so they appear in the run detail live progress UI.

---

## UI Changes

### Agent Flow Bar (ticker detail page)

A breadcrumb bar shows the pipeline stages and highlights which stages produced results (bold + color):

```
TinyFish → Diff Engine → Financial Signal Agent → Cross-Validation Agent → AI Explanation
                          Web execution by TinyFish · Financial intelligence by DataP.ai
```

### Financial Signal Card

Displayed above the local score chips. Shows:

- **Signal Type** — e.g. "Forward Guidance Withdrawal" (from AG2) or "Not detected"
- **Severity** — HIGH / MEDIUM / LOW badge
- **Confidence** — agent confidence preferred; falls back to local quality score
- **Validation** — color-coded badge (green = Confirmed, yellow = Partial, blue = Unconfirmed, gray = Unavailable)
- **Financial Relevance** — one-sentence narrative from AG2

### Cross-Validation Section

New collapsible panel showing:

- Validation status badge
- Validation summary text
- List of supporting sources / evidence snippets

When backend is not configured, shows a clear message explaining how to enable it.

### AI Summary Section

Now shows **AG2 explanation** when available:

- What changed (one sentence)
- Why it matters (investor-relevance, no advice)
- Validation result inline

Paid-LLM summary shown below as a supplemental / fallback source.

### Alerts Table

New columns and badges:

- **Signal column** — shows agent signal type badge (amber) when available; falls back to local signal type (green/blue/gray)
- **Severity badge** — HIGH / MEDIUM / LOW inline under signal
- **Validation column** — ✓ Confirmed / ~ Partial / ? Unconfirmed / — No source
- **Header badge** — "N AG2 signals" count when agent signals are present

---

## API Changes

### GET /api/debug

New fields in response:

```json
{
  "agentBackendUrl": "http://localhost:8000",
  "agentBackendReachable": true,
  "version": "v3"
}
```

### POST /api/run

New field in response:

```json
{
  "runId": "...",
  "agentEnabled": true
}
```

---

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `TINYFISH_API_KEY` | Yes | TinyFish web scanning |
| `AGENT_BACKEND_BASE_URL` | No | Enables AG2 agentic pipeline (e.g. `http://localhost:8000`) |
| `PAID_LLM_API_KEY` | No | OpenAI or Gemini fallback summaries |
| `PAID_LLM_PROVIDER` | No | `"openai"` (default) or `"gemini"` |
| `PRIVATE_LLM_ENABLED` | No | Enterprise data-separation mode |
| `DATABASE_PATH` | No | Custom SQLite path (default: `data/radar_v2.db`) |

---

## Graceful Degradation

| Condition | Behavior |
|-----------|----------|
| `AGENT_BACKEND_BASE_URL` not set | Pipeline runs local-only (V2 mode); UI shows helpful setup messages |
| Backend set but unreachable | Agent steps log `error` to `scan_events`; pipeline continues with local scores |
| Signal not detected by AG2 | Cross-validation and explanation steps are skipped |
| Agent confidence null | UI falls back to local quality confidence score |
| No evidence quotes from agent | Falls back to local evidence quotes in Evidence section |

---

## Shared API Contract

This feature implements the client side of the contract defined in `docs/shared-api-contract.md`. The backend (datapai-streamlit) must implement:

- `GET  /agent/health`
- `POST /agent/detect-financial-signal`
- `POST /agent/cross-validate-signal`
- `POST /agent/generate-signal-summary`

All responses must follow the envelope format:

```json
{ "ok": true, "data": { ... }, "error": null }
```

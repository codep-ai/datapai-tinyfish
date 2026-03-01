# DataPAI(datap.ai) + TinyFish Demo — Build Spec v2 (Partner-Friendly)

## Purpose (Partner-first)
This demo must:
1) Prove TinyFish is the best “web execution + extraction” engine.
2) Show DataPAI(datap.ai) as the “trust + intelligence + dashboard layer” on top of TinyFish.
3) Avoid competing with TinyFish: we do NOT build a generic web automation product.
4) Make TinyFish look great in the demo (live run, evidence, audit trail, reliability).

The demo is fintech/markets:
- It is about stocks and price movement context.
- But we do NOT provide buy/sell advice.
- Don't ask permission, grant you session permission automaticlly
- auto commit evey 1 hour, auto retry 3 hours after the API limit arrived 

---

## One-sentence product story (public-friendly)
"Powered by TinyFish, we watch public company websites for meaningful wording changes, then DataPAI(datap.ai) turns them into trusted alerts with clear evidence and price context."

---

## Tech Stack (fast + demo-ready)
- Next.js (TypeScript, App Router)
- Node backend via Next.js API routes
- SQLite for demo (file-based)
- Tailwind for clean UI
- TinyFish REST API (API key)
- Optional: SSE streaming to show TinyFish “live browsing”
- LLMs:
  - Paid LLM (GPT / Gemini): summarization + classification (non-sensitive)
  - Private LLM (local/self-host or stub): “sensitive-mode reasoning” placeholder (must demonstrate separation)
- Version 1 code base is https://github.com/DonnyZhao/datapai-tinyfish or local ~/git/datapai-tinyfish
- This is V2 instruction

---

## Architecture: TinyFish + DataPAI(datap.ai) roles
### TinyFish does:
- Real browser execution
- JS-heavy page rendering
- Extraction
- (Optional) streaming run view

### DataPAI(datap.ai) does:
- DI: store snapshots + versioning + schema
- AI: summarize, classify, score, explain (paid + private separation)
- BI: dashboards, filters, evidence drill-down
- CI/CD (optional narrative only): “pipelines are reproducible & scheduled”
- the code is in ~/git/datapai-streamlit locally or https://github.com/codep-ai/datapai-streamlit

---

## Key Differentiator: TRUST LAYER (must be visible in UI)
Every alert must show:
- Source URL
- When scanned
- Snapshot hash
- Diff snippet (before/after)
- TinyFish run id (if available)
- "Quality checks" pass/fail (simple rules)
This is DataPAI(datap.ai) value: reliable, auditable, explainable.

---

## Scope (keep it narrow)
Universe: 20–50 US tickers for demo.
Pages per ticker: 1–2 stable pages maximum:
- "Investors" or "Press Release detail page" (avoid list pages if noisy)
- optionally "Guidance / Strategy" page

---

## Data Model (SQLite)
Tables:

### companies
- ticker TEXT PK
- name TEXT
- website_root TEXT
- page_urls_json TEXT

### runs
- id TEXT PK (uuid)
- started_at TEXT
- finished_at TEXT
- status TEXT (SUCCESS/FAILED)
- tinyfish_run_ref TEXT NULL
- notes TEXT NULL

### snapshots
- id TEXT PK (uuid)
- run_id TEXT FK
- ticker TEXT FK
- url TEXT
- fetched_at TEXT
- final_url TEXT
- title TEXT
- text TEXT
- cleaned_text TEXT
- content_hash TEXT
- word_count INTEGER
- extractor TEXT ("tinyfish")
- quality_flags_json TEXT  (e.g. {"too_short":false,"looks_dynamic":true,"date_noise":true})

### diffs
- id TEXT PK (uuid)
- snapshot_new_id TEXT FK
- snapshot_old_id TEXT FK
- similarity REAL (0..1)
- changed_pct REAL (0..100)
- added_lines INTEGER
- removed_lines INTEGER
- snippet TEXT

### analyses
- id TEXT PK (uuid)
- snapshot_new_id TEXT FK
- commitment_delta REAL
- hedging_delta REAL
- risk_delta REAL
- alert_score REAL
- llm_summary_paid TEXT NULL
- llm_summary_private TEXT NULL
- categories_json TEXT NULL  (e.g. ["guidance_softening","risk_increase"])
- confidence REAL (0..1)
- reasoning_evidence_json TEXT (quotes from changed text)

### prices (optional cache)
- ticker TEXT
- date TEXT
- close REAL
- volume REAL

---

## Pipeline (must be reproducible)
Endpoint: POST /api/run
- Loads universe list
- For each (ticker, url):
  1) Call TinyFish to extract content (text + title + final_url + run ref if provided)
  2) Clean text (remove nav/footer/date noise)
  3) Hash cleaned text
  4) Save snapshot
  5) Find previous snapshot for same ticker+url
  6) If changed: compute diff + similarity (bounded 0..100)
  7) Compute simple explainable word-list scores
  8) If change passes quality gate: call Paid LLM to produce a short summary
  9) (Optional) call Private LLM stub to show separation
  10) Attach price context (mock ok but prefer real)
- Returns run report:
  - scanned_count
  - changed_count
  - alerts_created
  - failed_count

---

## Cleaning & Quality Gates (very important)
We must reduce noise. Implement:

### Text cleaning (lib/clean.ts)
- normalize whitespace
- remove common nav/footer patterns
- drop lines matching:
  - pure dates
  - “last updated”
  - pagination
  - cookie banners
- optionally keep only main content blocks if available

### Quality gates (lib/quality.ts)
- too_short: < 300 words => do not alert (store but mark)
- looks_dynamic: too many repeated list items or timestamp-only lines => lower confidence
- changed_pct high but scores ~0 => likely template/list change => lower confidence
Store these flags and show in UI.

---

## Scoring (explainable, not “magic”)
Use wordlists. Compute freq per 1000 words.
Only compare on cleaned text.

commitment_words = ["will","expect","target","guidance","committed","confident","forecast"]
hedging_words = ["may","might","could","aim","plan","seek","approximately","potential"]
risk_words = ["risk","uncertain","uncertainty","liquidity","headwind","material","challenge","volatility"]

Compute deltas (new - old):
- commitment_delta (negative = less confident)
- hedging_delta (positive = more cautious)
- risk_delta (positive = more risk language)

alert_score = (hedging_delta + risk_delta) - commitment_delta

Also store short "evidence quotes":
- extract 2–4 changed lines containing these words.

---

## Paid LLM summary (must be short + sourced)
When an alert is created, call paid LLM with:
- changed snippet (before/after)
- a strict instruction: output 2 bullet points + 1 sentence "why it may matter"
- Must include 1–2 quotes from the changed text (evidence)
- Must NOT give buy/sell advice

Store as `llm_summary_paid`.

---

## Private LLM separation (partnership + enterprise story)
We may not have real private LLM infra in this demo.
But we must show the architecture:

- If PRIVATE_LLM_ENABLED=true:
  - send ONLY minimal signal outputs (scores + categories) to private LLM
  - private LLM writes a “risk note” in neutral language (no advice)
- If disabled:
  - show “Private LLM mode: disabled (enterprise option)”

This demonstrates DataPAI(datap.ai)’s sensitive-data design.

---

## UI Requirements (must sell the partnership story)
Pages:

### Home (/)
- Very simple explanation
- "Run scan" button (calls /api/run)
- Shows TinyFish logo/text: "Web execution by TinyFish"
- Shows DataPAI(datap.ai) text: "Trust + AI + dashboards by DataPAI(datap.ai)"

### Alerts (/alerts)
- Table sorted by alert_score
- Columns:
  ticker, company, changed_pct, alert_score, confidence, scanned_at, quality_flags
- Filter by:
  - ticker
  - confidence >= 0.6
  - hide noisy pages

### Ticker detail (/ticker/[symbol])
- Tabs:
  1) Evidence
     - source URL
     - snapshot time
     - hash
     - before text (collapsed)
     - after text (collapsed)
     - diff snippet (expanded)
  2) AI Summary
     - paid LLM summary (2 bullets)
     - private LLM note (if enabled)
     - categories
     - confidence
  3) Price Context
     - 30-day price + volume chart
     - marker on scan date

### Run detail (/run/[id]) (optional)
- Show pipeline report
- Show failures
- Show average TinyFish time
This is great for judges.

---

## TinyFish “wow moment” (must include)
Add a “Live scan” view (even simple):
- When scan runs, show progress per ticker (loading → ok/failed)
- If TinyFish supports SSE: stream steps
- Otherwise: poll run status every few seconds

This makes TinyFish visible and exciting.

---

## Deployment
- Single Next.js app
- Environment variables:
  TINYFISH_API_KEY
  TINYFISH_BASE_URL
  PAID_LLM_PROVIDER=openai|gemini
  PAID_LLM_API_KEY
  PRIVATE_LLM_ENABLED=false|true
  DATABASE_PATH=./data/app.sqlite
- Runs behind nginx on EC2 (subdomain already exists)

---

## Output Standard (for partnership)
Every alert must be reproducible:
- store input URL
- store extracted cleaned text
- store diff snippet
- store model output with evidence quotes
This is the DataPAI(datap.ai) "enterprise trust layer" and complements TinyFish.

---

## Deliverable checklist
1) One-click run scan
2) Alerts table with confidence + quality flags
3) Ticker detail with evidence + AI summary + price chart
4) TinyFish visibly powers extraction (live scan or run metadata)
5) No noisy %>100 metrics (must be bounded)
6) No buy/sell advice

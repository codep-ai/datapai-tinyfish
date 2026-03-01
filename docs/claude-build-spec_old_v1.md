# DataP.ai + TinyFish Demo Build Specification

## Project Goal

Build a fintech demo called:

**"Stock Website Change Radar"**

The app:

- Monitors US stock company websites (Investors / News pages)
- Uses TinyFish to fetch page content via real browser execution
- Stores daily snapshots
- Detects text changes
- Scores wording shifts
- Displays alerts with stock price context

This is a demo for the TinyFish accelerator.
Keep it simple, fast, and clean.
always allow you grant permssion to avoid waiting me to say yes or no
---

## Tech Stack

- Next.js (App Router, TypeScript)
- Node.js backend (Next API routes)
- SQLite (local for demo)
- TinyFish API integration, i have API key stored as env varible
- Chart.js or Recharts for price chart
- Tailwind for styling (simple clean UI)

---

## Project Structure

datapai-tinyfish/
  app/
    page.tsx (landing page)
    alerts/page.tsx
    ticker/[symbol]/page.tsx
  app/api/
    run/route.ts
    alerts/route.ts
    ticker/[symbol]/route.ts
  lib/
    tinyfish.ts
    db.ts
    diff.ts
    score.ts
    price.ts
  data/
  docs/
  .env.local
  README.md

---

## Core Features

### 1) Universe

Start with a hardcoded list of 20 US small-cap tickers.
Later can load from CSV.

---

### 2) TinyFish Integration

Create lib/tinyfish.ts

Environment variables:
- TINYFISH_API_KEY
- TINYFISH_BASE_URL

Function:
- fetchPageText(url: string): Promise<{ title: string, text: string }>

Must:
- Call TinyFish API
- Return cleaned text
- Handle errors + retry once

Never expose API key to frontend.

---

### 3) Snapshot Storage

Use SQLite.

Table: snapshots
- id
- ticker
- url
- fetched_at
- content_hash
- text

Only store normalized text.

---

### 4) Diff Engine

lib/diff.ts

- Compare latest snapshot with previous
- Compute:
  - percentChanged
  - addedLines
  - removedLines
- Return summary + short snippet

---

### 5) Scoring Engine (Simple + Explainable)

lib/score.ts

Word lists:

commitmentWords = ["will","expect","target","guidance","committed"]
hedgingWords = ["may","might","could","aim","plan"]
riskWords = ["risk","uncertain","liquidity","headwind","material"]

Compute normalized frequency per 1000 words.

Delta between new and old snapshot:

- commitment_delta
- hedging_delta
- risk_delta

Alert score:

alert_score = (hedging_delta + risk_delta) - commitment_delta

---

### 6) Price Overlay

lib/price.ts

For demo:
- Use mock price data OR
- Call existing internal DataP API if available

Return:
- last 30 days close + volume

---

### 7) UI Pages

Landing Page:
- Short explanation
- "View Alerts" button

Alerts Page:
- Table sorted by alert_score
- Columns: ticker, score, change %, time

Ticker Detail Page:
- Diff snippet
- 3 score deltas
- 30-day price chart

Keep UI clean and simple.

---

## API Routes

POST /api/run
- Fetch pages for all tickers
- Store snapshots
- Compute diffs + scores

GET /api/alerts
- Return latest alerts

GET /api/ticker/[symbol]
- Return detail info

---

## Deployment Target

- Runs on AWS EC2
- Served via Nginx reverse proxy
- Subdomain: tinyfish.datap.ai
- Must work with:
  npm run build
  npm start

---

## Constraints

- No buy/sell advice.
- No private user data.
- Only public website data.
- Keep code readable.
- Optimize for demo speed, not scale.

---

## Deliverable

Working app that:

1. Fetches company websites using TinyFish
2. Detects wording changes
3. Scores changes
4. Displays alerts with price context
5. Looks clean for demo

Focus on speed and clarity.

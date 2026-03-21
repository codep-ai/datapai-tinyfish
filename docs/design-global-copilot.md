# DataP.ai Global AI Stock Copilot — Solution Design

**Date:** 2026-03-21
**Status:** DRAFT — Pending Review
**Branch:** `feat/global-copilot`

---

## 1. Vision

A **site-wide AI research co-pilot** that knows what the user is looking at, what they own, and what signals our agents have detected — available on every page, with streaming responses, inline citations, and proactive insights.

**Positioning:** Not just a chatbot — a **research partner** that combines:
- Bloomberg ASKB's multi-agent depth
- Robinhood Cortex's proactive, portfolio-aware digests
- Perplexity's citation-based trust
- Shopify Sidekick's always-present floating UI
- Cursor's context-gathering intelligence

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│  FRONTEND (Next.js)                                  │
│                                                      │
│  ┌──────────────┐  ┌────────────────────────────┐   │
│  │ GlobalCopilot │  │ Page Content               │   │
│  │ (floating     │  │ ┌─────────────────────┐    │   │
│  │  sidebar)     │  │ │ ProactiveInsight     │    │   │
│  │               │  │ │ (inline AI cards)    │    │   │
│  │ ┌───────────┐│  │ └─────────────────────┘    │   │
│  │ │ Chat      ││  │                             │   │
│  │ │ Messages  ││  │  Stock cards / Watchlist /   │   │
│  │ │ + Citations││  │  Ticker detail / Alerts     │   │
│  │ │ + Charts  ││  │                             │   │
│  │ │ + Actions ││  │                             │   │
│  │ └───────────┘│  └────────────────────────────┘   │
│  │ ┌───────────┐│                                    │
│  │ │ Suggestions││                                    │
│  │ │ + Input   ││                                    │
│  │ └───────────┘│                                    │
│  └──────────────┘                                    │
└──────────┬──────────────────────────────────────────┘
           │
           │ SSE streaming
           ▼
┌─────────────────────────────────────────────────────┐
│  NEXT.JS API LAYER                                   │
│                                                      │
│  /api/copilot/stream    → proxy to Python backend    │
│  /api/copilot/context   → page-aware context builder │
│  /api/copilot/actions   → execute actions (v2)       │
└──────────┬──────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────┐
│  PYTHON BACKEND (FastAPI, port 8000)                 │
│                                                      │
│  /agent/stock-chat/stream  ← existing endpoint       │
│                                                      │
│  Context Builder:                                    │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│  │TA Signal│ │FA Signal │ │News Agent│ │IR Scan  │ │
│  │(cached) │ │(cached)  │ │(live)    │ │(TinyFish│ │
│  └────┬────┘ └────┬─────┘ └────┬─────┘ └────┬────┘ │
│       └───────────┴────────────┴─────────────┘      │
│                    ▼                                  │
│  ┌──────────────────────────────────────────┐        │
│  │ LLM (Gemini streaming / GPT-5.1 / Claude)│        │
│  │ + Google Search grounding                 │        │
│  └──────────────────────────────────────────┘        │
│                                                      │
│  Existing agents (unchanged):                        │
│  - forward_guidance_agent                            │
│  - risk_disclosure_agent                             │
│  - tone_shift_agent                                  │
│  - investigation_agent                               │
│  - news_agent (Google News, Finnhub, SEC, ASX)       │
│  - stock_synthesis (AG2 multi-agent debate)           │
│  - fundamental pipeline                              │
│  - chart_analysis (Gemini Vision)                    │
└─────────────────────────────────────────────────────┘
```

---

## 3. What We Already Have (Backend)

| Capability | Status | Location |
|-----------|--------|----------|
| Stock chat streaming (SSE) | ✅ Working | `agents/stock_chat/endpoint.py` |
| Context builder (TA + FA + IR + Profile) | ✅ Working | `agents/stock_chat/context_builder.py` |
| Session persistence (Postgres) | ✅ Working | `agents/stock_chat/history.py` |
| User profile memory | ✅ Working | `datapai.user_profiles` + `investor_profile` |
| TA signal agent (RSI/MACD/BB/EMA) | ✅ Working | `agents/tinyfish_api.py` |
| FA signal agent (valuation/quality) | ✅ Working | `agents/fundamental/` |
| News agent (4 sources) | ✅ Working | `agents/news_agent/` |
| TinyFish signal pipeline v1.5 | ✅ Working | `agents/tinyfish_signals/` |
| AG2 stock synthesis (multi-agent debate) | ✅ Working | `agents/stock_synthesis/` |
| Chart vision (Gemini) | ✅ Working | Chart analysis API |
| LLM routing (Gemini/GPT/Claude/Ollama) | ✅ Working | `agents/llm_client.py` |

**Key insight:** The backend is already powerful. The gap is entirely in the **frontend UX**.

---

## 4. What We Need to Build (Frontend)

### Phase 1: Global Floating Copilot (This Sprint)

**Goal:** Chat on every page, context-aware, persistent across navigation.

#### 4.1 GlobalCopilot Component

| Feature | Description | Inspired By |
|---------|-------------|-------------|
| **Floating bubble** | Bottom-right, always visible, green gradient | Shopify Sidekick |
| **Expand to sidebar** | 420px wide panel, slides in from right | Cursor AI |
| **Minimise to pill** | Compact bar showing message count | Cursor |
| **Page context indicator** | Shows what page the AI knows about | — |
| **Streaming responses** | SSE with word-by-word rendering | Existing StockChatPanel |
| **Persist across pages** | React state survives navigation (client component in layout) | GitHub Copilot |
| **Page-specific suggestions** | Different suggested questions per page type | Perplexity |

#### 4.2 Context Strategy (How the AI Knows What You're Looking At)

| Page | Context Injected |
|------|-----------------|
| `/` (US homepage) | 20 US stocks, prices, alert summary, last scan info |
| `/asx` | 18 ASX stocks, prices, alert summary |
| `/watchlist` | User's watchlist stocks + prices + news + AI signals |
| `/alerts` | All active alerts with scores and confidence |
| `/ticker/SMCI` | Stock detail: price, TA signal, latest IR scan, news events |
| `/ticker/SMCI/intel` | Above + cached FA/MA/CA results, synthesis direction |
| `/screener` | Screener context, available filters |
| `/pricing` | Plan details (helpful for "what plan should I get?") |

#### 4.3 API Routes

```
GET  /api/copilot/context?page=/watchlist  → returns page context JSON
POST /api/copilot/stream                   → SSE proxy to Python backend
```

The `/stream` endpoint passes `page_context` as enriched `snapshot_text` to the existing Python backend — **no Python changes needed for Phase 1**.

#### 4.4 Suggested Questions (Page-Aware)

```
Watchlist page:
  "Summarise my watchlist — which stocks need attention?"
  "Any breaking news or critical alerts for my stocks?"
  "What's the overall risk profile of my portfolio?"
  "Which of my watchlist stocks has the strongest technical setup?"

US homepage:
  "Which US stocks have the most significant website changes?"
  "Give me a quick overview of the current market sentiment"

Ticker detail (/ticker/SMCI):
  "What are the key risks for this stock right now?"
  "Summarise the latest IR page changes detected"
  "Is this a good entry point based on current technicals?"

Alerts page:
  "Explain the top alerts — what changed and why?"
  "Which alert has the highest confidence score?"
```

### Phase 2: Proactive Insights + Citations (Next Sprint)

| Feature | Description | Inspired By |
|---------|-------------|-------------|
| **Inline citations [1][2]** | Every factual claim cites a source | Perplexity |
| **Follow-up suggestions** | AI suggests 2-3 next questions after each response | Perplexity |
| **Proactive digest cards** | AI-generated summary cards embedded on ticker/watchlist pages | Robinhood Cortex Digests |
| **"Deep Research" mode** | Multi-step analysis with visible research plan | Gemini Deep Research |
| **Charts in responses** | Render price charts / indicator charts inside chat | FinChat, Claude Artifacts |

### Phase 3: Agentic Workflows + Memory (Future)

| Feature | Description | Inspired By |
|---------|-------------|-------------|
| **Research projects** | Group tickers/themes with persistent context | ChatGPT Projects, Claude |
| **Workflow templates** | Save & re-run multi-step analyses | Bloomberg ASKB |
| **Scheduled briefings** | Daily portfolio digest pushed to user | Morgan Stanley |
| **MCP server** | Expose signals to external AI tools | Alpaca, Daloopa |
| **Natural language scanner** | "Find ASX stocks with RSI < 30 and positive news" | Robinhood Cortex Scanner |
| **Action execution** | Add to watchlist, trigger scan, set alert via chat | Shopify Sidekick |

---

## 5. LLM Stack Positioning

Based on the Q1 2026 LLM Search Stack you shared, here's where DataP.ai sits:

| Layer | Our Position | Partners/Tools |
|-------|-------------|----------------|
| **Live Web Access** | ✅ **TinyFish** (our core — real-browser IR page fetching) | We ARE in this layer |
| **LLM-Optimized Search** | ✅ Google Search grounding via Gemini | Could add Exa/Tavily for news |
| **Inference & GPU** | ✅ Google AI (Gemini), OpenAI, Bedrock | Could add Modal/Cerebras for speed |
| **LLM App Ops** | Partial — we have our own orchestration | Could add LangSmith for observability |
| **Evaluation** | ❌ Gap — no systematic eval | Should add for signal accuracy tracking |
| **GenAI Security** | ❌ Gap — basic guardrails only | Consider Lakera/Lasso for compliance |
| **Data Preparation** | ✅ Our ETL pipeline + TinyFish cleaning | — |

**Key differentiator vs competitors:**
- We have **proprietary signal detection** (forward guidance, risk disclosure, tone shift)
- We have **real-browser data** via TinyFish (not just API scraping)
- We have **multi-agent debate** (AG2 synthesis)
- We have **ASX depth** that global platforms lack

---

## 6. Technical Implementation (Phase 1)

### Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `app/components/GlobalCopilot.tsx` | CREATE | Floating chat widget (client component) |
| `app/api/copilot/context/route.ts` | CREATE | Page context API |
| `app/api/copilot/stream/route.ts` | CREATE | Chat streaming proxy |
| `app/layout.tsx` | MODIFY | Add GlobalCopilot to layout |

### No Backend Changes Required

The existing Python `/agent/stock-chat/stream` already accepts:
- `ticker` — we pass the current ticker or "COPILOT"
- `snapshot_text` — we pass page context here
- `session_id` — for conversation persistence
- `user_id` — for user profile injection
- `lang` — for bilingual support

The context builder in Python already handles:
- TA signal injection from cache
- FA signal injection from snapshot
- User profile (risk, style, portfolio)
- Language preference

---

## 7. UX Mockup (Text)

### Closed State (every page)
```
                                    ┌──────┐
                                    │  💬  │  ← Green floating bubble
                                    │      │     bottom-right corner
                                    └──────┘
```

### Open State (sidebar)
```
┌────── Main Page Content ──────┐ ┌─── AI Copilot ────────┐
│                                │ │ 🤖 AI Copilot         │
│  [Your stocks / watchlist /    │ │ ● viewing: watchlist   │
│   ticker detail / alerts]      │ │ ────────────────────── │
│                                │ │                        │
│                                │ │ Try asking:            │
│                                │ │ ┌──────────────────┐   │
│                                │ │ │ Summarise my      │   │
│                                │ │ │ watchlist — which  │   │
│                                │ │ │ stocks need        │   │
│                                │ │ │ attention?         │   │
│                                │ │ └──────────────────┘   │
│                                │ │ ┌──────────────────┐   │
│                                │ │ │ Any breaking news  │   │
│                                │ │ │ for my stocks?     │   │
│                                │ │ └──────────────────┘   │
│                                │ │                        │
│                                │ │ ────────────────────── │
│                                │ │ [Ask anything...    ↗] │
│                                │ │ ⚠️ Not financial advice│
│                                │ └────────────────────────┘
└────────────────────────────────┘
```

### After a Response (with follow-ups)
```
┌─── AI Copilot ─────────────────────┐
│ 🤖 AI Copilot  [New] [─] [×]      │
│ ● viewing: watchlist               │
│ ───────────────────────────────── │
│                                    │
│         Summarise my watchlist  ░  │
│                                    │
│ 🔵 Your watchlist has 8 stocks     │
│ across US and ASX markets.         │
│                                    │
│ ⚠️ **SMCI** needs attention —      │
│ 31 CRITICAL news events [1] with   │
│ price up +43% despite regulatory   │
│ concerns [2].                      │
│                                    │
│ 📈 **Top gainers:** SMCI (+43%),   │
│ MARA (+12%), HIMS (+8%)           │
│ 📉 **Drops:** BHP (-2.1%),        │
│ CBA (-1.5%)                        │
│                                    │
│ 🇦🇺 Your ASX holdings (BHP, CBA)   │
│ are down with broader market.      │
│ No IR page changes detected [3].   │
│                                    │
│ *Sources: [1] DataP.ai news agent  │
│ [2] Benzinga [3] TinyFish scan*    │
│                         — Gemini   │
│ ───────────────────────────────── │
│ 💡 Follow-up:                      │
│ ┌──────────────────────────────┐   │
│ │ Should I be worried about SMCI?│  │
│ └──────────────────────────────┘   │
│ ┌──────────────────────────────┐   │
│ │ Run a deep analysis on BHP    │  │
│ └──────────────────────────────┘   │
│ ───────────────────────────────── │
│ [Ask anything...              ↗]   │
└────────────────────────────────────┘
```

---

## 8. Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Adoption | 30%+ of active users try copilot | Track bubble clicks |
| Engagement | 3+ messages per session average | Session analytics |
| Retention | Users return to copilot next visit | Session continuity |
| Context accuracy | AI references correct page data | Manual QA + user feedback |
| Response time | First token < 2s | SSE timing |
| Page coverage | Copilot works well on all pages | Suggested question click rate |

---

## 9. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Context too large for LLM | Truncate to 4K tokens; summarize watchlists with >20 stocks |
| Copilot distracts from main content | Start collapsed; minimise option; remember preference |
| Python backend can't handle page-level context | Pass as `snapshot_text` — already supported |
| Latency on context fetch | Fetch context lazily on copilot open, cache per page |
| Mobile responsiveness | Full-screen overlay on mobile (< 768px) |
| Cost (LLM tokens per chat) | Use Gemini Flash Lite (cheapest); cache common queries |

---

## 10. Decision Points for Review

1. **Sidebar vs Floating Panel?** — Sidebar pushes content; floating panel overlays. Recommend **floating panel** (like Shopify Sidekick) for v1 — less disruptive.

2. **Keep existing StockChatPanel on /intel page?** — Recommend **yes, keep both**. The /intel page chat is deeply grounded in that specific stock. Global copilot is broader.

3. **Session sharing between ticker chat and global copilot?** — Recommend **separate sessions**. Different context = different conversations.

4. **Phase 1 scope — just the floating chat, or also proactive cards?** — Recommend **just floating chat** for Phase 1. Proactive cards need more design work.

5. **Backend changes needed?** — **None for Phase 1**. The existing Python backend already accepts everything we need.

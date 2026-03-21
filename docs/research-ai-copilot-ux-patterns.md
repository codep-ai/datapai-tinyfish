# AI Copilot / Chatbot UX Research Report

**Date:** 2026-03-21
**Purpose:** Comprehensive competitive analysis of the best AI copilot implementations across all industries to inform the design of a world-class AI stock copilot.

---

## EXECUTIVE SUMMARY

After researching 20 leading AI copilot implementations across finance, developer tools, productivity, and customer support, several dominant patterns emerge:

1. **Context is king** -- the best copilots deeply integrate with the user's current data (portfolio, codebase, workspace), not just general knowledge
2. **Sidebar + embedded is the winning layout** -- a persistent chat sidebar that also surfaces inline insights within the main content
3. **Citations and transparency build trust** -- especially critical in finance where accuracy is non-negotiable
4. **Agentic multi-step workflows are the frontier** -- moving from Q&A chatbots to autonomous agents that execute multi-step research and actions
5. **Personalization through persistent memory and project context** -- the best tools remember preferences and maintain context across sessions

---

## TIER 1: FINANCE / TRADING AI COPILOTS

---

### 1. Bloomberg ASKB

**UI Position:** Conversational AI interface embedded directly within the Bloomberg Terminal. Mobile access through Bloomberg Professional app.

**Context Strategy:** ASKB operates through a coordinated network of AI agents that work in parallel to analyze Bloomberg's entire data and content universe -- structured data, unstructured documents, news (~5,000 original stories + 1.1M curated daily), and sell-side research from 800+ providers. Users can also upload their own documents (PDF, Word) to be analyzed alongside Bloomberg data.

**Persistence:** Workflows can be saved as templates and re-run across companies or timeframes.

**Key UX Innovations:**
- **Workflows** -- users define multi-step research tasks (pre-earnings prep, post-results analysis, meeting briefings) that execute automatically
- **BQL Code Transparency** -- when data analysis is involved, ASKB shows the underlying Bloomberg Query Language code, letting users extend analysis into Excel or BQuant
- **Annotated Data Visualizations** -- generates charts with annotations inline
- **Transparent Attribution** -- every response grounded in Bloomberg data with links to original documents and research

**Architecture:** Multi-agent system with coordinated AI agents working in parallel. Uses a combination of commercial and open-weight LLMs. Bloomberg has been building AI/ML/NLP since 2009.

**What We Can Steal:**
- **Workflow templates** -- let users save and re-run multi-step research across different tickers
- **Show your work** -- expose underlying queries/logic (like BQL) so power users can extend the analysis
- **Document upload for cross-analysis** -- analyze user documents alongside market data
- **Multi-agent parallel analysis** -- multiple specialized agents working simultaneously

Sources: [Bloomberg ASKB Announcement](https://www.bloomberg.com/professional/insights/press-announcement/meet-askb-a-first-look-at-the-future-of-the-bloomberg-terminal-in-the-age-of-agentic-ai/), [Bloomberg LP Story](https://www.bloomberg.com/company/stories/meet-askb-bloomberg-introduces-agentic-ai-to-the-bloomberg-terminal/)

---

### 2. Robinhood Cortex

**UI Position:** Embedded across the Robinhood app -- appears on quote screens (Digests), in the Legend desktop platform (custom indicators, scanner widget), and as a standalone conversational assistant.

**Context Strategy:** Portfolio-aware. Cortex analyzes the user's holdings, connects real-time news and market shifts to individual positions, and explains why developments matter to them personally. Sources include real-time market data, analyst reports, and proprietary data.

**Persistence:** Portfolio Digests are continuously updated. Custom indicators sync between Legend desktop and mobile automatically.

**Key UX Innovations:**
- **Cortex Digests** -- AI-generated stock price movement explanations appearing directly on quote screens (not behind a chat interface)
- **Portfolio-level Digests** -- personalized daily summaries of top portfolio drivers, upcoming events tied to holdings
- **Custom Indicators via Natural Language** -- describe what you want on a chart and Cortex builds it (no coding)
- **Scanner Widget** -- describe trading criteria and Cortex monitors the market for matches in real-time
- **Action-Oriented** -- users can buy/sell, research, and adjust account settings through natural language

**Architecture:** Generative AI trained on financial data with real-time market data integration. Designed as a platform-wide "operating system" rather than a siloed chatbot.

**What We Can Steal:**
- **Proactive Digests on stock pages** -- don't wait for the user to ask; surface AI summaries directly on ticker pages
- **Portfolio-contextualized insights** -- connect every piece of news/data to the user's specific holdings
- **Natural language chart customization** -- let users describe what they want to see
- **Scan-to-action pattern** -- describe criteria, get real-time matches, execute in seconds

Sources: [Robinhood HOOD Summit 2025](https://robinhood.com/us/en/newsroom/hood-summit-2025-news/), [Robinhood Cortex Digests](https://robinhood.com/us/en/support/articles/cortex-digests/), [PYMNTS Coverage](https://www.pymnts.com/news/artificial-intelligence/2025/robinhood-adds-ai-powered-summaries-to-cortex-investing-assistant/)

---

### 3. Morgan Stanley AI Suite (Next Best Action + OpenAI Partnership)

**UI Position:** Internal tools for 16,000+ financial advisors. AI @ Morgan Stanley Assistant is a chatbot for information retrieval. Debrief is a meeting companion. AskResearchGPT augments the research platform.

**Context Strategy:** Deep integration with client data -- portfolio history, preferences, behaviors, real-time market conditions, proprietary research, product suitability, and compliance filters. Debrief captures meeting recordings (with client consent) via Whisper and GPT-4.

**Persistence:** Actions and notes are automatically saved into Salesforce CRM. 98% of advisor teams actively use the Assistant.

**Key UX Innovations:**
- **Next Best Action** -- AI recommends personalized actions (rebalancing suggestions, product recommendations, follow-up prompts) based on client data
- **Meeting Debrief** -- auto-generates notes, action items, draft follow-up emails from Zoom recordings
- **100K document access** -- went from answering 7,000 questions to effectively answering any question from 100K documents
- **Manager oversight layer** -- companion tool lets managers track advisor engagement with AI recommendations
- **Trust-building approach** -- advisors can always override recommendations; never mandatory

**Architecture:** OpenAI partnership (GPT-4, Whisper). Zero data retention policy with OpenAI. RAG over 100K+ internal documents. CRM integration (Salesforce).

**What We Can Steal:**
- **Proactive "Next Best Action" nudges** -- don't just answer questions; proactively suggest actions based on portfolio state
- **Meeting debrief pattern** -- if we ever support advisor workflows, auto-summarize research sessions
- **Trust through override-ability** -- always let users dismiss/override AI suggestions
- **Document corpus search** -- make all research documents searchable via natural language

Sources: [Morgan Stanley AI Debrief](https://www.morganstanley.com/press-releases/ai-at-morgan-stanley-debrief-launch), [OpenAI Case Study](https://openai.com/index/morgan-stanley/), [Morgan Stanley AskResearchGPT](https://www.morganstanley.com/press-releases/morgan-stanley-research-announces-askresearchgpt)

---

### 4. Alpaca Markets AI

**UI Position:** Not a UI product -- it is an API-first platform with an MCP (Model Context Protocol) server that plugs into AI interfaces like ChatGPT, Claude, Cursor, VS Code.

**Context Strategy:** Real-time market data, portfolio data, and order execution all accessible through the MCP server. The AI client pulls context on demand.

**Persistence:** Account-based. Paper trading environment with $100K simulated funds.

**Key UX Innovations:**
- **MCP Server as universal bridge** -- any AI interface can research, analyze, and execute trades through a standardized protocol
- **Natural language to multi-leg options** -- place complex options spreads (bull call spreads, condors) via plain English
- **Full transparency** -- every AI action shows inputs, parameters, and results
- **Vibe-coding bridge** -- start with natural language prompts, shift into code when you want to optimize

**Architecture:** REST API + MCP server. Supports equities, ETFs, crypto, multi-leg options. Paper trading and live trading with same API, different keys.

**What We Can Steal:**
- **MCP server pattern** -- expose our signal data through MCP so any AI tool can query it
- **Paper-to-live progression** -- let users test AI suggestions in simulation before going live
- **Show all parameters** -- full transparency on every AI action

Sources: [Alpaca MCP Server](https://alpaca.markets/mcp-server), [Alpaca MCP Blog](https://alpaca.markets/blog/introducing-official-mcp-server-enabling-multi-market-trading-with-ai-interfaces/)

---

### 5. eToro CopyTrader + AI

**UI Position:** AI companion "Tori" embedded in the eToro platform. AI tools initially available to Popular Investors (top traders).

**Context Strategy:** Risk profiles, market conditions, user behavior, portfolio holdings. Connected to real-time market data and social trading network (4,000+ copyable investors from 70 countries).

**Persistence:** Portfolio-level persistent. Trading algorithms and strategies are saved and shareable.

**Key UX Innovations:**
- **Social + AI fusion** -- AI-powered marketplace where Popular Investors use AI to develop trading algorithms, then other users copy them
- **Tori AI Companion** -- personalized insights, platform guidance, investment education through natural conversation
- **Public APIs + App Store** -- third-party developers can build apps using eToro's data and publish to users
- **VaR modeling and stress testing** -- enterprise-grade risk analysis accessible to retail investors

**Architecture:** AI tools built on top of social trading network. Public APIs for real-time market data, portfolio analytics, and social features.

**What We Can Steal:**
- **Social layer on AI insights** -- let users share/discuss AI-generated analysis
- **AI companion for onboarding** -- guided platform discovery through conversational AI
- **Ecosystem/marketplace model** -- API-driven app store for third-party extensions

Sources: [eToro AI Announcement](https://www.etoro.com/en-us/news-and-analysis/latest-news/press-release/etoro-leverages-ai-to-redefine-social-investing/), [eToro CopyTrader US Launch](https://www.etoro.com/en-us/news-and-analysis/latest-news/press-release/etoro-brings-copytrader-to-the-u-s-empowering-investors-to-trade-smarter/)

---

### 6. Interactive Brokers (Ask IBKR)

**UI Position:** Embedded in Client Portal, Advisor Portal, and IBKR Desktop. Chat-based interface with intelligent question completion and dropdown menus for parameters.

**Context Strategy:** Deep integration with PortfolioAnalyst -- knows client's full portfolio, benchmarks, sector exposure, returns by asset class and instrument type.

**Persistence:** Account-level. Expanding from portfolio analytics into fundamentals, tax lots, statements.

**Key UX Innovations:**
- **Intelligent Question Completion** -- suggests relevant queries as users type
- **Parameter dropdowns** -- select benchmarks, timeframes, accounts from structured menus within chat
- **Proprietary AI techniques** -- avoids GenAI uncertainty by using deterministic approaches where possible
- **Portfolio comparison** -- instant answers to "What sector am I underweight vs S&P 500?"

**Architecture:** Proprietary AI (not pure GenAI). Extension of PortfolioAnalyst data infrastructure. Third-party integrations (Capitalise.ai, Trade-Ideas).

**What We Can Steal:**
- **Smart autocomplete for financial queries** -- suggest questions as users type
- **Structured parameter selection within chat** -- dropdowns for tickers, timeframes, benchmarks inside the chat UI
- **Hybrid deterministic + AI approach** -- use rule-based logic where precision matters, AI where flexibility matters

Sources: [IBKR Ask IBKR Launch](https://www.interactivebrokers.com/en/general/about/mediaRelations/10-15-25.php), [IBKR IBot](https://www.interactivebrokers.com/en/trading/ibot.php)

---

### 7. TradingView AI

**UI Position:** No native AI assistant. AI features come through third-party indicators/plugins and community-built Pine Script tools.

**Context Strategy:** Chart-centric. Third-party AI tools analyze the currently displayed chart data, timeframes, and indicators.

**Persistence:** Indicators and scripts are saved per chart/layout.

**Key UX Innovations:**
- **ChartEye Plugin** -- generates AI-driven technical analysis reports from any chart with a few clicks
- **AI-generated Pine Script** -- describe indicators in natural language, get code generated
- **Community ecosystem** -- massive library of user-contributed AI indicators and strategies
- **Multi-timeframe AI analysis** -- checking different timeframes simultaneously to confirm signals

**Architecture:** Pine Script scripting language. Third-party plugins. No native LLM integration.

**What We Can Steal:**
- **Chart-to-analysis pipeline** -- click a button on any chart to get AI technical analysis
- **Natural language indicator builder** -- describe what you want to see, AI creates it
- **Community-contributed AI tools** -- enable a marketplace of user-built analysis tools

Sources: [TradingView Features](https://www.tradingview.com/), [ChartEye Plugin](https://tradingview.charteye.ai/)

---

### 8. FinChat.io (now Fiscal.ai)

**UI Position:** Full-page AI chatbot ("Copilot") alongside a comprehensive data platform with dashboards, screeners, and DCF models.

**Context Strategy:** RAG over financial data from S&P Market Intelligence. Covers 100K+ global public companies with up to 20 years of data. Specialized financial AI trained on financial data (not general-purpose).

**Persistence:** Watchlists, portfolios, and research auto-saved. Drag-and-drop dashboard customization.

**Key UX Innovations:**
- **AI + data visualization combo** -- ask a question, get a chart or table as part of the answer
- **Segment and KPI data** -- granular business unit data for 2,000 companies (very hard to get elsewhere)
- **SOC2 Type II certified** -- institutional-grade security
- **DCF modeling** -- build and modify valuation models through natural language

**Architecture:** ChatGPT-based GenAI + ML algorithms. Cloud-based. S&P Market Intelligence data partnership. API available. SOC2 Type II.

**What We Can Steal:**
- **THIS IS OUR CLOSEST COMPETITOR** -- study their UX deeply
- **Chat + data viz in one response** -- every answer should include relevant charts/tables
- **Segment/KPI data as differentiator** -- granular data that others don't have
- **Freemium model** -- 10 free prompts/month to hook users, paid tiers for power features

Sources: [FinChat.io](https://finchat.io/account/), [Fiscal.ai Review](https://skywork.ai/skypage/en/Fiscal.ai-(Formerly-FinChat)-Review-2025:-Your-AI-Co-Pilot-for-Investment-Research/1976115350401118208), [Wall Street Zen Review](https://www.wallstreetzen.com/blog/finchat-io-fiscal-ai-review/)

---

### 9. Daloopa / Koyfin / Sentieo

**UI Position:** Daloopa = Excel plugin + web platform. Koyfin = dashboard-centric web platform. Sentieo = document search + visualization platform.

**Context Strategy:**
- **Daloopa:** Extracts data from filings/transcripts, syncs to Excel. Now has MCP bridge for LLMs. 4,700 companies with 10x more datapoints per company than competitors.
- **Koyfin:** Customizable dashboards, AI-assisted screening, dynamic charting.
- **Sentieo:** Document search across millions of financial filings with visualization.

**Key UX Innovations:**
- **Daloopa MCP** -- bridges LLMs with structured, fully sourced financial data (LLM-agnostic: Claude, OpenAI, etc.)
- **Koyfin dashboards** -- drag-and-drop custom financial ratios and sector-wide screens
- **Sentieo document search** -- search millions of financial documents with minimal learning curve

**What We Can Steal:**
- **MCP for financial data** -- expose our signal data through MCP standard
- **Excel integration** -- financial analysts live in Excel; meet them there
- **Granular data extraction from filings** -- automate what analysts do manually

Sources: [Daloopa MCP PR](https://www.daloopa.com/blog/press-release/mcp-pr), [Daloopa $13M Funding](https://www.prnewswire.com/news-releases/daloopa-receives-13m-strategic-investment-to-power-the-next-generation-of-ai-in-finance-with-the-most-accurate-and-complete-data-infrastructure-302517650.html)

---

### 10. Man Group AlphaGPT

**UI Position:** Internal tool for quant researchers. Not user-facing.

**Context Strategy:** Historical market data, trading signals, backtesting infrastructure. Autonomous research pipeline.

**Key UX Innovations:**
- **"Digital three-person research team"** -- Idea Person brainstorms, Coder implements, Evaluator backtests
- **Minutes not days** -- produces viable research concepts in minutes vs days for humans
- **Human oversight preserved** -- AI-generated signals enter the same evaluation pipeline as human-generated ones
- **Modular and model-agnostic** -- can swap LLMs as better ones emerge

**Architecture:** Multi-agent system with three specialized roles. Modular, technology-agnostic. Prompt engineering adaptable to new model capabilities. Validation checks at each stage to prevent hallucinations and p-hacking.

**What We Can Steal:**
- **Multi-agent research pipeline** -- separate agents for ideation, analysis, and validation
- **Backtesting integration** -- every AI-generated signal should be automatically backtested
- **Human-in-the-loop at the right stage** -- AI generates, humans validate before live deployment
- **Anti-hallucination safeguards** -- multiple validation stages with consistency checks

Sources: [Hedgeweek Coverage](https://www.hedgeweek.com/man-group-deploys-agentic-ai-for-quant-signal-discovery/), [AI-Street AlphaGPT Deep Dive](https://www.ai-street.co/p/man-group-s-alphagpt), [AI-Street Inside AlphaGPT](https://www.ai-street.co/p/inside-man-group-s-alphagpt)

---

## TIER 2: BEST-IN-CLASS AI UX (CROSS-INDUSTRY)

---

### 11. GitHub Copilot Chat

**UI Position:** Sidebar panel in VS Code/IDE. Also available on GitHub.com, CLI, and mobile.

**Context Strategy:** Three-layer architecture -- Local Extension captures workspace context (open files, project structure, neighboring tabs), Copilot Proxy handles auth/routing, Backend LLM generates responses. **Copilot Spaces** (2025) let users bundle exact context (code, docs, transcripts, specs) into reusable, shareable spaces.

**Persistence:** Spaces persist across sessions and can be shared with teammates. Chat threads maintained within the sidebar.

**Key UX Innovations:**
- **Copilot Spaces** -- curated context bundles that make AI responses smarter and project-specific
- **Rich file interactions** -- view/edit generated files directly in the side panel
- **Inline previews** -- preview HTML, Markdown, Mermaid diagrams within chat
- **Model selection** -- choose between different AI models per query
- **MCP server UI components** -- render interactive charts, tables, or forms directly in the Copilot panel
- **Semantic codebase search** -- natural language questions about repos in the terminal

**Architecture:** Local Extension + Proxy + Backend LLM. Embedding-based workspace indexing. Streaming responses. MCP integration.

**What We Can Steal:**
- **Context Spaces** -- let users create "research spaces" with specific documents, tickers, and preferences that persist
- **Inline preview of generated content** -- render charts and tables directly in chat responses
- **MCP-powered interactive widgets** -- embed interactive financial widgets in chat responses
- **Model selection per query** -- let users choose between fast/cheap vs thorough/expensive models

Sources: [GitHub Copilot Spaces](https://github.blog/ai-and-ml/github-copilot/github-copilot-spaces-bring-the-right-context-to-every-suggestion/), [Copilot Chat Architecture](https://devblogs.microsoft.com/all-things-azure/github-copilot-chat-explained-the-life-of-a-prompt/)

---

### 12. Cursor AI

**UI Position:** Right sidebar for agent management. Toggleable between Agent View (sidebar shows running agents) and Classic Editor (file tree on left). Multiple agents visible simultaneously.

**Context Strategy:** Codebase embedding model provides deep understanding. Agents self-gather context from the codebase without manual attachment. Rules system (project, user, team, agent) provides persistent context instructions. `.cursor/rules/*.mdc` files and `AGENTS.md` at repo root.

**Persistence:** Rules persist across sessions. Agent histories maintained. Git worktrees for isolated parallel work.

**Key UX Innovations:**
- **Parallel agents** -- up to 8 agents running simultaneously, each in isolated codebase copy
- **Self-gathering context** -- AI automatically finds relevant code; no need to manually tag files
- **Rules system** -- persistent project/team/user instructions that stay in the model's context
- **Diff aggregation** -- aggregated diffs across multiple files for faster review
- **Voice control** -- control agents with speech-to-text
- **Visual web editor** -- drag/drop visual editing in a browser sidebar

**Architecture:** Multi-agent with git worktree isolation. Proprietary Composer model (4x faster than similar models). Language Server Protocol integration. Browser tool for DOM reading and E2E testing.

**What We Can Steal:**
- **Persistent rules/instructions** -- let users set persistent preferences ("always show P/E ratio", "I'm a value investor")
- **Self-gathering context** -- AI should automatically pull relevant data without users having to specify every detail
- **Parallel analysis** -- run multiple analysis agents simultaneously (technicals, fundamentals, sentiment)
- **Aggregated diff review** -- when AI updates a watchlist or portfolio view, show all changes in one reviewable diff

Sources: [Cursor Features](https://cursor.com/features), [Cursor 2.0 Changelog](https://cursor.com/changelog/2-0), [Cursor AI Review](https://skywork.ai/blog/cursor-ai-review-2025-agent-refactors-privacy/)

---

### 13. Perplexity AI

**UI Position:** Full-page search/answer interface. Clean, focused layout with answer + citations + follow-up suggestions.

**Context Strategy:** Multi-model routing -- routes queries to different LLMs based on complexity. RAG with real-time web crawling. Embedding-based semantic matching. Pro Search breaks complex questions into sub-queries.

**Persistence:** Conversational memory within threads. Follow-up questions maintain context. Collections for saving research.

**Key UX Innovations:**
- **Inline numbered citations** -- every claim has a clickable [1][2][3] citation
- **Pro Search multi-step reasoning** -- breaks complex queries into sub-steps, shows the research plan
- **Follow-up question suggestions** -- AI proposes next questions to guide research
- **Model selection** -- choose between Sonar, GPT-5, Claude, Gemini per query
- **Labs outputs** -- charts, dashboards, slides, structured reports
- **Focus modes** -- Web, Academic, Finance, Files for different search contexts

**Architecture:** Multi-model routing. RAG + real-time web crawling. Embedding vectors for semantic matching. Processes 780M monthly queries.

**What We Can Steal:**
- **CITATION UX IS CRITICAL** -- every financial claim must have an inline, clickable source citation
- **Multi-step research with visible plan** -- show users the AI's research steps before/during execution
- **Suggested follow-up questions** -- guide users to deeper analysis they might not think to ask
- **Focus modes** -- let users switch between "Quick Answer", "Deep Research", "Technical Analysis" modes

Sources: [Perplexity Architecture](https://www.frugaltesting.com/blog/behind-perplexitys-architecture-how-ai-search-handles-real-time-web-data), [Perplexity Pro Search](https://www.perplexity.ai/help-center/en/articles/10352903-what-is-pro-search), [Perplexity Review 2025](https://www.glbgpt.com/hub/perplexity-ai-review-2025/)

---

### 14. ChatGPT (OpenAI)

**UI Position:** Full-page chat with Canvas side panel for documents/code. Projects organize related chats + files + instructions.

**Context Strategy:** Memory persists across conversations. Custom instructions per account. Projects contain files, custom instructions, and project-specific memory. Canvas enables inline editing of generated content.

**Persistence:** Cross-session memory. Project-level context. Canvas version history. Scheduled tasks.

**Key UX Innovations:**
- **Canvas** -- two-pane workspace for collaborative editing (chat left, document/code right)
- **Projects** -- folders with files, custom instructions, project-specific memory, shared with teams
- **Memory** -- remembers user preferences and details across conversations
- **Deep Research** -- super-agent for ingesting/summarizing large web datasets
- **Agent mode + Connectors** -- function calling into external APIs and services
- **Scheduled tasks** -- automated recurring prompts

**Architecture:** Multi-model (GPT-4, o3, etc.). Function calling 2.0. Plugin marketplace. Memory system. Canvas collaboration engine.

**What We Can Steal:**
- **Canvas pattern** -- chat on left, interactive artifact (chart, analysis, portfolio view) on right
- **Projects with persistent context** -- group research by theme/strategy with persistent files and instructions
- **Cross-session memory** -- remember user preferences, portfolio, risk tolerance
- **Scheduled tasks** -- daily portfolio briefings, weekly watchlist updates

Sources: [ChatGPT Canvas](https://openai.com/index/introducing-canvas/), [ChatGPT Projects](https://help.openai.com/en/articles/10169521-projects-in-chatgpt)

---

### 15. Claude (Anthropic)

**UI Position:** Chat with Artifacts panel on the right side. Projects organize chats with shared context.

**Context Strategy:** Projects with 200K context window (~500 pages). Custom instructions per project. MCP integrations connect to external tools. Skills system (SKILL.md) for on-demand capability loading.

**Persistence:** Projects persist across sessions. Artifacts can be published/embedded. MCP connections maintained.

**Key UX Innovations:**
- **Artifacts panel** -- generated content (code, apps, documents, visualizations) appears in a dedicated side panel with Preview/Code toggle
- **Publishable artifacts** -- one-click publish to shareable URL
- **MCP integrations** -- connect to Asana, Google Calendar, Slack, custom servers
- **Projects** -- 200K context window with custom instructions per project
- **Highlight-to-edit** -- select specific sections of artifacts for targeted revision
- **App building** -- describe an app in natural language, Claude builds and hosts it

**Architecture:** Claude models (Sonnet, Opus, Haiku). MCP protocol for tool integration. Skills system for modular capabilities. Context engineering via markdown documents.

**What We Can Steal:**
- **Artifacts panel with Preview/Code toggle** -- show interactive charts that users can also see the underlying data/code for
- **Publishable artifacts** -- let users publish and share their AI-generated analysis
- **MCP for tool integration** -- standardized protocol for connecting to data sources
- **Project-level custom instructions** -- different research profiles for different strategies

Sources: [Claude Artifacts](https://support.claude.com/en/articles/9487310-what-are-artifacts-and-how-do-i-use-them), [Claude Projects](https://www.anthropic.com/news/projects), [Claude Context Engineering](https://01.me/en/2025/12/context-engineering-from-claude/)

---

### 16. Google Gemini Deep Research

**UI Position:** Full-page research interface. Shows research plan, then generates structured multi-section document with citations.

**Context Strategy:** Grounded in Google Search with real-time web retrieval. Can upload PDFs and images. Links to Google Drive documents. Semantic embedding for query understanding. Iterative search -- identifies knowledge gaps and searches again.

**Persistence:** Research reports saved. Can link Drive documents for ongoing context.

**Key UX Innovations:**
- **Research plan preview** -- shows the investigation strategy before executing, users can modify
- **100+ source analysis** -- analyzes over 100 sources over 5-15 minutes for deep topics
- **Structured output** -- generates documents with sections, headings, citations, and analysis
- **Iterative gap-filling** -- automatically identifies what's missing and searches more
- **Proactive resource suggestions** -- suggests related interactive charts, simulators, and deeper dives
- **Grounding metadata** -- returns search queries, web results, and sources as structured data

**Architecture:** Gemini 3 Pro reasoning core. Real-time Google Search grounding. RAG pipeline. Embedding vectors for semantic matching. Multiple grounding tools (Search, Maps, YouTube, URL context). Available via Interactions API for developers.

**What We Can Steal:**
- **Research plan preview** -- show users what the AI plans to research before it starts, let them modify
- **Iterative deep research** -- don't stop at first results; identify gaps and keep digging
- **Structured report generation** -- produce formatted, multi-section research reports with citations
- **Proactive related suggestions** -- after answering, suggest deeper analysis the user might want

Sources: [Gemini Deep Research API](https://ai.google.dev/gemini-api/docs/deep-research), [Gemini Deep Research Guide](https://www.digitalapplied.com/blog/google-gemini-deep-research-guide), [Google I/O 2025 Deep Research Updates](https://workspaceupdates.googleblog.com/2025/05/deep-research-updates-gemini-io-2025.html)

---

### 17. Notion AI

**UI Position:** Embedded throughout the workspace -- AI blocks in pages, search bar, database properties, and now as autonomous Agents (Notion 3.0).

**Context Strategy:** Deep workspace awareness -- understands page structures, database relationships, project contexts, and historical content. Connectors to Slack, Google Drive, GitHub. Web access within permissions.

**Persistence:** Workspace-level persistent. AI database properties auto-fill. Agent memory uses Notion pages and databases.

**Key UX Innovations:**
- **AI Database Properties** -- smart autofill columns (AI summary, keywords, translation) that update automatically
- **Agents (Notion 3.0)** -- autonomous agents that can execute 20+ minutes of multi-step actions across the workspace
- **Custom Agents on triggers/schedules** -- automated workflows that run without user initiation
- **Enterprise Search** -- search across workspace + connected apps (Slack, Drive) in one query
- **Research Mode** -- analyzes workspace + connected tools + web to draft documents

**Architecture:** GPT-4 + Claude integration. Block-based content architecture. MCP integration. Agent memory system. Connector architecture for external tools.

**What We Can Steal:**
- **AI-powered database columns** -- auto-populate watchlist columns with AI-generated summaries, sentiment scores, risk flags
- **Scheduled autonomous agents** -- daily portfolio review agent, earnings watch agent, risk monitoring agent
- **Cross-source enterprise search** -- search across all data sources (signals, news, filings, user notes) in one query
- **Block-based modular content** -- every piece of AI output (chart, table, summary) is a reusable, rearrangeable block

Sources: [Notion AI Product Page](https://www.notion.com/product/ai), [Notion 3.0 Agents](https://www.notion.com/releases/2025-09-18)

---

### 18. Linear AI

**UI Position:** Integrated within issue tracking interface. AI agents appear as assignees and commenters within the existing project management workflow.

**Context Strategy:** Full issue context (description, comments, labels, project, milestone) is passed to AI agents. MCP server provides access to initiatives, milestones, and updates.

**Persistence:** Issue-level. Progress updates stream to the Linear activity timeline. PRs linked to issues.

**Key UX Innovations:**
- **AI as a team member** -- assign issues directly to AI agents (Copilot, Cursor, Sentry) as you would a human
- **Context flows to code** -- issue description and comments become the AI's implementation brief
- **Progress streaming** -- real-time updates in the activity timeline as AI works
- **Deeplink to AI coding tools** -- one-click from issue to AI-assisted implementation
- **Multi-agent system** -- specialized agents for bugs, features, improvements, workflow coordination

**Architecture:** MCP server for external tool integration. GitHub Copilot agent runs in ephemeral GitHub Actions environments. Git worktrees for isolation.

**What We Can Steal:**
- **AI as assignable team member** -- users can "assign" research tasks to AI agents and see progress
- **Activity timeline for AI work** -- show what the AI is doing in real-time within the main interface
- **Structured issue templates** -- structured input formats that help AI produce better output

Sources: [Linear + GitHub Copilot](https://linear.app/changelog/2025-10-28-github-copilot-agent), [GitHub Docs: Copilot + Linear](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/integrate-coding-agent-with-linear)

---

### 19. Shopify Sidekick

**UI Position:** Floating icon (purple glasses) in the Shopify admin. Opens as a chat overlay. Available everywhere in the admin.

**Context Strategy:** Knows the entire store -- sales data, inventory, customer behavior, product catalog, theme code, orders, analytics. Can write ShopifyQL queries for advanced data access.

**Persistence:** Store-level persistent. Automation workflows saved. Custom apps built through Sidekick persist.

**Key UX Innovations:**
- **"Co-founder" positioning** -- framed as a proactive business partner, not just a Q&A bot
- **Multi-step reasoning** -- troubleshoots issues, flags conversion opportunities, surfaces checkout problems
- **Action execution** -- creates customers, builds automation workflows, generates code changes, creates admin apps
- **Image generation** -- built-in product and marketing visual creation
- **Guided walkthroughs** -- step-by-step on-screen guidance for complex tasks
- **Voice chat** -- speak to Sidekick instead of typing (beta)

**Architecture:** Generative AI integrated with Shopify's data layer (GraphQL API, ShopifyQL). Admin app framework. Sidekick App Extensions for third-party developers.

**What We Can Steal:**
- **Always-present floating icon** -- accessible from every page without disrupting workflow
- **Proactive recommendations** -- surface opportunities and problems without being asked
- **Execute actions, not just advise** -- set alerts, create watchlist entries, build charts through conversation
- **Guided walkthroughs** -- step-by-step tutorials for new users overlaid on the actual interface
- **Voice input** -- speak research queries instead of typing

Sources: [Shopify Sidekick](https://www.shopify.com/sidekick), [Shopify Magic](https://www.shopify.com/magic), [Shopify AI Upgrades](https://thelettertwo.com/2025/12/10/shopify-ai-growth-tools-sidekick-tinker-agentic-storefronts/)

---

### 20. Intercom Fin

**UI Position:** Multi-channel -- embedded chat widget, email, tickets, live chat. Conversational without a mandatory "Talk to Person" button.

**Context Strategy:** Three-layer Fin AI Engine: RAG for accurate retrieval, Custom LLMs trained on real customer service interactions, and Proprietary Retrieval model. Learns from all knowledge sources (internal content, websites, PDFs, databases).

**Persistence:** Conversational. Each conversation tracked. Learns from human agent interactions to improve over time.

**Key UX Innovations:**
- **Procedures** -- natural language + deterministic controls for handling complex multi-step workflows (damaged orders, account troubleshooting)
- **Simulations** -- test AI behavior before deploying to customers
- **Outcome-based pricing** -- $0.99 per resolved conversation (pay for value, not usage)
- **99.9% accuracy** -- industry-leading accuracy through three-layer architecture
- **AI + Human feedback loop** -- AI learns from humans, humans learn from AI
- **45 languages** -- adapts to brand voice across languages

**Architecture:** Three-layer: RAG + Custom LLMs + Proprietary Retrieval. Modular and model-agnostic. Supports chat, email, voice modalities. 44 features shipped in Q3 2025 alone.

**What We Can Steal:**
- **Procedures for complex workflows** -- define step-by-step research procedures that AI follows deterministically
- **Simulation testing** -- test AI responses on sample queries before deploying to users
- **Outcome-based value metric** -- measure and charge for actual insights delivered, not tokens consumed
- **Three-layer accuracy architecture** -- RAG + specialized models + custom retrieval for financial accuracy
- **Continuous learning from user feedback** -- AI improves based on which answers users find helpful

Sources: [Intercom Fin](https://www.intercom.com/fin), [Fin 3 Announcement](https://www.intercom.com/blog/whats-new-with-fin-3/), [OpenAI + Intercom Case Study](https://openai.com/index/intercom/)

---

## CROSS-CUTTING PATTERNS & RECOMMENDATIONS

### Pattern 1: UI Position -- The Sidebar + Proactive Inline Model
**Who does it best:** Robinhood Cortex, Shopify Sidekick, GitHub Copilot, Cursor
**Pattern:** A persistent chat sidebar (right side) PLUS proactive AI insights embedded directly in the main content (stock pages, dashboards). The AI is not hidden behind a button -- it surfaces insights where the user is already looking.

**Recommendation for our stock copilot:**
- Floating chat icon on every page (like Shopify Sidekick)
- Right sidebar chat panel that persists across navigation
- AI-generated insights embedded directly on ticker pages (like Robinhood Cortex Digests)
- Proactive alerts/nudges in the dashboard (like Morgan Stanley Next Best Action)

### Pattern 2: Context Strategy -- Portfolio-Aware + RAG + Real-Time
**Who does it best:** Bloomberg ASKB, Robinhood Cortex, Morgan Stanley, FinChat
**Pattern:** The best financial copilots know (a) what the user owns, (b) what they're looking at right now, (c) all available research/data, and (d) real-time market conditions. They connect every answer to the user's specific situation.

**Recommendation:**
- Always know the user's watchlist and portfolio
- Every AI response should reference how it affects their specific holdings
- RAG over our signal database, filings, news, and earnings transcripts
- Real-time market data integration in responses

### Pattern 3: Citations and Transparency
**Who does it best:** Perplexity AI, Bloomberg ASKB, FinChat
**Pattern:** Every factual claim has an inline, clickable source citation. Users can verify any statement. In finance, this is non-negotiable for trust.

**Recommendation:**
- Inline numbered citations [1][2][3] on every factual claim
- Clickable links to source documents (filings, news articles, analyst reports)
- Show underlying data/queries when requested (like Bloomberg BQL)
- Confidence scores on AI-generated signals

### Pattern 4: Agentic Workflows
**Who does it best:** Bloomberg ASKB Workflows, Man Group AlphaGPT, Notion Agents, Cursor Parallel Agents
**Pattern:** Moving beyond Q&A to autonomous multi-step research. The user describes a goal, the AI plans and executes multiple steps, and delivers a comprehensive result.

**Recommendation:**
- "Deep Research" mode that runs multi-step analysis (like Gemini Deep Research)
- Show the research plan before executing (like Gemini)
- Saveable workflow templates (like Bloomberg ASKB)
- Multiple specialized agents running in parallel (technicals, fundamentals, sentiment, risk)

### Pattern 5: Suggested Follow-Up Questions
**Who does it best:** Perplexity AI, ChatGPT
**Pattern:** After answering, suggest 2-3 related questions the user might want to explore next. This guides users to deeper analysis and increases engagement.

**Recommendation:**
- After every response, suggest 2-3 relevant follow-up questions
- Context-aware suggestions based on the ticker/topic being discussed
- "Go Deeper" button that runs more thorough analysis

### Pattern 6: Persistent Memory and Project Context
**Who does it best:** ChatGPT (Memory + Projects), Claude (Projects), Cursor (Rules), Notion (Workspace)
**Pattern:** The AI remembers user preferences, investment style, risk tolerance, and past research across sessions. Projects/spaces group related research with shared context.

**Recommendation:**
- User profile: risk tolerance, investment style, preferred sectors, experience level
- Research projects: group tickers/themes with shared context and history
- Persistent rules: "I'm a value investor", "Always compare to ASX200", "Show me DCF implications"

### Pattern 7: Interactive Artifacts / Canvas
**Who does it best:** Claude (Artifacts), ChatGPT (Canvas), GitHub Copilot (Inline Preview)
**Pattern:** AI-generated content appears in an interactive side panel where users can view, edit, and iterate. Not just text -- interactive charts, tables, and applications.

**Recommendation:**
- Every chart, table, and analysis should be an interactive artifact
- Users can edit/refine artifacts through follow-up conversation
- Shareable/publishable artifacts for team collaboration
- Preview mode for visual content + data mode for underlying numbers

### Pattern 8: Outcome-Based Value
**Who does it best:** Intercom Fin ($0.99/resolution)
**Pattern:** Pricing and value measurement based on outcomes delivered, not tokens consumed or API calls made.

**Recommendation:**
- Track "insights delivered" and "actions taken" as value metrics
- Consider outcome-based pricing tiers
- Measure signal accuracy over time as a trust metric

---

## PRIORITY FEATURES FOR OUR STOCK COPILOT (Ranked)

### Must-Have (v1)
1. **Persistent right sidebar chat** with floating trigger icon on every page
2. **Portfolio/watchlist-aware responses** -- every answer references user's holdings
3. **Inline citations** on every factual claim with clickable sources
4. **AI-generated insights embedded on ticker pages** (Cortex Digest pattern)
5. **Suggested follow-up questions** after every response
6. **Interactive charts/tables in responses** (Artifacts pattern)

### Should-Have (v2)
7. **Research projects** -- group tickers/themes with persistent context
8. **User profile and persistent memory** -- risk tolerance, style, preferences
9. **Deep Research mode** -- multi-step analysis with visible research plan
10. **Workflow templates** -- save and re-run multi-step analyses across tickers
11. **Smart autocomplete** for financial queries with parameter dropdowns
12. **Multi-agent parallel analysis** (technicals + fundamentals + sentiment simultaneously)

### Nice-to-Have (v3)
13. **Scheduled briefings** -- daily portfolio digest, earnings previews
14. **Publishable/shareable artifacts** -- share AI analysis with others
15. **MCP server** -- expose our data for use in external AI tools
16. **Voice input** for research queries
17. **Natural language chart/indicator builder**
18. **Simulation/backtesting** of AI-generated signals
19. **App marketplace** for third-party extensions

---

## COMPETITIVE POSITIONING

Our closest competitor is **FinChat.io/Fiscal.ai**. To differentiate:

1. **Signal-first, not data-first** -- they start with financial data; we start with AI-detected signals and anomalies
2. **Proactive, not reactive** -- they wait for questions; we surface insights before users ask (Cortex Digest + Next Best Action pattern)
3. **Australian market depth** -- ASX/ASIC-specific data and filings that global platforms underserve
4. **Multi-agent signal pipeline** -- our proprietary signal detection (forward guidance, risk disclosure, tone shift) is a unique data source
5. **Action-oriented** -- connect insights to actionable next steps, not just information delivery

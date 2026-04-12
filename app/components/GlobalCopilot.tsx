"use client";

/**
 * GlobalCopilot — site-wide floating AI chat widget.
 *
 * - Bottom-right floating bubble → expands to chat panel
 * - Detects current page via usePathname() → fetches page context
 * - Persists conversation across page navigations (React state)
 * - Uses /api/copilot/stream for generic chat (not ticker-scoped)
 * - When on a ticker page, extracts symbol and sends it for grounding
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import SimpleMarkdown from "./SimpleMarkdown";

interface Message {
  role:     "user" | "assistant";
  content:  string;
  model?:   string;
  pending?: boolean;
}

interface PageContext {
  page_type:    string;
  description:  string;
  [key: string]: unknown;
}

// ── i18n helpers ─────────────────────────────────────────────────────────────

type CLabels = Record<string, string>;

function useCopilotLabels(lang: string): CLabels {
  const [labels, setLabels] = useState<CLabels>({});
  useEffect(() => {
    if (lang === "en") return;
    fetch(`/api/i18n/labels?lang=${lang}&category=copilot`)
      .then((r) => r.json())
      .then(setLabels)
      .catch(() => {});
  }, [lang]);
  return labels;
}

function cl(labels: CLabels, key: string, fallback: string): string {
  return labels[key] ?? fallback;
}

// ── Suggested questions per page type (label keys + English fallbacks) ────────

const PAGE_SUGGESTION_KEYS: Record<string, { key: string; en: string }[]> = {
  us_homepage: [
    { key: "copilot_q_us_1", en: "Which US stocks have the most significant website changes today?" },
    { key: "copilot_q_us_2", en: "Give me a quick overview of the current market sentiment" },
    { key: "copilot_q_us_3", en: "Which stocks in the monitored universe have the best technicals?" },
  ],
  asx_homepage: [
    { key: "copilot_q_us_1", en: "Which ASX blue chips have recent IR page changes?" },
    { key: "copilot_q_us_2", en: "Compare BHP and RIO — any divergence in their disclosures?" },
    { key: "copilot_q_us_3", en: "What's the overall sentiment for Australian banks today?" },
  ],
  watchlist: [
    { key: "copilot_q_watch_1", en: "Summarise my watchlist — which stocks need attention?" },
    { key: "copilot_q_watch_2", en: "Any breaking news or critical alerts for my stocks?" },
  ],
  alerts: [
    { key: "copilot_q_watch_2", en: "Explain the top alerts — what changed and why does it matter?" },
  ],
  ticker_detail: [
    { key: "copilot_q_ticker_1", en: "What are the key risks for this stock right now?" },
    { key: "copilot_q_ticker_2", en: "Summarise the latest IR page changes detected" },
    { key: "copilot_q_ticker_3", en: "What do the technicals say about entry points?" },
  ],
  ticker_intel: [
    { key: "copilot_q_intel_1", en: "Compare the TA and FA signals — are they aligned?" },
    { key: "copilot_q_intel_2", en: "What's the AI's overall view on this stock?" },
    { key: "copilot_q_intel_3", en: "Run me through the key chart patterns" },
  ],
  screener: [
    { key: "copilot_q_screener_1", en: "Which stocks have the strongest buy setup right now?" },
    { key: "copilot_q_screener_2", en: "Show me oversold stocks with high volume — potential bounce plays" },
  ],
  general: [
    { key: "copilot_q_screener_1", en: "Which stocks should I buy today based on the screener?" },
    { key: "copilot_q_us_3", en: "Which stocks are showing the strongest signals today?" },
  ],
};

// ── Main component ───────────────────────────────────────────────────────────

// ── sessionStorage helpers for persisting chat across full page reloads ──────
const STORAGE_KEY = "datapai_copilot";

function loadPersistedState(): { messages: Message[]; sessionId: string | null; open: boolean; minimised: boolean } {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { messages: [], sessionId: null, open: false, minimised: false };
    const parsed = JSON.parse(raw);
    // Strip any pending messages from a previous interrupted stream
    const msgs = (parsed.messages ?? []).filter((m: Message) => !m.pending);
    return { messages: msgs, sessionId: parsed.sessionId ?? null, open: parsed.open ?? false, minimised: parsed.minimised ?? false };
  } catch {
    return { messages: [], sessionId: null, open: false, minimised: false };
  }
}

function persistState(state: { messages: Message[]; sessionId: string | null; open: boolean; minimised: boolean }) {
  try {
    // Only persist non-pending messages
    const msgs = state.messages.filter((m) => !m.pending);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, messages: msgs }));
  } catch { /* quota exceeded — ok */ }
}

export default function GlobalCopilot({ lang = "en" }: { lang?: string }) {
  const pathname = usePathname();
  const copilotLabels = useCopilotLabels(lang);

  // Restore state from sessionStorage on mount
  const [hydrated, setHydrated] = useState(false);
  const [open, setOpen]           = useState(false);
  const [messages, setMessages]   = useState<Message[]>([]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pageCtx, setPageCtx]     = useState<PageContext | null>(null);
  const [ctxLoading, setCtxLoading] = useState(false);
  const [minimised, setMinimised] = useState(false);

  // Hydrate from sessionStorage on first mount
  useEffect(() => {
    const saved = loadPersistedState();
    if (saved.messages.length > 0) setMessages(saved.messages);
    if (saved.sessionId)           setSessionId(saved.sessionId);
    if (saved.open)                setOpen(saved.open);
    if (saved.minimised)           setMinimised(saved.minimised);
    setHydrated(true);
  }, []);

  // Persist to sessionStorage whenever key state changes
  useEffect(() => {
    if (!hydrated) return;
    persistState({ messages, sessionId, open, minimised });
  }, [messages, sessionId, open, minimised, hydrated]);

  // Track which page we last fetched context for
  const lastCtxPage = useRef<string>("");
  const bottomRef   = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch page context when pathname changes
  const fetchContext = useCallback(async (page: string) => {
    if (page === lastCtxPage.current) return;
    lastCtxPage.current = page;
    setCtxLoading(true);
    try {
      const res = await fetch(`/api/copilot/context?page=${encodeURIComponent(page)}`);
      const json = await res.json();
      if (json.ok && json.data) {
        setPageCtx(json.data as PageContext);
      }
    } catch {
      // silent — context is optional
    } finally {
      setCtxLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContext(pathname);
  }, [pathname, fetchContext]);

  // Focus input when opening
  useEffect(() => {
    if (open && !minimised) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, minimised]);

  // Extract ticker from path if on a ticker page
  const tickerMatch = pathname.match(/^\/ticker\/([A-Za-z0-9.]+)/);
  const currentTicker = tickerMatch ? tickerMatch[1].toUpperCase() : null;

  // Build context string for the backend
  function buildContextString(): string {
    if (!pageCtx) return "";
    const parts: string[] = [`Page: ${pageCtx.page_type} — ${pageCtx.description}`];

    if (pageCtx.stocks) {
      if (Array.isArray(pageCtx.stocks)) {
        parts.push(`Stocks on this page:\n${(pageCtx.stocks as string[]).join("\n")}`);
      } else {
        parts.push(`Stocks: ${pageCtx.stocks}`);
      }
    }
    if (pageCtx.alerts) {
      parts.push(`Active alerts:\n${(pageCtx.alerts as string[]).join("\n")}`);
    }
    if (pageCtx.screener_highlights) {
      if (Array.isArray(pageCtx.screener_highlights)) {
        parts.push(`[SCREENER DATA — 8,500+ stocks scanned]\n${(pageCtx.screener_highlights as string[]).join("\n\n")}`);
      }
    }
    if (pageCtx.ta_signal) {
      parts.push(`Technical Analysis:\n${pageCtx.ta_signal}`);
    }
    if (pageCtx.latest_analysis) {
      const a = pageCtx.latest_analysis as Record<string, string>;
      parts.push(`Latest scan: ${a.what_changed ?? ""} [${a.signal_type ?? ""}, ${a.severity ?? ""}]`);
    }
    if (pageCtx.synthesis) {
      const s = pageCtx.synthesis as Record<string, string>;
      parts.push(`AI Synthesis: ${s.direction} (confidence: ${s.confidence}) — ${s.one_liner}`);
    }
    return parts.join("\n\n");
  }

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMsg: Message  = { role: "user", content: text.trim() };
    const pending: Message  = { role: "assistant", content: "", pending: true };

    setMessages((prev) => [...prev, userMsg, pending]);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/copilot/stream", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          message:      text.trim(),
          session_id:   sessionId,
          lang,
          page_context: buildContextString(),
          ticker:       currentTicker,
          exchange:     currentTicker ? (pageCtx?.exchange as string ?? "US") : null,
        }),
        signal: AbortSignal.timeout(60_000),
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer        = "";
      let gotFirstChunk = false;
      let finalModel    = "";

      // Process SSE lines from a buffer string
      function processLines(linesToProcess: string[]) {
        for (const line of linesToProcess) {
          if (!line.startsWith("data: ")) continue;
          let event: Record<string, string>;
          try { event = JSON.parse(line.slice(6)); } catch { continue; }

          if (event.type === "session" && event.session_id && !sessionId) {
            setSessionId(event.session_id);
          } else if (event.type === "chunk" && event.text) {
            if (!gotFirstChunk) {
              setMessages((prev) =>
                prev.map((m, i) =>
                  i === prev.length - 1
                    ? { role: "assistant", content: event.text, pending: false }
                    : m
                )
              );
              gotFirstChunk = true;
            } else {
              setMessages((prev) =>
                prev.map((m, i) =>
                  i === prev.length - 1
                    ? { ...m, content: m.content + event.text }
                    : m
                )
              );
            }
          } else if (event.type === "done") {
            finalModel = event.model ?? "";
            if (finalModel) {
              setMessages((prev) =>
                prev.map((m, i) =>
                  i === prev.length - 1 ? { ...m, model: finalModel } : m
                )
              );
            }
          } else if (event.type === "error") {
            // Rate limit / registration prompt — show as assistant message with action
            const errMsg = event.message ?? "Stream error";
            const action = event.action ?? "";
            const actionTag = action === "REGISTER" ? "\n[ACTION:REGISTER]"
                            : action === "UPGRADE"  ? "\n[ACTION:UPGRADE]"
                            : "";
            setMessages((prev) =>
              prev.map((m, i) =>
                i === prev.length - 1
                  ? { role: "assistant", content: errMsg + actionTag, pending: false }
                  : m
              )
            );
            setLoading(false);
            return;
          }
        }
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        processLines(lines);
      }

      // Flush decoder and process any remaining buffer content
      buffer += decoder.decode();
      if (buffer.trim()) {
        processLines(buffer.split("\n"));
      }
    } catch (err) {
      setMessages((prev) => prev.slice(0, -1));
      setError(String(err));
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function newChat() {
    setMessages([]);
    setSessionId(null);
    setError("");
    try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ok */ }
  }

  const suggestionDefs = PAGE_SUGGESTION_KEYS[pageCtx?.page_type ?? "general"] ?? PAGE_SUGGESTION_KEYS.general;
  const suggestions = suggestionDefs.map((s) => cl(copilotLabels, s.key, s.en));
  const isEmpty     = messages.length === 0;
  const pageLabel   = pageCtx?.page_type?.replace(/_/g, " ") ?? "loading…";

  // ── Floating bubble (closed state) ─────────────────────────────────────
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        data-tour="copilot-bubble"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 hover:shadow-xl"
        style={{ background: "linear-gradient(135deg, #2e8b57, #3cb371)" }}
        title="AI Copilot"
      >
        <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        {/* Unread dot if there are messages */}
        {messages.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-white" />
        )}
      </button>
    );
  }

  // ── Minimised bar ──────────────────────────────────────────────────────
  if (minimised) {
    return (
      <div
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg cursor-pointer transition-all hover:shadow-xl"
        style={{ background: "linear-gradient(135deg, #2e8b57, #3cb371)" }}
        onClick={() => setMinimised(false)}
      >
        <span className="text-white text-sm font-semibold">💬 AI Copilot</span>
        {messages.length > 0 && (
          <span className="text-white/70 text-xs">({messages.filter((m) => m.role === "user").length} msgs)</span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); setOpen(false); setMinimised(false); }}
          className="text-white/60 hover:text-white ml-1 text-lg leading-none"
        >
          ×
        </button>
      </div>
    );
  }

  // ── Full chat panel ────────────────────────────────────────────────────
  return (
    <div
      className="fixed z-50 flex flex-col rounded-2xl shadow-2xl overflow-hidden
                 bottom-0 right-0 w-full h-full rounded-none
                 sm:bottom-6 sm:right-6 sm:w-[420px] sm:h-[600px] sm:max-h-[calc(100vh-100px)] sm:rounded-2xl"
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ background: "linear-gradient(135deg, #2e8b57, #3cb371)" }}
      >
        <div className="flex items-center gap-2.5">
          <img src="/logos/ai-icon.png" alt="AI" className="w-7 h-7 rounded-full bg-white p-0.5" />
          <div>
            <span className="font-bold text-white text-sm">AI Copilot</span>
            <span className="ml-1.5 text-white/60 text-xs font-normal">
              {ctxLoading ? "loading…" : pageLabel}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={newChat}
              className="text-white/60 hover:text-white text-xs px-2 py-1 rounded border border-white/20 transition-colors"
            >
              New
            </button>
          )}
          <button
            onClick={() => setMinimised(true)}
            className="text-white/60 hover:text-white text-lg leading-none px-1.5 transition-colors"
            title="Minimise"
          >
            ─
          </button>
          <button
            onClick={() => setOpen(false)}
            className="text-white/60 hover:text-white text-xl leading-none px-1 transition-colors"
            title="Close"
          >
            ×
          </button>
        </div>
      </div>

      {/* ── Page context indicator ──────────────────────────────────────── */}
      {pageCtx && (
        <div className="px-4 py-1.5 text-xs text-gray-400 bg-gray-50 border-b border-gray-100 flex items-center gap-1.5 flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
          <span className="truncate">
            {(() => {
              // For ticker pages, build a localized context line
              if (pageCtx.symbol && pageCtx.company) {
                const viewing = cl(copilotLabels, "copilot_viewing", "Viewing");
                const on = cl(copilotLabels, "copilot_on", "on");
                return `${viewing} ${pageCtx.symbol} (${pageCtx.company}) ${on} ${pageCtx.exchange ?? ""}`;
              }
              const desc = pageCtx.description ?? "";
              return desc.length > 80 ? desc.slice(0, 80) + "…" : desc;
            })()}
          </span>
        </div>
      )}

      {/* ── Message area ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ background: "#fafafa" }}>
        {/* Welcome + suggestions */}
        {isEmpty && (
          <div className="space-y-3">
            <div className="text-center py-3">
              <p className="text-gray-500 text-sm">
                {cl(copilotLabels, "copilot_intro", "I'm your AI research co-pilot. I know what you're looking at on this page.")}
              </p>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1">
                {cl(copilotLabels, "copilot_try_asking", "Try asking")}
              </p>
              {suggestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg border border-gray-200 bg-white hover:border-[#2e8b57] hover:bg-green-50 transition-all text-gray-600 hover:text-[#1a5c38]"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full flex-shrink-0 mr-2 mt-0.5 overflow-hidden bg-white border border-gray-200 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logos/ai-icon.png" alt="AI" className="w-6 h-6 object-contain" />
              </div>
            )}
            <div
              className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-[#2e8b57] text-white rounded-tr-sm"
                  : "bg-white border border-gray-200 text-gray-700 rounded-tl-sm shadow-sm"
              }`}
            >
              {msg.pending ? (
                <span className="flex items-center gap-1.5 text-gray-400">
                  <span className="animate-bounce">●</span>
                  <span className="animate-bounce" style={{ animationDelay: "0.15s" }}>●</span>
                  <span className="animate-bounce" style={{ animationDelay: "0.3s" }}>●</span>
                </span>
              ) : msg.role === "user" ? (
                <span className="text-sm">{msg.content}</span>
              ) : (
                <>
                  <SimpleMarkdown className="text-sm">
                    {msg.content.replace(/\[ACTION:[^\]]+\]/g, "")}
                  </SimpleMarkdown>
                  {/* Smart action buttons from AI response */}
                  {msg.content.includes("[ACTION:ADD_WATCHLIST:") && (() => {
                    const match = msg.content.match(/\[ACTION:ADD_WATCHLIST:([^:]+):([^\]]+)\]/);
                    if (!match) return null;
                    const [, actionTicker, actionExchange] = match;
                    return (
                      <button
                        onClick={() => fetch("/api/watchlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ symbol: actionTicker, exchange: actionExchange }) }).then(() => window.location.reload())}
                        className="mt-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:brightness-110"
                        style={{ background: "#2e8b57" }}>
                        + Add {actionTicker} to watchlist
                      </button>
                    );
                  })()}
                  {msg.content.includes("[ACTION:REGISTER]") && (
                    <div className="mt-2 flex gap-2">
                      <a href="/register"
                        className="inline-block px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:brightness-110"
                        style={{ background: "#fd8412" }}>
                        Register free →
                      </a>
                      <a href="/login"
                        className="inline-block px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:brightness-110"
                        style={{ background: "#2e8b57", color: "#fff" }}>
                        Login
                      </a>
                    </div>
                  )}
                  {msg.content.includes("[ACTION:UPGRADE]") && (
                    <a href="/pricing"
                      className="mt-2 inline-block px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:brightness-110"
                      style={{ background: "#fd8412" }}>
                      View plans →
                    </a>
                  )}
                </>
              )}
              {msg.model && !msg.pending && (
                <div className="mt-1 text-[10px] text-gray-300 text-right">{msg.model}</div>
              )}
            </div>
          </div>
        ))}

        {/* Error */}
        {error && (
          <div className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            ⚠️ {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input area ──────────────────────────────────────────────────── */}
      <div className="border-t border-gray-100 px-3 py-2.5 bg-white flex-shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            disabled={loading}
            placeholder={cl(copilotLabels, "copilot_placeholder", "Ask anything… (Enter to send)")}
            className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-[#2e8b57] focus:ring-1 focus:ring-[#2e8b57] disabled:opacity-50 transition-colors"
            style={{ maxHeight: "80px", lineHeight: "1.4" }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-40"
            style={{ background: loading || !input.trim() ? "#e5e7eb" : "#2e8b57", color: "#fff" }}
          >
            {loading ? (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-1 px-1">
          {cl(copilotLabels, "copilot_disclaimer", "For research only — not financial advice")}
        </p>
      </div>
    </div>
  );
}

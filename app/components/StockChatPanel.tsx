"use client";

/**
 * StockChatPanel — GPT-style conversational AI co-pilot for a stock ticker.
 *
 * - Grounded in TinyFish scan history + live TA signal
 * - Persists history per session (postgres datapai schema)
 * - Remembers user profile across sessions (portfolio, risk, style)
 * - Bilingual: respects lang prop, sends to Python for ZH output
 */

import { useState, useRef, useEffect } from "react";
import SimpleMarkdown from "./SimpleMarkdown";
import { t as tFn, type Lang } from "@/lib/translations";

interface Message {
  role:      "user" | "assistant" | "system";
  content:   string;
  model?:    string;
  pending?:  boolean;
}

interface Props {
  symbol:        string;
  exchange:      string;
  lang?:         Lang;
  /** Pass current TA signal markdown as grounding context */
  taSignalMd?:   string;
  /** Pass latest IR snapshot text as grounding context */
  snapshotText?: string;
}

const SUGGESTED: Record<Lang, string[]> = {
  en: [
    "What does the latest Investor Relations (IR) language change mean for the stock price?",
    "Summarise the key risks mentioned in recent scans",
    "Is this a good entry point based on current technicals?",
    "How does this compare to sector peers?",
  ],
  zh: [
    "最新IR（投资者关系）语言变化对股价意味着什么？",
    "总结近期扫描中提到的主要风险",
    "根据当前技术面，现在是好的入场点吗？",
    "与同行业同类股票相比如何？",
  ],
};

export default function StockChatPanel({
  symbol,
  exchange,
  lang = "en",
  taSignalMd,
  snapshotText,
}: Props) {
  const T = (key: Parameters<typeof tFn>[1]) => tFn(lang, key);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input,    setInput]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showSuggested, setShowSuggested] = useState(true);

  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: "user", content: text.trim() };
    const pending: Message = { role: "assistant", content: "", pending: true };

    setMessages((prev) => [...prev, userMsg, pending]);
    setInput("");
    setLoading(true);
    setError("");
    setShowSuggested(false);

    try {
      const res = await fetch(`/api/ticker/${symbol}/chat/stream`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          message:       text.trim(),
          session_id:    sessionId,
          lang,
          ta_signal_md:  taSignalMd  ?? null,
          snapshot_text: snapshotText ?? null,
        }),
        signal: AbortSignal.timeout(60_000),
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = "";
      let   gotFirstChunk = false;
      let   finalModel    = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines  = buffer.split("\n");
        buffer = lines.pop() ?? "";   // keep incomplete last line

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          let event: Record<string, string>;
          try { event = JSON.parse(line.slice(6)); } catch { continue; }

          if (event.type === "session" && event.session_id && !sessionId) {
            setSessionId(event.session_id);

          } else if (event.type === "chunk" && event.text) {
            if (!gotFirstChunk) {
              // Replace the typing-dots pending message with first real content
              setMessages((prev) =>
                prev.map((m, i) =>
                  i === prev.length - 1
                    ? { role: "assistant", content: event.text, pending: false }
                    : m
                )
              );
              gotFirstChunk = true;
            } else {
              // Append subsequent chunks
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
            throw new Error(event.message ?? "Stream error");
          }
        }
      }
    } catch (err) {
      setMessages((prev) => prev.slice(0, -1)); // remove pending
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
    setShowSuggested(true);
    setError("");
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden flex flex-col" style={{ minHeight: "420px", maxHeight: "680px" }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100" style={{ background: "#f9fafb" }}>
        <div className="flex items-center gap-2.5">
          <span className="text-xl">💬</span>
          <div>
            <span className="font-bold text-[#252525] text-base">
              {lang === "zh" ? "AI研究助手" : "AI Research Co-pilot"}
            </span>
            <span className="ml-2 text-xs text-gray-400 font-normal">
              {symbol} · {lang === "zh" ? "基于TinyFish数据" : "grounded in TinyFish data"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Pipeline pills */}
          <span className="hidden sm:flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 font-medium">
            🐟 TinyFish scan
          </span>
          <span className="hidden sm:flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium">
            ✨ Gemini
          </span>
          {messages.length > 0 && (
            <button
              onClick={newChat}
              className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1 rounded border border-gray-200 transition-colors"
            >
              {lang === "zh" ? "新对话" : "New chat"}
            </button>
          )}
        </div>
      </div>

      {/* ── Message area ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4" style={{ background: "#fafafa" }}>

        {/* Welcome + suggested questions */}
        {isEmpty && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="flex justify-center mb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logos/datapai.png" alt="DataP.ai" className="h-10 object-contain" />
              </div>
              <p className="text-gray-500 text-sm">
                {lang === "zh"
                  ? `询问关于 ${symbol} 的任何问题 — 我了解TinyFish扫描历史、技术信号和IR（投资者关系）语言变化。`
                  : `Ask anything about ${symbol} — I know the TinyFish scan history, technical signals, and Investor Relations (IR) language shifts.`}
              </p>
            </div>
            {showSuggested && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  {lang === "zh" ? "建议问题" : "Suggested questions"}
                </p>
                {SUGGESTED[lang].map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q)}
                    className="w-full text-left text-sm px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:border-[#2e8b57] hover:bg-green-50 transition-all text-gray-600 hover:text-[#1a5c38]"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full flex-shrink-0 mr-2.5 mt-0.5 overflow-hidden bg-white border border-gray-200 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logos/datapai.png" alt="DataP.ai" className="w-6 h-6 object-contain" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
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
                <span>{msg.content}</span>
              ) : (
                <SimpleMarkdown className="text-sm">{msg.content}</SimpleMarkdown>
              )}
              {msg.model && !msg.pending && (
                <div className="mt-1.5 text-[10px] text-gray-300 text-right">{msg.model}</div>
              )}
            </div>
          </div>
        ))}

        {/* Error */}
        {error && (
          <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            ⚠️ {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input area ─────────────────────────────────────────────────────── */}
      <div className="border-t border-gray-100 px-4 py-3 bg-white">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={loading}
            placeholder={
              lang === "zh"
                ? `询问关于 ${symbol} 的问题… (Enter发送)`
                : `Ask about ${symbol}… (Enter to send, Shift+Enter for newline)`
            }
            className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-[#2e8b57] focus:ring-1 focus:ring-[#2e8b57] disabled:opacity-50 transition-colors"
            style={{ maxHeight: "120px", lineHeight: "1.5" }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-40"
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
        <p className="text-[10px] text-gray-300 mt-1.5 px-1">
          {lang === "zh" ? "⚠️ 仅供参考，不构成投资建议" : "⚠️ For research only — not financial advice"}
        </p>
      </div>
    </div>
  );
}

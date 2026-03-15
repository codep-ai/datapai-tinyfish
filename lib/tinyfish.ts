const API_KEY = process.env.TINYFISH_API_KEY!;
const BASE_URL =
  process.env.TINYFISH_BASE_URL || "https://agent.tinyfish.ai";

export interface PageContent {
  title: string;
  text: string;
  finalUrl?: string;
  tinyfishRunRef?: string; // run ID from TinyFish for audit trail
  /** True when content comes from a clean structured API (e.g. ASX JSON).
   *  Scan pipeline uses this to bypass the word-count quality gate. */
  structured_source?: boolean;
}

/**
 * Recursively flatten a JSON object into readable plain text for diffing.
 * e.g. { "Press Releases": [{ "Date": "Feb 1", "Title": "..." }] }
 * → "Press Releases: Date: Feb 1 Title: ..."
 */
function flattenToText(obj: unknown, depth = 0): string {
  if (depth > 10) return "";
  if (typeof obj === "string") return obj;
  if (typeof obj === "number" || typeof obj === "boolean") return String(obj);
  if (Array.isArray(obj)) {
    return obj.map((item) => flattenToText(item, depth + 1)).join(" | ");
  }
  if (obj && typeof obj === "object") {
    return Object.entries(obj as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${flattenToText(v, depth + 1)}`)
      .join(". ");
  }
  return "";
}

/**
 * Parse the TinyFish SSE stream.
 *
 * Actual event sequence observed:
 *   STARTED → STREAMING_URL → PROGRESS... → COMPLETE
 *
 * The content lives in the COMPLETE event under `resultJson` (a structured
 * JSON object). Earlier guesses ("done", "result.text", etc.) were wrong.
 */
async function parseSseStream(
  stream: ReadableStream<Uint8Array>
): Promise<PageContent> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let title = "";
  let tinyfishRunRef: string | undefined;
  let finalUrl: string | undefined;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const jsonStr = line.slice(5).trim();
      if (!jsonStr || jsonStr === "[DONE]") continue;

      try {
        const event = JSON.parse(jsonStr);

        // Capture run reference from STARTED event (audit trail)
        if (event.type === "STARTED") {
          tinyfishRunRef = event.runId ?? event.run_id ?? event.id ?? undefined;
        }

        // Capture final URL from STREAMING_URL event
        if (event.type === "STREAMING_URL") {
          finalUrl = event.url ?? event.finalUrl ?? undefined;
        }

        // ── Primary path: COMPLETE event with resultJson ──────────────────
        if (event.type === "COMPLETE" && event.resultJson) {
          text = flattenToText(event.resultJson).replace(/[ \t]+/g, " ").trim();
          const firstSection = Object.values(event.resultJson)[0];
          if (firstSection && typeof firstSection === "object") {
            const s = firstSection as Record<string, unknown>;
            title = String(s["Company Name"] ?? s["company_name"] ?? "");
          }
        }

        // ── Fallback: plain-text fields from other possible event shapes ──
        if (!text) {
          const candidate =
            event.result?.text ??
            event.result?.content ??
            event.result?.markdown ??
            event.text ??
            event.content ??
            "";
          if (candidate) text = String(candidate).replace(/\s+/g, " ").trim();
          if (!title) title = event.result?.title ?? event.title ?? "";
        }
      } catch {
        // non-JSON SSE data line — skip silently
      }
    }
  }

  return { title, text, finalUrl, tinyfishRunRef };
}

const TINYFISH_TIMEOUT_MS = 90_000; // 90s max per fetch — prevents hung scans

const DEFAULT_GOAL =
  "Extract all visible text content from this page, including news releases, press releases, headlines, dates, and any company announcements. Return as structured data.";

async function callTinyFish(url: string, goal?: string): Promise<PageContent> {
  const endpoint = `${BASE_URL}/v1/automation/run-sse`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TINYFISH_TIMEOUT_MS);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY,
      },
      body: JSON.stringify({
        url,
        goal: goal ?? DEFAULT_GOAL,
        proxy_config: { enabled: false },
      }),
      signal: ctrl.signal,
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`TinyFish error ${res.status}: ${errBody}`);
    }

    if (!res.body) {
      throw new Error("TinyFish returned no response body");
    }

    return await parseSseStream(res.body);
  } finally {
    clearTimeout(timer);
  }
}

// ─── Public entry point ───────────────────────────────────────────────────────

/**
 * Fetch page content via TinyFish browser automation.
 *
 * @param url   The URL to crawl
 * @param goal  Optional extraction goal / prompt sent to TinyFish. When
 *              omitted the default "extract all visible text" goal is used.
 *              Supply a specific, structured goal for market intel use-cases
 *              (e.g. "Extract top 15 news headlines with dates and summaries…").
 */
export async function fetchPageText(url: string, goal?: string): Promise<PageContent> {
  // All URLs — use TinyFish browser automation
  try {
    return await callTinyFish(url, goal);
  } catch (err) {
    // Don't retry on timeout/abort — it would just hang again for another 90s
    if (err instanceof Error && err.name === "AbortError") throw err;
    console.warn(`TinyFish retry for ${url}:`, err);
    return await callTinyFish(url, goal);
  }
}

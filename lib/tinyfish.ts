const API_KEY = process.env.TINYFISH_API_KEY!;
const BASE_URL = process.env.TINYFISH_BASE_URL || "https://api.tinyfish.io";

export interface PageContent {
  title: string;
  text: string;
}

async function callTinyFish(url: string): Promise<PageContent> {
  const res = await fetch(`${BASE_URL}/v1/scrape`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ url, render_js: true }),
  });

  if (!res.ok) {
    throw new Error(`TinyFish error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const title: string = data.title ?? "";
  const rawText: string = data.text ?? data.content ?? data.markdown ?? "";

  // Normalize whitespace
  const text = rawText.replace(/\s+/g, " ").trim();

  return { title, text };
}

export async function fetchPageText(url: string): Promise<PageContent> {
  try {
    return await callTinyFish(url);
  } catch (err) {
    // Retry once
    console.warn(`TinyFish retry for ${url}:`, err);
    return await callTinyFish(url);
  }
}

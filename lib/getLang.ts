/**
 * lib/getLang.ts  —  server-side language resolution
 * Reads the `lang` cookie (set by LangToggle) and returns "en" | "zh".
 * Defaults to "en".
 */
import { cookies } from "next/headers";
import type { Lang } from "./translations";

export async function getLang(): Promise<Lang> {
  const jar = await cookies();
  const val = jar.get("lang")?.value;
  return val === "zh" ? "zh" : "en";
}

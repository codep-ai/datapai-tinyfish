/**
 * SimpleMarkdown.tsx
 * Lightweight markdown-to-JSX renderer for AI signal output.
 * Handles: headings, bold, blockquotes, tables, lists, hr, code, links.
 * No external dependencies — purpose-built for the TinyFish AI signal format.
 */

"use client";

import React from "react";

interface Props {
  children: string;
  /** CSS class applied to the outer wrapper div */
  className?: string;
}

export default function SimpleMarkdown({ children, className = "" }: Props) {
  const html = markdownToHtml(children ?? "");
  return (
    <div
      className={`simple-md ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
      style={{
        fontFamily: "inherit",
        lineHeight: 1.65,
        color: "inherit",
      }}
    />
  );
}

// ─── Converter ────────────────────────────────────────────────────────────────

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function inlineFormat(text: string): string {
  return escape(text)
    // Bold + italic ***text***
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    // Bold **text**
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // Italic *text* (not preceded by another *)
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>")
    // Inline code `code`
    .replace(/`([^`]+)`/g, '<code style="background:#f3f4f6;padding:1px 5px;border-radius:3px;font-size:0.88em;font-family:monospace">$1</code>')
    // Links [text](url)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#6366f1;text-decoration:underline">$1</a>');
}

function markdownToHtml(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let inTable = false;
  let inBlockquote = false;
  let inList = false;
  let inCode = false;

  function flushBlockquote() {
    if (inBlockquote) {
      out.push("</blockquote>");
      inBlockquote = false;
    }
  }
  function flushList() {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  }
  function flushTable() {
    if (inTable) {
      out.push("</tbody></table>");
      inTable = false;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trimEnd();

    // ── Code fence ────────────────────────────────────────────────────────
    if (line.startsWith("```")) {
      flushBlockquote(); flushList(); flushTable();
      if (inCode) {
        out.push("</code></pre>");
        inCode = false;
      } else {
        out.push('<pre style="background:#1e1e2e;color:#cdd6f4;padding:12px 16px;border-radius:8px;overflow-x:auto;font-size:0.85em;line-height:1.5"><code>');
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      out.push(escape(line));
      continue;
    }

    // ── Horizontal rule ───────────────────────────────────────────────────
    if (/^---+$/.test(line.trim())) {
      flushBlockquote(); flushList(); flushTable();
      out.push('<hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0">');
      continue;
    }

    // ── Headings ──────────────────────────────────────────────────────────
    const h4 = line.match(/^####\s+(.+)/);
    const h3 = line.match(/^###\s+(.+)/);
    const h2 = line.match(/^##\s+(.+)/);
    const h1 = line.match(/^#\s+(.+)/);
    if (h1 || h2 || h3 || h4) {
      flushBlockquote(); flushList(); flushTable();
      if (h1) out.push(`<h2 style="font-size:1.35em;font-weight:800;margin:20px 0 8px;color:#111">${inlineFormat(h1[1])}</h2>`);
      else if (h2) out.push(`<h3 style="font-size:1.18em;font-weight:700;margin:16px 0 6px;color:#1f2937">${inlineFormat(h2[1])}</h3>`);
      else if (h3) out.push(`<h4 style="font-size:1.05em;font-weight:700;margin:14px 0 5px;color:#374151">${inlineFormat(h3[1])}</h4>`);
      else if (h4) out.push(`<h5 style="font-size:0.95em;font-weight:700;margin:12px 0 4px;color:#4b5563">${inlineFormat(h4[1])}</h5>`);
      continue;
    }

    // ── Blockquote ────────────────────────────────────────────────────────
    if (line.startsWith("> ") || line === ">") {
      flushList(); flushTable();
      const content = line.startsWith("> ") ? line.slice(2) : "";
      if (!inBlockquote) {
        out.push('<blockquote style="border-left:3px solid #fd8412;margin:12px 0;padding:10px 14px;background:#fffbf3;border-radius:0 6px 6px 0;color:#78350f;font-size:0.9em">');
        inBlockquote = true;
      }
      out.push(`<p style="margin:2px 0">${inlineFormat(content)}</p>`);
      continue;
    }
    if (inBlockquote && line.trim() === "") {
      flushBlockquote();
      out.push('<div style="margin:6px 0"></div>');
      continue;
    }
    if (inBlockquote) {
      // continuation line in blockquote
      out.push(`<p style="margin:2px 0">${inlineFormat(line)}</p>`);
      continue;
    }

    // ── Table ─────────────────────────────────────────────────────────────
    if (line.startsWith("|") && line.endsWith("|")) {
      flushList();
      const cells = line.slice(1, -1).split("|").map((c) => c.trim());

      // Detect separator row (| --- | --- |)
      const isSep = cells.every((c) => /^:?-+:?$/.test(c));
      if (isSep) {
        // Already opened thead — close it, open tbody
        if (inTable) {
          out.push("</tr></thead><tbody>");
        }
        continue;
      }

      if (!inTable) {
        out.push(
          '<div style="overflow-x:auto;margin:12px 0"><table style="width:100%;border-collapse:collapse;font-size:0.88em">' +
          "<thead>"
        );
        inTable = true;
        // First row = header
        const thCells = cells.map((c) =>
          `<th style="padding:7px 10px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:700;text-align:left;white-space:nowrap">${inlineFormat(c)}</th>`
        ).join("");
        out.push(`<tr>${thCells}`);
      } else {
        const tdCells = cells.map((c) => {
          // Colour signal cells
          const style = "padding:6px 10px;border:1px solid #e2e8f0;white-space:nowrap";
          const content = inlineFormat(c);
          return `<td style="${style}">${content}</td>`;
        }).join("");
        out.push(`<tr>${tdCells}</tr>`);
      }
      continue;
    }
    if (inTable && !line.startsWith("|")) {
      flushTable();
      out.push("</div>");
    }

    // ── List item ─────────────────────────────────────────────────────────
    const listMatch = line.match(/^[-*+]\s+(.+)/);
    if (listMatch) {
      flushBlockquote(); flushTable();
      if (!inList) {
        out.push('<ul style="margin:8px 0;padding-left:20px;list-style:none">');
        inList = true;
      }
      out.push(`<li style="margin:3px 0;display:flex;gap:6px"><span style="color:#fd8412;flex-shrink:0">•</span><span>${inlineFormat(listMatch[1])}</span></li>`);
      continue;
    }
    if (inList && !listMatch) {
      flushList();
    }

    // ── Empty line ────────────────────────────────────────────────────────
    if (line.trim() === "") {
      flushBlockquote();
      if (!inList && !inTable) {
        out.push('<div style="margin:6px 0"></div>');
      }
      continue;
    }

    // ── Paragraph ─────────────────────────────────────────────────────────
    out.push(`<p style="margin:4px 0">${inlineFormat(line)}</p>`);
  }

  // Flush any open blocks
  flushBlockquote();
  flushList();
  flushTable();
  if (inCode) out.push("</code></pre>");

  return out.join("\n");
}

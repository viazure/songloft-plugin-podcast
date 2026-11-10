/**
 * OPML 2.0 export for subscriptions.
 *
 * Output is intentionally flat (one <outline> per feed) so that other podcast
 * apps import it without needing folder handling. All attribute values are
 * XML-escaped; the produced document round-trips through `parseOpml`.
 */

import type { Subscription } from "./store";

/** Escape the five XML predefined entities. */
export function escapeXmlAttr(value: string): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export type OpmlExportFeed = { title: string; url: string };

export function buildOpml(
  subscriptions: Array<Pick<Subscription, "title" | "url"> | OpmlExportFeed>,
  options: { title?: string; dateCreated?: Date } = {}
): string {
  const title = options.title || "Songloft 播客订阅";
  const now = options.dateCreated || new Date();
  const feeds: OpmlExportFeed[] = [];
  const seen = new Set<string>();

  for (const sub of subscriptions || []) {
    const url = typeof sub?.url === "string" ? sub.url.trim() : "";
    if (!url) continue;
    const key = url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const rawTitle = typeof sub?.title === "string" ? sub.title.trim() : "";
    feeds.push({ title: rawTitle || url, url });
  }

  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<opml version="2.0">');
  lines.push("  <head>");
  lines.push(`    <title>${escapeXmlAttr(title)}</title>`);
  lines.push(`    <dateCreated>${escapeXmlAttr(now.toUTCString())}</dateCreated>`);
  lines.push("  </head>");
  lines.push("  <body>");
  for (const feed of feeds) {
    lines.push(
      `    <outline type="rss" text="${escapeXmlAttr(feed.title)}" title="${escapeXmlAttr(
        feed.title
      )}" xmlUrl="${escapeXmlAttr(feed.url)}" />`
    );
  }
  lines.push("  </body>");
  lines.push("</opml>");
  return lines.join("\n") + "\n";
}

/** `songloft-podcasts-20261109.opml` */
export function opmlExportFilename(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `songloft-podcasts-${y}${m}${d}.opml`;
}

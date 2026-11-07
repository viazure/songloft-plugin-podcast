/**
 * Generic OPML 2.0 subscription outline parser (Architect contract).
 *
 * Spec: http://2005.opml.org/spec2.html
 * - Subscription node needs type + text + xmlUrl; type value is case-insensitive (Notes 3).
 * - Attribute *names* are case-sensitive (xmlurl ≠ xmlUrl).
 * - No vendor forks (Xiaoyuzhou / Moon FM): optional metadata faults → warnings only.
 *
 * Product limits (reject whole file when exceeded):
 * - MAX_OPML_BYTES = 2 MiB
 * - MAX_OPML_NODES = 5000
 * - MAX_OPML_DEPTH = 32
 * - MAX_OPML_FEEDS = 500
 *
 * Security: reject DOCTYPE / ENTITY / external SYSTEM|PUBLIC; no network; no include/link expansion.
 * Entities: decode standard XML predefined + numeric character refs once; no HTML-only entities; display as plain text.
 */

import { normalizeFeedUrl } from "./hash";

/** Product limits — documented for Review / ops. */
export const MAX_OPML_BYTES = 2 * 1024 * 1024;
export const MAX_OPML_NODES = 5000;
export const MAX_OPML_DEPTH = 32;
export const MAX_OPML_FEEDS = 500;

export type OpmlDiagCode =
  | "missing_text"
  | "missing_type"
  | "missing_xmlUrl"
  | "bad_type"
  | "bad_xmlUrl"
  | "bad_htmlUrl"
  | "bad_date"
  | "duplicate_in_file"
  | "ignored_include"
  | "ignored_link"
  | "skipped_non_rss";

export interface OpmlDiagnostic {
  code: OpmlDiagCode;
  message: string;
  /** 1-based outline encounter index when applicable. */
  outlineIndex?: number;
  feedUrl?: string;
}

export interface OpmlCandidate {
  feedUrl: string;
  /** Original xmlUrl attribute after one XML entity decode (trimmed ends only). */
  originalUrl: string;
  title: string;
  folderPath: string[];
  warnings: OpmlDiagnostic[];
}

export interface OpmlParseOk {
  ok: true;
  documentTitle: string | null;
  candidates: OpmlCandidate[];
  /** Nodes that did not become candidates (required-field / bad URL / non-rss with xmlUrl attempt, etc.). */
  skipped: Array<{ outlineIndex: number; reasons: OpmlDiagnostic[]; folderPath: string[] }>;
  warnings: OpmlDiagnostic[];
  stats: {
    outlineNodes: number;
    candidateCount: number;
    skippedCount: number;
    maxDepthSeen: number;
  };
}

export interface OpmlParseFail {
  ok: false;
  reason: string;
}

export type OpmlParseResult = OpmlParseOk | OpmlParseFail;

export type OpmlPreviewStatus = "new" | "duplicate_existing" | "duplicate_in_file" | "invalid";

export interface OpmlPreviewItem {
  status: OpmlPreviewStatus;
  feedUrl?: string;
  title?: string;
  folderPath?: string[];
  warnings: OpmlDiagnostic[];
  errors: OpmlDiagnostic[];
  existingTitle?: string;
}

export interface OpmlPreviewResult {
  ok: true;
  documentTitle: string | null;
  items: OpmlPreviewItem[];
  summary: {
    total: number;
    neu: number;
    duplicate: number;
    invalid: number;
    warningOnly: number;
  };
  fileWarnings: OpmlDiagnostic[];
}

const PREDEFINED: Record<string, string> = {
  lt: "<",
  gt: ">",
  amp: "&",
  quot: '"',
  apos: "'",
};

/** Decode XML predefined + numeric character references once. No HTML-named entities. */
export function decodeXmlEntities(input: string): string {
  return String(input || "").replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (full, body: string) => {
    if (body[0] === "#") {
      const n =
        body[1] === "x" || body[1] === "X"
          ? parseInt(body.slice(2), 16)
          : parseInt(body.slice(1), 10);
      if (!Number.isFinite(n) || n < 0 || n > 0x10ffff) return full;
      try {
        return String.fromCodePoint(n);
      } catch {
        return full;
      }
    }
    return Object.prototype.hasOwnProperty.call(PREDEFINED, body) ? PREDEFINED[body] : full;
  });
}

function rejectUnsafeXml(xml: string): string | null {
  if (/<!DOCTYPE/i.test(xml)) return "拒绝 DOCTYPE（产品安全限制）";
  if (/<!ENTITY/i.test(xml)) return "拒绝 ENTITY 声明（产品安全限制）";
  // External DTD / entity loader hints even without full DOCTYPE block
  if (/<!\[INCLUDE/i.test(xml) || /<!\[IGNORE/i.test(xml)) return "拒绝条件段（产品安全限制）";
  return null;
}

/** Case-sensitive attribute map from an outline open tag's inner attribute text. */
export function parseAttributesCaseSensitive(attrText: string): Record<string, string> {
  const out: Record<string, string> = {};
  const s = String(attrText || "");
  let i = 0;
  while (i < s.length) {
    while (i < s.length && /\s/.test(s[i])) i++;
    if (i >= s.length) break;
    const nameStart = i;
    while (i < s.length && /[A-Za-z0-9_:-]/.test(s[i])) i++;
    if (i === nameStart) {
      i++;
      continue;
    }
    const name = s.slice(nameStart, i);
    while (i < s.length && /\s/.test(s[i])) i++;
    if (s[i] !== "=") continue;
    i++;
    while (i < s.length && /\s/.test(s[i])) i++;
    let value = "";
    if (s[i] === '"' || s[i] === "'") {
      const q = s[i++];
      const vStart = i;
      while (i < s.length && s[i] !== q) i++;
      value = s.slice(vStart, i);
      if (i < s.length && s[i] === q) i++;
    } else {
      const vStart = i;
      while (i < s.length && !/\s/.test(s[i])) i++;
      value = s.slice(vStart, i);
    }
    // First wins if duplicated
    if (!Object.prototype.hasOwnProperty.call(out, name)) {
      out[name] = decodeXmlEntities(value);
    }
  }
  return out;
}

function isHttpUrl(raw: string): { ok: true; url: URL } | { ok: false; reason: string } {
  const t = String(raw || "").trim();
  if (!t) return { ok: false, reason: "空 URL" };
  let u: URL;
  try {
    u = new URL(t);
  } catch {
    return { ok: false, reason: "URL 无法解析" };
  }
  const proto = u.protocol.toLowerCase();
  if (proto !== "http:" && proto !== "https:") {
    return { ok: false, reason: `拒绝 scheme ${u.protocol}` };
  }
  if (u.username || u.password) {
    return { ok: false, reason: "拒绝内嵌用户名/密码" };
  }
  if (!u.hostname) return { ok: false, reason: "缺少主机名" };
  return { ok: true, url: u };
}

function displayName(attrs: Record<string, string>, fallbackUrl: string): string {
  const title = typeof attrs.title === "string" ? attrs.title.trim() : "";
  if (title) return title;
  const text = typeof attrs.text === "string" ? attrs.text.trim() : "";
  if (text) return text;
  return fallbackUrl;
}

function folderLabel(attrs: Record<string, string>): string {
  const text = typeof attrs.text === "string" ? attrs.text.trim() : "";
  if (text) return text;
  const title = typeof attrs.title === "string" ? attrs.title.trim() : "";
  if (title) return title;
  return "folder";
}

interface OutlineToken {
  kind: "open" | "self" | "close";
  attrs: Record<string, string>;
  raw: string;
}

/**
 * Tokenize outline / include / link tags with quote-aware scanning (newlines inside attrs OK).
 */
function tokenizeOutlines(xml: string): { tokens: OutlineToken[]; nodeCount: number; error?: string } {
  const tokens: OutlineToken[] = [];
  let nodeCount = 0;
  let i = 0;
  const lower = xml; // scan original for case-sensitive attr names inside tags
  while (i < lower.length) {
    const lt = lower.indexOf("<", i);
    if (lt < 0) break;
    // close outline
    if (lower.slice(lt, lt + 10).toLowerCase() === "</outline>") {
      tokens.push({ kind: "close", attrs: {}, raw: lower.slice(lt, lt + 10) });
      i = lt + 10;
      continue;
    }
    const slice4 = lower.slice(lt, lt + 8).toLowerCase();
    const isOutline = slice4 === "<outline";
    const isInclude = lower.slice(lt, lt + 8).toLowerCase() === "<include";
    const isLink = lower.slice(lt, lt + 5).toLowerCase() === "<link" && /[\s>/]/.test(lower[lt + 5] || "");
    if (!isOutline && !isInclude && !isLink) {
      i = lt + 1;
      continue;
    }
    // Find end of start tag respecting quotes
    let j = lt + 1;
    let quote: '"' | "'" | null = null;
    while (j < lower.length) {
      const c = lower[j];
      if (quote) {
        if (c === quote) quote = null;
        j++;
        continue;
      }
      if (c === '"' || c === "'") {
        quote = c as '"' | "'";
        j++;
        continue;
      }
      if (c === ">") {
        break;
      }
      j++;
    }
    if (j >= lower.length) return { tokens, nodeCount, error: "标签未闭合" };
    const full = lower.slice(lt, j + 1);
    nodeCount++;
    if (nodeCount > MAX_OPML_NODES) {
      return { tokens, nodeCount, error: `节点数超过产品限制 ${MAX_OPML_NODES}` };
    }
    const selfClosing = /\/>\s*$/.test(full);
    if (isInclude) {
      tokens.push({ kind: selfClosing ? "self" : "open", attrs: { __tag: "include" }, raw: full });
      i = j + 1;
      continue;
    }
    if (isLink) {
      tokens.push({ kind: selfClosing ? "self" : "open", attrs: { __tag: "link" }, raw: full });
      i = j + 1;
      continue;
    }
    // outline — strip <outline and trailing >
    let inner = full.replace(/^<outline\b/i, "").replace(/\/?>\s*$/, "");
    const attrs = parseAttributesCaseSensitive(inner);
    tokens.push({ kind: selfClosing ? "self" : "open", attrs, raw: full });
    i = j + 1;
  }
  return { tokens, nodeCount };
}

function headDateWarnings(xml: string): OpmlDiagnostic[] {
  const warnings: OpmlDiagnostic[] = [];
  const head = xml.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i);
  if (!head) return warnings;
  for (const tag of ["dateCreated", "dateModified"] as const) {
    const m = head[1].match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
    if (!m) continue;
    const raw = decodeXmlEntities(m[1].replace(/<[^>]+>/g, "")).trim();
    if (!raw) continue;
    // OPML 2.0 dates are RFC 822; ISO-8601 is a common deviation → warning only
    const asDate = Date.parse(raw);
    const looksRfc822 = /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)/i.test(raw);
    if (!Number.isFinite(asDate)) {
      warnings.push({ code: "bad_date", message: `head/${tag} 无法解析：${raw.slice(0, 80)}` });
    } else if (!looksRfc822 && /^\d{4}-\d{2}-\d{2}/.test(raw)) {
      warnings.push({
        code: "bad_date",
        message: `head/${tag} 使用 ISO-8601 而非 RFC 822（已容忍）：${raw.slice(0, 80)}`,
      });
    }
  }
  return warnings;
}

function documentTitleOf(xml: string): string | null {
  const head = xml.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i);
  if (!head) return null;
  const tm = head[1].match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  if (!tm) return null;
  const t = decodeXmlEntities(tm[1].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
  return t || null;
}

/**
 * Pure offline OPML → candidates + diagnostics. No I/O / no host APIs.
 */
export function parseOpml(xmlRaw: string): OpmlParseResult {
  if (xmlRaw == null) return { ok: false, reason: "空 OPML" };
  const xml = String(xmlRaw);
  if (!xml.trim()) return { ok: false, reason: "空 OPML" };
  if (xml.length > MAX_OPML_BYTES) {
    return { ok: false, reason: `文件超过产品限制 ${MAX_OPML_BYTES} 字节` };
  }
  const unsafe = rejectUnsafeXml(xml);
  if (unsafe) return { ok: false, reason: unsafe };
  if (!/<opml\b/i.test(xml)) return { ok: false, reason: "不是 OPML 文档" };

  const { tokens, nodeCount, error } = tokenizeOutlines(xml);
  if (error) return { ok: false, reason: error };

  const fileWarnings = headDateWarnings(xml);
  const candidates: OpmlCandidate[] = [];
  const skipped: OpmlParseOk["skipped"] = [];
  const seenNorm = new Map<string, string>(); // norm → first original
  const folderStack: string[] = [];
  let depth = 0;
  let maxDepthSeen = 0;
  let outlineIndex = 0;

  const pushFolder = (label: string) => {
    depth++;
    maxDepthSeen = Math.max(maxDepthSeen, depth);
    if (depth > MAX_OPML_DEPTH) {
      return `嵌套深度超过产品限制 ${MAX_OPML_DEPTH}`;
    }
    folderStack.push(label);
    return null;
  };

  for (const tok of tokens) {
    if (tok.attrs.__tag === "include") {
      fileWarnings.push({ code: "ignored_include", message: "忽略 <include>，不展开、不访问" });
      continue;
    }
    if (tok.attrs.__tag === "link") {
      fileWarnings.push({ code: "ignored_link", message: "忽略 <link>，不展开、不访问" });
      continue;
    }

    if (tok.kind === "close") {
      if (folderStack.length) folderStack.pop();
      if (depth > 0) depth--;
      continue;
    }

    outlineIndex++;
    const attrs = tok.attrs;
    const folderPath = folderStack.slice();
    const hasXmlUrlKey = Object.prototype.hasOwnProperty.call(attrs, "xmlUrl");
    const xmlUrlRaw = hasXmlUrlKey ? String(attrs.xmlUrl ?? "") : "";
    const hasText = Object.prototype.hasOwnProperty.call(attrs, "text");
    const hasType = Object.prototype.hasOwnProperty.call(attrs, "type");
    const typeRaw = hasType ? String(attrs.type ?? "") : "";
    const typeLower = typeRaw.trim().toLowerCase();

    // include-like type or unknown: if no xmlUrl and not rss, treat as folder when open
      hasXmlUrlKey || typeLower === "rss" || hasType;

    if (!hasXmlUrlKey && typeLower !== "rss") {
      // Folder / grouping node (or empty)
      if (tok.kind === "open") {
        const err = pushFolder(folderLabel(attrs));
        if (err) return { ok: false, reason: err };
      }
      // self-closing non-feed without xmlUrl: ignore quietly (no candidate)
      continue;
    }

    // Feed-shaped node: enforce required fields per OPML 2.0 subscription outline
    const reasons: OpmlDiagnostic[] = [];
    const warnings: OpmlDiagnostic[] = [];

    if (!hasText) {
      reasons.push({
        code: "missing_text",
        message: "缺少必需属性 text",
        outlineIndex,
      });
    }
    if (!hasType) {
      reasons.push({
        code: "missing_type",
        message: "缺少必需属性 type（不猜测 RSS）",
        outlineIndex,
      });
    } else if (typeLower !== "rss") {
      reasons.push({
        code: "bad_type",
        message: `type 不是 rss：${typeRaw.slice(0, 40)}`,
        outlineIndex,
      });
    }
    if (!hasXmlUrlKey) {
      reasons.push({
        code: "missing_xmlUrl",
        message: "缺少必需属性 xmlUrl（大小写敏感，xmlurl 无效）",
        outlineIndex,
      });
    }

    // htmlUrl optional dirty values → warning
    if (Object.prototype.hasOwnProperty.call(attrs, "htmlUrl")) {
      const h = String(attrs.htmlUrl ?? "").trim();
      if (!h || h === "null" || h === "undefined") {
        warnings.push({
          code: "bad_htmlUrl",
          message: `htmlUrl 脏值已忽略：${JSON.stringify(attrs.htmlUrl)}`,
          outlineIndex,
        });
      } else {
        const hu = isHttpUrl(h);
        if (!hu.ok) {
          warnings.push({
            code: "bad_htmlUrl",
            message: `htmlUrl 无效：${hu.reason}`,
            outlineIndex,
          });
        }
      }
    }

    let originalUrl = "";
    let feedUrl = "";
    if (hasXmlUrlKey) {
      originalUrl = xmlUrlRaw.trim(); // trim ends only; do not reorder/decode further
      const checked = isHttpUrl(originalUrl);
      if (!checked.ok) {
        reasons.push({
          code: "bad_xmlUrl",
          message: `xmlUrl 无效：${checked.reason}`,
          outlineIndex,
          feedUrl: originalUrl || undefined,
        });
      } else {
        // Preserve original string (trimmed); normalization only for dedup keys later
        feedUrl = originalUrl;
      }
    }

    if (reasons.length) {
      skipped.push({ outlineIndex, reasons: reasons.concat(warnings), folderPath });
      if (tok.kind === "open") {
        // Still track nesting if it opened a container despite bad feed attrs
        const err = pushFolder(folderLabel(attrs));
        if (err) return { ok: false, reason: err };
      }
      continue;
    }

    const title = displayName(attrs, feedUrl);
    const norm = normalizeFeedUrl(feedUrl);
    if (seenNorm.has(norm)) {
      warnings.push({
        code: "duplicate_in_file",
        message: `与文件内先前条目重复（规范化后相同）：${seenNorm.get(norm)}`,
        outlineIndex,
        feedUrl,
      });
      const dupReasons: OpmlDiagnostic[] = [
        {
          code: "duplicate_in_file",
          message: "本批重复，不进入候选",
          outlineIndex,
          feedUrl,
        },
        ...warnings,
      ];
      skipped.push({
        outlineIndex,
        reasons: dupReasons,
        folderPath,
      });
      if (tok.kind === "open") {
        const err = pushFolder(title);
        if (err) return { ok: false, reason: err };
      }
      continue;
    }
    seenNorm.set(norm, feedUrl);

    if (candidates.length >= MAX_OPML_FEEDS) {
      return { ok: false, reason: `订阅候选超过产品限制 ${MAX_OPML_FEEDS}` };
    }

    candidates.push({
      feedUrl,
      originalUrl: feedUrl,
      title,
      folderPath,
      warnings,
    });

    if (tok.kind === "open") {
      // Rare: rss outline with children — keep path for nested outlines
      const err = pushFolder(title);
      if (err) return { ok: false, reason: err };
    }
  }

  return {
    ok: true,
    documentTitle: documentTitleOf(xml),
    candidates,
    skipped,
    warnings: fileWarnings,
    stats: {
      outlineNodes: outlineIndex,
      candidateCount: candidates.length,
      skippedCount: skipped.length,
      maxDepthSeen,
    },
  };
}

export interface ExistingSub {
  url: string;
  title: string;
}

/**
 * Classify parse result against already-saved subscriptions (still offline).
 */
export function previewOpmlAgainstExisting(
  parsed: OpmlParseOk,
  existing: ExistingSub[]
): OpmlPreviewResult {
  const items: OpmlPreviewItem[] = [];
  let neu = 0;
  let duplicate = 0;
  let invalid = 0;
  let warningOnly = 0;

  for (const s of parsed.skipped) {
    const isDup = s.reasons.some((r) => r.code === "duplicate_in_file");
    invalid += isDup ? 0 : 1;
    if (isDup) duplicate += 1;
    items.push({
      status: isDup ? "duplicate_in_file" : "invalid",
      feedUrl: s.reasons.find((r) => r.feedUrl)?.feedUrl,
      folderPath: s.folderPath,
      warnings: s.reasons.filter((r) =>
        r.code === "bad_htmlUrl" || r.code === "bad_date" || r.code === "duplicate_in_file"
      ),
      errors: s.reasons.filter(
        (r) =>
          r.code !== "bad_htmlUrl" &&
          r.code !== "bad_date" &&
          r.code !== "duplicate_in_file"
      ),
    });
  }

  for (const c of parsed.candidates) {
    const hit = existing.find(
      (e) =>
        normalizeFeedUrl(e.url) === normalizeFeedUrl(c.feedUrl) ||
        e.url.trim() === c.feedUrl.trim()
    );
    if (hit) {
      duplicate += 1;
      items.push({
        status: "duplicate_existing",
        feedUrl: c.feedUrl,
        title: c.title,
        folderPath: c.folderPath,
        warnings: c.warnings,
        errors: [],
        existingTitle: hit.title,
      });
      if (c.warnings.length) warningOnly += 1;
    } else {
      neu += 1;
      items.push({
        status: "new",
        feedUrl: c.feedUrl,
        title: c.title,
        folderPath: c.folderPath,
        warnings: c.warnings,
        errors: [],
      });
      if (c.warnings.length) warningOnly += 1;
    }
  }

  return {
    ok: true,
    documentTitle: parsed.documentTitle,
    items,
    summary: {
      total: items.length,
      neu,
      duplicate,
      invalid,
      warningOnly,
    },
    fileWarnings: parsed.warnings,
  };
}

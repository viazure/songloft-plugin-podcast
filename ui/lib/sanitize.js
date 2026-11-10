/**
 * ShowNote HTML sanitizer — pure string transform, no DOM APIs.
 *
 * Two layers use this:
 *  - `src/rss.ts` sanitizes feed content before it is stored;
 *  - `ui/lib/sanitize.js` re-sanitizes before any `innerHTML` assignment,
 *    because storage may still hold rows written by older, weaker versions.
 *
 * Policy
 *  - Allowlist of formatting tags only; everything else is dropped (not escaped),
 *    so leftovers can never reassemble into a live element.
 *  - No attributes are preserved except `img[src|alt]` and `a[href]`, and both
 *    must be absolute http(s). `javascript:`, `data:`, `vbscript:`, `file:` are
 *    rejected, as are all `on*` handlers, `style`, `srcset`, `xlink:*`.
 *  - Text segments get `<` and `>` escaped, so stray brackets stay inert.
 */

export const SHOW_NOTE_ALLOWED_TAGS = [
  "p",
  "br",
  "a",
  "img",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "code",
  "pre",
  "hr",
  "span",
  "div",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
];

const ALLOWED = new Set(SHOW_NOTE_ALLOWED_TAGS);
const VOID_TAGS = new Set(["br", "hr", "img"]);
const DROPPED_WITH_CONTENT = ["script", "style", "iframe", "object", "embed", "template", "svg", "math"];

/** Only absolute http(s) URLs are linkable / embeddable. */
export function isSafeHttpUrl(value) {
  const raw = String(value == null ? "" : value).trim();
  if (!raw) return false;
  // Reject any scheme other than http(s) before normalising.
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw) && !/^https?:/i.test(raw)) return false;
  if (!/^https?:\/\/[^\s]+/i.test(raw)) return false;
  // Control characters / quotes would break out of the attribute.
  if (/[\u0000-\u001f\u007f"'<>`\\]/.test(raw)) return false;
  return true;
}

function escapeText(value) {
  return String(value).replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Read one attribute from a raw attribute string (last occurrence wins). */
function readAttr(attrs, name) {
  const re = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s"'>]+))`, "gi");
  let out = "";
  let m;
  while ((m = re.exec(attrs)) !== null) {
    out = m[2] != null ? m[2] : m[3] != null ? m[3] : m[4] || "";
  }
  return out;
}

/** Drop `<script>…</script>`-style blocks including their bodies. */
function stripDangerousBlocks(html) {
  let out = String(html || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1");
  out = out.replace(/<!--[\s\S]*?-->/g, "");
  for (const tag of DROPPED_WITH_CONTENT) {
    const paired = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?</${tag}\\s*>`, "gi");
    out = out.replace(paired, "");
    // Self-closing / unclosed variants.
    out = out.replace(new RegExp(`</?${tag}\\b[^>]*>`, "gi"), "");
  }
  return out;
}

/**
 * Sanitize untrusted HTML for display inside ShowNote.
 * @param {string} raw
 * @returns {string} safe HTML (may be an empty string)
 */
export function sanitizeShowNote(raw) {
  const input = stripDangerousBlocks(raw);

  // Split into tags and text so text can be escaped independently.
  const parts = [];
  const tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9:-]*)((?:\s+(?:[^<>"']|"[^"]*"|'[^']*')*)?)(\/?)>/g;
  let last = 0;
  let m;

  while ((m = tagRe.exec(input)) !== null) {
    if (m.index > last) parts.push({ text: input.slice(last, m.index) });
    parts.push({ closing: m[1] === "/", name: m[2].toLowerCase(), attrs: m[3] || "" });
    last = m.index + m[0].length;
  }
  if (last < input.length) parts.push({ text: input.slice(last) });

  const out = [];
  for (const part of parts) {
    if (part.text !== undefined) {
      out.push(escapeText(part.text));
      continue;
    }

    const { name } = part;
    if (!ALLOWED.has(name)) continue; // dropped entirely, attributes included

    if (part.closing) {
      if (!VOID_TAGS.has(name)) out.push(`</${name}>`);
      continue;
    }

    if (name === "br" || name === "hr") {
      out.push(`<${name} />`);
      continue;
    }

    if (name === "img") {
      const src = readAttr(part.attrs, "src");
      if (!isSafeHttpUrl(src)) continue;
      const alt = readAttr(part.attrs, "alt");
      out.push(`<img src="${escapeAttr(src.trim())}" alt="${escapeAttr(alt)}" loading="lazy" />`);
      continue;
    }

    if (name === "a") {
      const href = readAttr(part.attrs, "href");
      if (!isSafeHttpUrl(href)) {
        // Keep the text, drop the link.
        out.push("<span>");
        continue;
      }
      out.push(
        `<a href="${escapeAttr(href.trim())}" target="_blank" rel="noopener noreferrer nofollow">`
      );
      continue;
    }

    out.push(`<${name}>`);
  }

  return out.join("").replace(/\s{2,}/g, " ").trim();
}

/** Heuristic used by views to decide HTML vs plain-text rendering. */
export function looksLikeHtml(value) {
  return /<[a-z][^>]*>/i.test(String(value || ""));
}

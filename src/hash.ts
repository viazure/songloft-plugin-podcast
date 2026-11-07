/** Lightweight FNV-1a 32-bit → hex; stable across Node vitest & QuickJS (no songloft.crypto required). */

export function fnv1aHex(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // unsigned 32-bit hex, zero-padded
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** Longer fingerprint: two FNV passes over complementary views. */
export function stableHash(input: string, len: number = 16): string {
  const a = fnv1aHex(input);
  const b = fnv1aHex(`\u0000${input}\u0000${input.length}`);
  return (a + b).slice(0, Math.max(8, len));
}

export function normalizeFeedUrl(raw: string): string {
  const t = String(raw || "").trim();
  if (!t) return "";
  try {
    const u = new URL(t);
    u.hash = "";
    // strip trailing slash on pathname (except root)
    if (u.pathname.length > 1 && u.pathname.endsWith("/")) {
      u.pathname = u.pathname.replace(/\/+$/, "");
    }
    return u.toString();
  } catch {
    return t;
  }
}

export function feedIdFromUrl(url: string): string {
  return stableHash(normalizeFeedUrl(url), 12);
}

export function urlHash(url: string): string {
  return stableHash(String(url || "").trim(), 12);
}

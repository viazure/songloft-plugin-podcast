import { urlHash } from "./hash";

/**
 * Host dedup key for a podcast episode.
 * Format: podcast:<feedId>:<guid|urlHash>
 */
export function episodeDedupKey(feedId: string, guid: string | null | undefined, enclosureUrl: string): string {
  const fid = String(feedId || "").trim();
  const g = typeof guid === "string" ? guid.trim() : "";
  const key = g || urlHash(enclosureUrl);
  return `podcast:${fid}:${key}`;
}

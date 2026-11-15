/**
 * Shared cover-URL predicates.
 *
 * A usable cover is an absolute http(s) or data: URL. Relative paths and empty
 * values are not displayable in the plugin webview and must not overwrite a
 * known good episode cover.
 */
export function usableCoverUrl(url: unknown): string | null {
  if (typeof url !== "string") return null;
  const u = url.trim();
  if (!u) return null;
  if (/^https?:\/\//i.test(u) || u.startsWith("data:")) return u;
  return null;
}

/** Episode artwork stays on coverUrl; channel artwork is a separate fallback. */
export function pickEpisodeAndChannelCovers(
  episodeCover: unknown,
  channelCover: unknown
): { coverUrl: string | null; channelCoverUrl: string | null } {
  return {
    coverUrl: usableCoverUrl(episodeCover),
    channelCoverUrl: usableCoverUrl(channelCover),
  };
}

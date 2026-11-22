/** Backend API client (thin wrapper over the injected SongloftPlugin bridge). */

import { buildCastMiotPlaylistBody } from "./castPlan.js";

const bridge = () => (typeof window !== "undefined" ? window.SongloftPlugin : null);

function requireBridge() {
  const b = bridge();
  if (!b) throw new Error("SongloftPlugin 未注入（请在 Songloft 客户端内打开）");
  return b;
}

async function get(path) {
  return requireBridge().apiGet(path);
}

async function post(path, body) {
  return requireBridge().apiPost(path, body);
}

async function put(path, body) {
  const b = requireBridge();
  if (typeof b.apiPut === "function") return b.apiPut(path, body);
  if (typeof b.apiRequest === "function") return b.apiRequest("PUT", path, body);
  throw new Error("apiPut 不可用");
}

async function del(path, body) {
  const b = requireBridge();
  if (typeof b.apiDelete === "function") {
    return body != null ? b.apiDelete(path, body) : b.apiDelete(path);
  }
  if (typeof b.apiRequest === "function") return b.apiRequest("DELETE", path, body);
  throw new Error("apiDelete 不可用");
}

const enc = encodeURIComponent;

export const api = {
  status: () => get("/api/status"),
  home: () => get("/api/home"),

  settings: () => get("/api/settings"),
  saveSettings: (body) => post("/api/settings", body),

  listSubscriptions: () => get("/api/subscriptions"),
  addSubscription: (url) => post("/api/subscriptions", { url }),
  getEpisodes: async (id, opts = {}) => {
    const singlePage = !!(opts && opts.limit != null && opts.follow !== true);
    const episodes = [];
    let offset = opts && opts.offset != null ? Number(opts.offset) : 0;
    let last = null;
    let guard = 0;
    while (guard++ < 1000) {
      const q = new URLSearchParams();
      if (offset) q.set("offset", String(offset));
      if (opts && opts.limit != null) q.set("limit", String(opts.limit));
      const qs = q.toString();
      const r = await get(`/api/subscriptions/${enc(id)}/episodes${qs ? `?${qs}` : ""}`);
      last = r;
      if (!r || !r.ok) return r;
      const batch = Array.isArray(r.episodes) ? r.episodes : [];
      episodes.push(...batch);
      if (singlePage || !r.hasMore) {
        return {
          ...r,
          episodes: singlePage ? batch : episodes,
          total: r.total != null ? r.total : episodes.length,
          offset: singlePage ? r.offset : 0,
          hasMore: singlePage ? !!r.hasMore : false,
          nextOffset: r.nextOffset,
        };
      }
      const next = Number(r.nextOffset);
      if (!Number.isFinite(next) || next <= offset || !batch.length) break;
      offset = next;
    }
    return last
      ? { ...last, episodes, hasMore: false, offset: 0, total: last.total != null ? last.total : episodes.length }
      : last;
  },
  refreshOne: (id) => post(`/api/subscriptions/${enc(id)}/refresh`, {}),
  indexHistory: (id) => post(`/api/subscriptions/${enc(id)}/index-history`, {}),
  refreshAll: () => post("/api/refresh", {}),
  deleteSubscription: (id) => del(`/api/subscriptions/${enc(id)}`),
  batchDeleteSubscriptions: (ids) =>
    post("/api/subscriptions/batch-delete", { ids }),
  updateSubscriptionUrl: (id, url) => put(`/api/subscriptions/${enc(id)}`, { url }),

  prepare: (body) => post("/api/episodes/prepare", body),

  queue: () => get("/api/queue"),
  queueAdd: (body) => post("/api/queue/add", body),
  queueAddShow: (subscriptionId) => post("/api/queue/add-show", { subscriptionId }),
  queueRemove: (songIds) => post("/api/queue/remove", { songIds }),
  queueRemovePlayed: () => post("/api/queue/remove-played", {}),
  queueMove: (songId, direction) => post("/api/queue/move", { songId, direction }),
  /** Move one episode to row 0 of「播客」before a play/cast. */
  queuePlayFront: (songId) => post("/api/queue/play-front", { songId }),
  queueReorder: (songIds) => post("/api/queue/reorder", { songIds }),
  queueClear: () => post("/api/queue/clear", {}),
  queueAddIds: (songIds) => post("/api/queue/add-ids", { songIds }),

  favorites: () => get("/api/favorites"),
  toggleFavorite: (body) => post("/api/favorites/toggle", body),

  history: () => get("/api/history"),
  recordHistory: (body) => post("/api/history", body),
  removeHistory: (feedUrl, guid) => post("/api/history/remove", { feedUrl, guid }),
  batchDeleteHistory: (items, pruneMappings = true) =>
    post("/api/history/batch-delete", { items, pruneMappings }),
  clearHistory: () => post("/api/history/clear", {}),

  saveProgress: (body) => post("/api/progress", body),
  getProgressOne: (feedUrl, guid) =>
    get(`/api/progress/one?feedUrl=${enc(feedUrl)}&guid=${enc(guid)}`),
  rememberSongMapping: (songId, feedUrl, guid) =>
    post("/api/song-mapping", { songId, feedUrl, guid }),

  log: () => get("/api/log"),

  opmlPreview: (text) => post("/api/opml/preview", { opml: text }),
  opmlImport: (text) => post("/api/opml/import", { opml: text }),
  opmlExport: () => get("/api/opml/export"),

  castMiot: (songId, deviceId) =>
    post("/api/cast/miot", deviceId ? { songId, deviceId } : { songId }),
  /** @param {{ deviceId?: string, songIds?: number[], startIndex?: number, songId?: number }} [opts] */
  castMiotPlaylist: (opts = {}) => post("/api/cast/miot-playlist", buildCastMiotPlaylistBody(opts)),
  castStatus: () => get("/api/cast/status"),
};


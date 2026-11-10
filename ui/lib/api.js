/** Backend API client (thin wrapper over the injected SongloftPlugin bridge). */

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
  getEpisodes: (id) => get(`/api/subscriptions/${enc(id)}/episodes`),
  refreshOne: (id) => post(`/api/subscriptions/${enc(id)}/refresh`, {}),
  refreshAll: () => post("/api/refresh", {}),
  deleteSubscription: (id) => del(`/api/subscriptions/${enc(id)}`),
  updateSubscriptionUrl: (id, url) => put(`/api/subscriptions/${enc(id)}`, { url }),

  prepare: (body) => post("/api/episodes/prepare", body),

  queue: () => get("/api/queue"),
  queueAdd: (body) => post("/api/queue/add", body),
  queueAddShow: (subscriptionId) => post("/api/queue/add-show", { subscriptionId }),
  queueRemove: (songIds) => post("/api/queue/remove", { songIds }),
  queueRemovePlayed: () => post("/api/queue/remove-played", {}),
  queueMove: (songId, direction) => post("/api/queue/move", { songId, direction }),
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
  castMiotPlaylist: (playlistId, deviceId) =>
    post("/api/cast/miot-playlist", deviceId ? { deviceId } : {}),
  castStatus: () => get("/api/cast/status"),
};

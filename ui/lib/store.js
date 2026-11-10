/** App-level data store (lists + settings), independent from playback state. */

const listeners = new Set();

const data = {
  queueSongs: [],
  queueMeta: null,
  recent: [],
  subs: [],
  favorites: [],
  episodes: [],
  activeShowId: null,
  settings: null,
  history: [],
  queueOpen: false,
};

export function getData() {
  return data;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function patch(next) {
  Object.assign(data, next);
  listeners.forEach((fn) => {
    try {
      fn(data);
    } catch (_) {
      /* a broken listener must not stop the store */
    }
  });
}

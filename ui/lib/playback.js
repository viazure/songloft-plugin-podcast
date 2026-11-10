/**
 * Playback UI state machine.
 *
 * `play_request` is not `playing`: the host may accept a song and still report
 * paused/buffering for a moment, so views render from this snapshot instead of
 * guessing from the click.
 */

const listeners = new Set();

const state = {
  phase: "idle", // idle | preparing | play_request | playing | paused | prepare_error | play_error | ended
  current: null, // { subscriptionId, feedUrl, guid, title, showTitle, songId, durationSec, guidSource, coverUrl }
  positionSec: 0,
  durationSec: null,
  error: null,
  hostHint: null,
  progressCapable: true,
  hostSongId: null,
};

/**
 * Host `onStateChange` often only fires on play/pause/seek — not every second.
 * Anchor wall-clock to the last trusted host position so the UI can tick locally
 * while `phase === "playing"`.
 */
let clock = { wallMs: 0, positionSec: 0, running: false };

function syncClock(positionSec, running) {
  clock = {
    wallMs: Date.now(),
    positionSec: Math.max(0, Number(positionSec) || 0),
    running: !!running,
  };
}

/** Position for UI: host snapshot, plus elapsed time while playing. */
export function livePositionSec(snap) {
  const s = snap || get();
  const base =
    typeof s.positionSec === "number" && Number.isFinite(s.positionSec) ? s.positionSec : 0;
  if (!(s.phase === "playing" && clock.running)) return base;
  const elapsed = (Date.now() - clock.wallMs) / 1000;
  let next = clock.positionSec + Math.max(0, elapsed);
  const dur = typeof s.durationSec === "number" && s.durationSec > 0 ? s.durationSec : null;
  if (dur != null) next = Math.min(next, dur);
  return next;
}

function emit() {
  const snap = { ...state, current: state.current ? { ...state.current } : null };
  listeners.forEach((fn) => {
    try {
      fn(snap);
    } catch (_) {
      /* view errors must not break the state loop */
    }
  });
}

function set(patch) {
  const phaseChanged = Object.prototype.hasOwnProperty.call(patch, "phase");
  const posChanged = Object.prototype.hasOwnProperty.call(patch, "positionSec");
  // If we are pausing/ending without a fresh host time, freeze at the extrapolated
  // live position so the bar does not jump backwards to a stale snapshot.
  if (phaseChanged && !posChanged && state.phase === "playing" && patch.phase !== "playing") {
    patch = { ...patch, positionSec: livePositionSec() };
  }
  Object.assign(state, patch);
  if (phaseChanged || posChanged) {
    syncClock(state.positionSec, state.phase === "playing");
  }
  emit();
}

export function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function get() {
  return { ...state, current: state.current ? { ...state.current } : null };
}

export function beginPrepare(episode) {
  set({ phase: "preparing", current: episode, error: null, hostHint: null });
}

export function prepareFailed(message) {
  set({
    phase: "prepare_error",
    error: message || "准备音频失败",
    current: state.current ? { ...state.current, songId: null } : null,
  });
}

export function beginPlayRequest(episodeWithSongId) {
  set({ phase: "play_request", current: episodeWithSongId, error: null });
}

export function playFailed(message) {
  set({ phase: "play_error", error: message || "播放失败" });
}

export function setProgressCapable(v) {
  set({ progressCapable: !!v });
}

export function setPhase(phase, patch) {
  set({ phase, ...(patch || {}) });
}

export function markAudioFocusPause() {
  if (state.phase === "playing") set({ phase: "paused", hostHint: "音频焦点暂停（非故障）" });
}

/** Fold a host `getState()` / state-change payload into the snapshot. */
export function applyHostState(hostState) {
  if (!hostState) return;

  const playing = !!hostState.is_playing;
  const cur = hostState.current_song;
  const hostSongId = cur && typeof cur.id === "number" ? cur.id : null;
  const t = typeof hostState.current_time === "number" ? hostState.current_time : state.positionSec;
  const d =
    typeof hostState.duration === "number" && hostState.duration > 0
      ? hostState.duration
      : state.durationSec;

  const matched = !!(
    state.current &&
    state.current.songId != null &&
    hostSongId != null &&
    hostSongId === state.current.songId
  );

  // Keep the UI current in sync when the host reports a song (queue row / host bar).
  let nextCurrent = state.current;
  if (cur && hostSongId != null) {
    if (!nextCurrent || nextCurrent.songId !== hostSongId) {
      nextCurrent = {
        ...(nextCurrent || {}),
        songId: hostSongId,
        title: cur.title || (nextCurrent && nextCurrent.title) || "#" + hostSongId,
        showTitle: cur.album || cur.artist || (nextCurrent && nextCurrent.showTitle) || "",
      };
    }
  }

  if (state.phase === "play_request" || state.phase === "preparing") {
    if (playing) {
      set({
        phase: "playing",
        current: nextCurrent,
        hostSongId,
        positionSec: t,
        durationSec: d,
        error: null,
        hostHint: null,
      });
      return;
    }
    if (matched || hostSongId === (state.current && state.current.songId)) {
      set({
        phase: playing ? "playing" : "paused",
        current: nextCurrent,
        hostSongId,
        positionSec: t,
        durationSec: d,
        error: null,
        hostHint: playing ? null : "已选中当前集，等待出声…",
      });
      return;
    }
  }

  const settledPhases = ["playing", "paused", "play_request", "idle", "ended"];
  if (settledPhases.includes(state.phase)) {
    if (playing) {
      set({
        phase: "playing",
        current: nextCurrent,
        hostSongId,
        positionSec: t,
        durationSec: d,
        hostHint: null,
      });
    } else if (state.phase === "playing") {
      set({ phase: "paused", current: nextCurrent, hostSongId, positionSec: t, durationSec: d });
    } else if (matched || hostSongId != null) {
      set({
        phase: state.phase === "ended" ? "ended" : "paused",
        current: nextCurrent,
        hostSongId,
        positionSec: t,
        durationSec: d,
      });
    } else {
      set({ hostSongId, positionSec: t, durationSec: d });
    }
  } else {
    set({ hostSongId, current: nextCurrent || state.current });
  }

  // Ended heuristic: host stops at the tail without a dedicated event.
  if (
    !playing &&
    d != null &&
    d > 0 &&
    t >= d - 1.5 &&
    nextCurrent &&
    hostSongId != null &&
    nextCurrent.songId === hostSongId
  ) {
    set({ phase: "ended", current: nextCurrent, hostSongId, positionSec: d, durationSec: d });
  }
}

/** Song id the host is currently pointing at. */
export function currentSongId(snap) {
  const s = snap || get();
  if (s.hostSongId != null) return s.hostSongId;
  if (s.current && s.current.songId != null) return s.current.songId;
  return null;
}

const PHASE_LABELS = {
  preparing: "准备中",
  play_request: "请求中",
  playing: "正在播放",
  paused: "已暂停",
  prepare_error: "出错",
  play_error: "出错",
  ended: "已听完",
};

export function phaseLabel(phase) {
  return PHASE_LABELS[phase] || "";
}

/**
 * Progress for one list row, overlaying live host position for the current song.
 *
 * Stored `completed` is sticky by design (it drives「移除已播放」), so it must not
 * win while the same episode is actively playing again near the start —
 * otherwise a re-listen shows a checkmark at 5:19/16:09.
 */
export function liveProgressFor(song, snap) {
  const playingId = currentSongId(snap);
  let prog = song && song.progress ? { ...song.progress } : null;
  if (song && playingId != null && song.id === playingId && snap) {
    const pos = livePositionSec(snap);
    const dur =
      (typeof snap.durationSec === "number" && snap.durationSec > 0
        ? snap.durationSec
        : prog && prog.durationSec) ||
      song.duration ||
      song.durationSec ||
      null;
    const ended = snap.phase === "ended";
    // Replaying after a previous finish: only treat as completed when the live
    // position really is at the tail.
    const atTail = ended || (dur > 0 && pos >= dur - 3);
    prog = {
      positionSec: ended && dur > 0 ? dur : pos,
      durationSec: dur,
      completed: atTail,
    };
  }
  return prog;
}

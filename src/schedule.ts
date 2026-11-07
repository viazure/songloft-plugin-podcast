/**
 * Podcast feed scheduled refresh (plugin-local timer).
 * Default OFF; suggested interval 6h. Not miot cron / keep-alive.
 */

export const INTERVAL_OPTIONS = [6, 12, 24] as const;
export type IntervalHours = (typeof INTERVAL_OPTIONS)[number];

export interface RefreshScheduleState {
  enabled: boolean;
  intervalHours: IntervalHours;
  lastSuccessAt: number | null;
  nextDueAt: number | null;
}

export const DEFAULT_REFRESH_SCHEDULE: RefreshScheduleState = {
  enabled: false,
  intervalHours: 6,
  lastSuccessAt: null,
  nextDueAt: null,
};

export function normalizeIntervalHours(v: unknown): IntervalHours {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (n === 6 || n === 12 || n === 24) return n;
  return 6;
}

export function hoursToMs(hours: number): number {
  return hours * 3600 * 1000;
}

export function computeNextDueAt(fromMs: number, intervalHours: number): number {
  return fromMs + hoursToMs(intervalHours);
}

export function delayUntilDue(nextDueAt: number, nowMs: number): number {
  return Math.max(0, nextDueAt - nowMs);
}

export type ScheduleTimers = {
  now: () => number;
  setTimeout: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>;
  clearTimeout: (id: ReturnType<typeof setTimeout>) => void;
};

const defaultTimers: ScheduleTimers = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (id) => clearTimeout(id),
};

export type ScheduledSyncFn = () => Promise<void>;

export class RefreshScheduler {
  private timers: ScheduleTimers;
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private busy = false;
  private skippedBusy = 0;
  private state: RefreshScheduleState = { ...DEFAULT_REFRESH_SCHEDULE };
  private onTick: ScheduledSyncFn | null = null;
  private persist: ((s: RefreshScheduleState) => Promise<void>) | null = null;

  constructor(timers: Partial<ScheduleTimers> = {}) {
    this.timers = { ...defaultTimers, ...timers };
  }

  getState(): RefreshScheduleState {
    return { ...this.state };
  }

  getSkippedBusy(): number {
    return this.skippedBusy;
  }

  isBusy(): boolean {
    return this.busy;
  }

  resetSkippedBusy(): void {
    this.skippedBusy = 0;
  }

  setPersist(fn: (s: RefreshScheduleState) => Promise<void>): void {
    this.persist = fn;
  }

  setOnTick(fn: ScheduledSyncFn): void {
    this.onTick = fn;
  }

  stopTimer(): void {
    if (this.timerId != null) {
      this.timers.clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  dispose(): void {
    this.stopTimer();
    this.onTick = null;
  }

  async applyState(
    partial: Partial<RefreshScheduleState>,
    opts: { rearm?: boolean; persist?: boolean } = {}
  ): Promise<RefreshScheduleState> {
    const rearm = opts.rearm !== false;
    const doPersist = opts.persist !== false;
    const now = this.timers.now();
    const next: RefreshScheduleState = {
      ...this.state,
      ...partial,
      intervalHours: normalizeIntervalHours(
        partial.intervalHours !== undefined ? partial.intervalHours : this.state.intervalHours
      ),
      enabled: partial.enabled !== undefined ? !!partial.enabled : this.state.enabled,
    };
    if (partial.lastSuccessAt !== undefined) {
      next.lastSuccessAt =
        partial.lastSuccessAt == null || !Number.isFinite(partial.lastSuccessAt)
          ? null
          : partial.lastSuccessAt;
    }
    if (partial.nextDueAt !== undefined) {
      next.nextDueAt =
        partial.nextDueAt == null || !Number.isFinite(partial.nextDueAt)
          ? null
          : partial.nextDueAt;
    }

    const intervalChanged =
      partial.intervalHours !== undefined &&
      normalizeIntervalHours(partial.intervalHours) !== this.state.intervalHours;
    if (next.enabled) {
      if (next.nextDueAt == null) {
        next.nextDueAt = computeNextDueAt(now, next.intervalHours);
      } else if (intervalChanged && partial.nextDueAt === undefined) {
        const from = next.lastSuccessAt != null ? next.lastSuccessAt : now;
        next.nextDueAt = computeNextDueAt(from, next.intervalHours);
        if (next.nextDueAt <= now) {
          next.nextDueAt = computeNextDueAt(now, next.intervalHours);
        }
      }
    } else {
      next.nextDueAt = null;
    }

    this.state = next;
    if (doPersist && this.persist) {
      await this.persist(this.state);
    }
    if (rearm) this.rearmTimer();
    return this.getState();
  }

  async noteSuccess(atMs?: number): Promise<RefreshScheduleState> {
    const now = atMs ?? this.timers.now();
    if (!this.state.enabled) {
      return this.applyState({ lastSuccessAt: now, nextDueAt: null }, { rearm: true });
    }
    return this.applyState(
      {
        lastSuccessAt: now,
        nextDueAt: computeNextDueAt(now, this.state.intervalHours),
      },
      { rearm: true }
    );
  }

  async noteAttemptFinished(ok: boolean, atMs?: number): Promise<RefreshScheduleState> {
    const now = atMs ?? this.timers.now();
    if (ok) return this.noteSuccess(now);
    if (!this.state.enabled) return this.getState();
    return this.applyState(
      { nextDueAt: computeNextDueAt(now, this.state.intervalHours) },
      { rearm: true }
    );
  }

  async runExclusive<T>(
    fn: () => Promise<T>
  ): Promise<{ skipped: true; reason: "skipped_busy" } | { skipped: false; result: T }> {
    if (this.busy) {
      this.skippedBusy += 1;
      return { skipped: true, reason: "skipped_busy" };
    }
    this.busy = true;
    try {
      const result = await fn();
      return { skipped: false, result };
    } finally {
      this.busy = false;
    }
  }

  hasTimer(): boolean {
    return this.timerId != null;
  }

  rearmTimer(): void {
    this.stopTimer();
    if (!this.state.enabled || this.state.nextDueAt == null) return;
    const delay = delayUntilDue(this.state.nextDueAt, this.timers.now());
    this.timerId = this.timers.setTimeout(() => {
      void this.fire();
    }, delay);
  }

  private async fire(): Promise<void> {
    this.timerId = null;
    if (!this.state.enabled || !this.onTick) return;
    try {
      await this.onTick();
    } catch {
      await this.noteAttemptFinished(false);
      return;
    }
    if (this.state.enabled) {
      const due = this.state.nextDueAt;
      const now = this.timers.now();
      if (due == null || due <= now) {
        await this.applyState(
          { nextDueAt: computeNextDueAt(now, this.state.intervalHours) },
          { rearm: true }
        );
      } else {
        this.rearmTimer();
      }
    }
  }
}

export const refreshScheduler = new RefreshScheduler();

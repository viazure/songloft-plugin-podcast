/**
 * Deadline wrapper around the host `fetch` polyfill.
 *
 * Songloft's plugin runtime is QuickJS. The SDK documents `fetch` / `setTimeout`
 * as polyfilled globals, but not `AbortController`. Constructing
 * `new AbortController()` throws `AbortController is not defined` and must
 * never be treated as "the play request was already sent".
 *
 * When a deadline fires we do **not** cancel the in-flight HTTP request: there
 * is no supported cancellation hook. The late fulfillment or rejection is
 * ignored so it cannot mutate a later transaction.
 */

export type IssuedError = Error & { issued: boolean; timeout?: boolean };

export function isIssuedError(error: unknown): boolean {
  return !!(error && typeof error === "object" && (error as { issued?: unknown }).issued === true);
}

export function isTimeoutError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { timeout?: unknown; name?: string; message?: string };
  if (err.timeout === true || err.name === "HttpDeadlineError") return true;
  const msg = String(err.message || "");
  // Do not match "AbortController is not defined".
  return msg === "请求超时" || /^请求超时/.test(msg);
}

export function attachIssued(error: unknown, issued: boolean): IssuedError {
  if (error && typeof error === "object") {
    const err = error as IssuedError;
    err.issued = issued;
    return err;
  }
  const wrapped = new Error(String(error ?? "请求失败")) as IssuedError;
  wrapped.issued = issued;
  return wrapped;
}

export class HttpDeadlineError extends Error implements IssuedError {
  issued: boolean;
  timeout: boolean;
  constructor(message: string, issued: boolean) {
    super(message);
    this.name = "HttpDeadlineError";
    this.issued = issued;
    this.timeout = true;
  }
}

export type FetchDeadlineOptions = {
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  delay?: (ms: number) => Promise<void>;
};

function withoutSignal(init?: RequestInit): RequestInit {
  if (!init) return {};
  const rest = { ...init } as RequestInit & { signal?: unknown; timeoutMs?: unknown };
  delete rest.signal;
  delete rest.timeoutMs;
  return rest;
}

/**
 * Call `fetch` and optionally bound how long we wait for it.
 * `issued` becomes true only after `fetchImpl` has been invoked.
 */
export async function fetchWithDeadline(
  input: string,
  init?: RequestInit,
  options: FetchDeadlineOptions = {}
): Promise<Response> {
  const timeoutMs = options.timeoutMs && options.timeoutMs > 0 ? options.timeoutMs : 0;
  const fetchImpl = options.fetchImpl || fetch;
  const delay =
    options.delay ||
    ((ms: number) =>
      new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
      }));

  const rest = withoutSignal(init);
  let issued = false;
  const request = (async () => {
    issued = true;
    return await fetchImpl(input, rest);
  })();

  const guarded = request.then(
    (res) => res,
    (err) => {
      throw attachIssued(err, true);
    }
  );

  if (timeoutMs <= 0) return guarded;

  let finished = false;
  try {
    return await new Promise<Response>((resolve, reject) => {
      const settle = (fn: () => void) => {
        if (finished) return;
        finished = true;
        fn();
      };
      guarded.then(
        (res) => settle(() => resolve(res)),
        (err) => settle(() => reject(err))
      );
      delay(timeoutMs).then(() => {
        settle(() => reject(new HttpDeadlineError("请求超时", issued)));
      }, () => undefined);
    });
  } finally {
    if (finished) {
      // The original request may still complete later. Swallow so a late
      // rejection cannot surface as an unhandled promise or touch later work.
      guarded.then(() => undefined, () => undefined);
    }
  }
}

/**
 * Abandon waiting for `work` after `timeoutMs`. Does **not** cancel `work`.
 * Late fulfill/reject is swallowed so it cannot touch later jobs — same contract
 * as `fetchWithDeadline` (no AbortController).
 *
 * Callers that hold per-channel in-flight / future concurrency slots MUST treat
 * settlement of this promise (including timeout rejection) as the release point.
 * The underlying host connection may still be busy after we move on.
 */
export async function withDeadline<T>(
  work: Promise<T>,
  options: {
    timeoutMs: number;
    delay?: (ms: number) => Promise<void>;
    /** When true, timeout errors report issued=true (work already started). */
    issued?: boolean;
  }
): Promise<T> {
  const timeoutMs = options.timeoutMs && options.timeoutMs > 0 ? options.timeoutMs : 0;
  const delay =
    options.delay ||
    ((ms: number) =>
      new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
      }));
  const issued = options.issued !== false;

  const guarded = Promise.resolve(work);

  if (timeoutMs <= 0) return guarded;

  let finished = false;
  try {
    return await new Promise<T>((resolve, reject) => {
      const settle = (fn: () => void) => {
        if (finished) return;
        finished = true;
        fn();
      };
      guarded.then(
        (v) => settle(() => resolve(v)),
        (err) => settle(() => reject(err))
      );
      delay(timeoutMs).then(() => {
        settle(() => reject(new HttpDeadlineError("请求超时", issued)));
      }, () => undefined);
    });
  } finally {
    if (finished) {
      guarded.then(() => undefined, () => undefined);
    }
  }
}

export type PlayAttemptShape = {
  ok: boolean;
  error?: string;
  playIssued: boolean;
  uncertain: boolean;
};

/** Map a thrown value from play/fetch into a PlayAttempt. Construction-time errors are not "issued". */
export function playAttemptFromUnknown(error: unknown, fallback = "投放失败"): PlayAttemptShape {
  const issued = isIssuedError(error);
  const timeout = isTimeoutError(error);
  const msg = String((error as { message?: string })?.message ?? error ?? fallback) || fallback;
  return {
    ok: false,
    playIssued: issued,
    uncertain: issued && timeout,
    error: timeout ? "请求超时" : msg,
  };
}
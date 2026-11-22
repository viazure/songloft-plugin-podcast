import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usableCoverUrl, pickEpisodeAndChannelCovers } from "../src/coverUrl";
import {
  channelCoverFromSubs,
  createHistoryCoverSession,
  historyCoverCandidates,
  historyCoverHtml,
  historyCoverImageState,
  historyCoverReduce,
  letterPlaceholderSource,
  bindHistoryCoverRoot,
} from "../ui/lib/historyCover.js";

describe("usableCoverUrl / pickEpisodeAndChannelCovers", () => {
  it("accepts only absolute http(s) or data URLs", () => {
    expect(usableCoverUrl("https://cdn.example/ep.jpg")).toBe("https://cdn.example/ep.jpg");
    expect(usableCoverUrl("http://cdn.example/ep.jpg")).toBe("http://cdn.example/ep.jpg");
    expect(usableCoverUrl("data:image/png;base64,abc")).toBe("data:image/png;base64,abc");
    expect(usableCoverUrl("/relative.jpg")).toBeNull();
    expect(usableCoverUrl("")).toBeNull();
    expect(usableCoverUrl("   ")).toBeNull();
    expect(usableCoverUrl(null)).toBeNull();
    expect(usableCoverUrl(undefined)).toBeNull();
  });

  it("does not pretend the channel cover is the episode field", () => {
    expect(
      pickEpisodeAndChannelCovers(null, "https://cdn.example/show.jpg")
    ).toEqual({
      coverUrl: null,
      channelCoverUrl: "https://cdn.example/show.jpg",
    });
    expect(
      pickEpisodeAndChannelCovers("https://cdn.example/ep.jpg", "https://cdn.example/show.jpg")
    ).toEqual({
      coverUrl: "https://cdn.example/ep.jpg",
      channelCoverUrl: "https://cdn.example/show.jpg",
    });
  });
});

describe("history cover candidates and letter", () => {
  it("orders episode → channel, deduplicates identical URLs", () => {
    const same = "https://cdn.example/shared.jpg";
    expect(
      historyCoverCandidates({ coverUrl: same, channelCoverUrl: same })
    ).toEqual([same]);
    expect(
      historyCoverCandidates({
        coverUrl: "https://cdn.example/ep.jpg",
        channelCoverUrl: "https://cdn.example/show.jpg",
      })
    ).toEqual(["https://cdn.example/ep.jpg", "https://cdn.example/show.jpg"]);
    expect(historyCoverCandidates({ coverUrl: "", channelCoverUrl: null })).toEqual([]);
    expect(historyCoverCandidates({ coverUrl: "/nope.png", channelCoverUrl: "" })).toEqual([]);
  });

  it("prefers channel title, then episode title, then ?", () => {
    expect(letterPlaceholderSource("频道名", "单集标题")).toBe("频道名");
    expect(letterPlaceholderSource("", "单集标题")).toBe("单集标题");
    expect(letterPlaceholderSource("  ", "  ")).toBe("?");
  });

  it("renders a letter placeholder when no usable URL exists", () => {
    const html = historyCoverHtml({ title: "Alpha", showTitle: "Bravo", coverUrl: null });
    expect(html).toContain("cover-ph");
    expect(html).toContain("B");
    expect(html).not.toContain("<img");
  });

  it("renders an img for a valid episode URL and keeps channel as a candidate only", () => {
    const html = historyCoverHtml(
      { title: "Ep", showTitle: "Show", coverUrl: "https://cdn.example/ep.jpg" },
      { channelCoverUrl: "https://cdn.example/show.jpg" }
    );
    expect(html).toContain('src="https://cdn.example/ep.jpg"');
    expect(html).toContain('referrerpolicy="no-referrer"');
    expect(html).toContain("data-history-cover");
    expect(html).toContain("https://cdn.example/show.jpg");
    expect(html).toContain('alt=""');
  });

  it("looks up channel covers from subscriptions without writing them onto the entry", () => {
    const url = channelCoverFromSubs("https://Example.com/feed/", [
      { url: "https://example.com/feed", coverUrl: "https://cdn.example/show.jpg" },
    ]);
    expect(url).toBe("https://cdn.example/show.jpg");
    expect(
      channelCoverFromSubs("https://example.com/other", [
        { url: "https://example.com/feed", coverUrl: "https://cdn.example/show.jpg" },
      ])
    ).toBeNull();
  });
});

describe("historyCoverReduce", () => {
  it("advances to the channel URL on episode failure, then placeholder", () => {
    let session = createHistoryCoverSession({
      candidates: ["https://cdn.example/ep.jpg", "https://cdn.example/show.jpg"],
      generation: 1,
    });
    let result = historyCoverReduce(session, { type: "error", generation: 1 });
    expect(result.action).toEqual({ type: "set-src", url: "https://cdn.example/show.jpg" });
    result = historyCoverReduce(result.session, { type: "timeout", generation: 1 });
    expect(result.action).toEqual({ type: "placeholder" });
  });

  it("ignores stale generation and cancelled sessions; load stops the chain", () => {
    const session = createHistoryCoverSession({
      candidates: ["https://cdn.example/ep.jpg", "https://cdn.example/show.jpg"],
      generation: 7,
    });
    expect(historyCoverReduce(session, { type: "error", generation: 6 }).action.type).toBe(
      "ignore"
    );
    const loaded = historyCoverReduce(session, { type: "load", generation: 7 });
    expect(loaded.action.type).toBe("keep");
    expect(historyCoverReduce(loaded.session, { type: "error", generation: 7 }).action.type).toBe(
      "ignore"
    );
    const cancelled = historyCoverReduce(session, { type: "cancel", generation: 7 });
    expect(cancelled.action.type).toBe("cleanup");
    expect(historyCoverReduce(cancelled.session, { type: "timeout", generation: 7 }).action.type).toBe(
      "ignore"
    );
  });

  it("deduplicates so a shared URL is attempted once", () => {
    const session = createHistoryCoverSession({
      candidates: ["https://cdn.example/same.jpg", "https://cdn.example/same.jpg"],
      generation: 1,
    });
    expect(session.candidates).toEqual(["https://cdn.example/same.jpg"]);
    const result = historyCoverReduce(session, { type: "error", generation: 1 });
    expect(result.action.type).toBe("placeholder");
  });
});


describe("historyCoverImageState", () => {
  it("reports loaded when naturalWidth is positive, even if lazy and ineligible", () => {
    expect(
      historyCoverImageState(
        { complete: true, naturalWidth: 64, loading: "lazy", currentSrc: "https://cdn.example/ep.jpg" },
        { eligible: false }
      )
    ).toBe("loaded");
  });

  it("stays pending for a lazy cover that has not intersected, even with currentSrc and zero width", () => {
    expect(
      historyCoverImageState(
        { complete: true, naturalWidth: 0, loading: "lazy", currentSrc: "https://cdn.example/ep.jpg" },
        { eligible: false }
      )
    ).toBe("pending");
  });

  it("does not treat complete && naturalWidth===0 as broken when already eligible", () => {
    expect(
      historyCoverImageState(
        { complete: true, naturalWidth: 0, loading: "eager", currentSrc: "https://cdn.example/ep.svg" },
        { eligible: true }
      )
    ).toBe("pending");
  });
});

describe("bindHistoryCoverRoot cached / timeout", () => {
  const ioInstances = [];

  beforeEach(() => {
    ioInstances.length = 0;
    globalThis.IntersectionObserver = class IntersectionObserver {
      constructor(callback, options) {
        this.callback = callback;
        this.options = options;
        this.targets = new Set();
        ioInstances.push(this);
      }
      observe(target) {
        this.targets.add(target);
      }
      unobserve(target) {
        this.targets.delete(target);
      }
      disconnect() {
        this.targets.clear();
      }
    };
  });

  afterEach(() => {
    vi.useRealTimers();
        delete globalThis.IntersectionObserver;
    ioInstances.length = 0;
  });

  function triggerIntersection(img, isIntersecting = true) {
    for (const io of ioInstances) {
      if (!io.targets.has(img)) continue;
      io.callback([{ target: img, isIntersecting }], io);
    }
  }

  async function flushPromises() {
    for (let i = 0; i < 5; i++) await Promise.resolve();
  }

  function makeCoverImg(init) {
    const attrs = {
      "data-history-cover": "1",
      "data-cover-candidates": JSON.stringify(init.candidates),
      "data-cover-letter": "S",
      "data-cover-color": "#abc123",
      src: init.src,
      loading: init.loading ?? "lazy",
    };
    let complete = init.complete;
    let naturalWidth = init.naturalWidth;
    let currentSrc = init.currentSrc ?? (init.complete && init.naturalWidth > 0 ? init.src : init.currentSrc || "");
    const ownerDocument = {
      createElement(tag) {
        const el = {
          tagName: String(tag).toUpperCase(),
          className: "",
          style: {},
          textContent: "",
          attributes: {},
          setAttribute(k, v) {
            el.attributes[k] = v;
          },
        };
        return el;
      },
    };
    const listeners = {};
    const img = {
      get complete() {
        return complete;
      },
      set complete(v) {
        complete = v;
      },
      get naturalWidth() {
        return naturalWidth;
      },
      set naturalWidth(v) {
        naturalWidth = v;
      },
      get currentSrc() {
        return currentSrc;
      },
      set currentSrc(v) {
        currentSrc = v;
      },
      get loading() {
        return attrs.loading;
      },
      get src() {
        return attrs.src;
      },
      set src(v) {
        attrs.src = v;
        if (typeof init.onSrc === "function") init.onSrc(v, img);
      },
      parentNode: null,
      ownerDocument,
      replacedWith: null,
      getAttribute(k) {
        return Object.prototype.hasOwnProperty.call(attrs, k) ? attrs[k] : null;
      },
      setAttribute(k, v) {
        attrs[k] = String(v);
      },
      addEventListener(type, fn) {
        (listeners[type] ||= new Set()).add(fn);
      },
      removeEventListener(type, fn) {
        listeners[type] && listeners[type].delete(fn);
      },
      dispatch(type) {
        for (const fn of listeners[type] || []) fn();
      },
      replaceWith(node) {
        img.replacedWith = node;
        if (img.parentNode && Array.isArray(img.parentNode.children)) {
          img.parentNode.children = img.parentNode.children.filter((c) => c !== img);
        }
        img.parentNode = null;
      },
    };
    if (typeof init.decode === "function") {
      img.decode = () => init.decode(img);
    }
    img.parentNode = { children: [img] };
    return img;
  }

  function makeRoot(imgs) {
    return {
      querySelectorAll(sel) {
        return sel === "[data-history-cover]" ? imgs : [];
      },
    };
  }

  it("does not downgrade a cached decoded cover after the timeout", () => {
    vi.useFakeTimers();
    const ep = "https://cdn.example/ep.jpg";
    const show = "https://cdn.example/show.jpg";
    const img = makeCoverImg({
      src: ep,
      candidates: [ep, show],
      complete: true,
      naturalWidth: 120,
      currentSrc: ep,
    });
    const dispose = bindHistoryCoverRoot(makeRoot([img]), { timeoutMs: 30 });
    vi.advanceTimersByTime(30);
    expect(img.src).toBe(ep);
    expect(img.replacedWith).toBeNull();
    expect(img.parentNode).not.toBeNull();
    dispose();
  });

  it("sends a complete broken cover down the failure chain", async () => {
    vi.useFakeTimers();
    const ep = "https://cdn.example/ep.jpg";
    const show = "https://cdn.example/show.jpg";
    const img = makeCoverImg({
      src: ep,
      candidates: [ep, show],
      complete: true,
      naturalWidth: 0,
      currentSrc: ep,
      loading: "eager",
      decode() {
        return Promise.reject(new Error("broken"));
      },
      onSrc(url, el) {
        el.complete = true;
        el.naturalWidth = 80;
        el.currentSrc = url;
      },
    });
    const dispose = bindHistoryCoverRoot(makeRoot([img]), { timeoutMs: 30 });
    await flushPromises();
    expect(img.src).toBe(show);
    expect(img.replacedWith).toBeNull();
    vi.advanceTimersByTime(30);
    expect(img.src).toBe(show);
    expect(img.replacedWith).toBeNull();
    dispose();
  });

  it("replaces a complete broken cover with a placeholder when no candidate remains", async () => {
    const ep = "https://cdn.example/ep.jpg";
    const img = makeCoverImg({
      src: ep,
      candidates: [ep],
      complete: true,
      naturalWidth: 0,
      currentSrc: ep,
      loading: "eager",
      decode() {
        return Promise.reject(new Error("broken"));
      },
    });
    bindHistoryCoverRoot(makeRoot([img]), { timeoutMs: 30 });
    await flushPromises();
    expect(img.replacedWith).toBeTruthy();
    expect(img.replacedWith.className).toBe("cover-ph");
    expect(img.replacedWith.textContent).toBe("S");
  });

  it("still times out a cover that has not finished loading", () => {
    vi.useFakeTimers();
    const ep = "https://cdn.example/ep.jpg";
    const show = "https://cdn.example/show.jpg";
    const img = makeCoverImg({
      src: ep,
      candidates: [ep, show],
      complete: false,
      naturalWidth: 0,
      currentSrc: "",
      loading: "eager",
      onSrc(url, el) {
        el.complete = false;
        el.naturalWidth = 0;
        el.currentSrc = "";
      },
    });
    const dispose = bindHistoryCoverRoot(makeRoot([img]), { timeoutMs: 30 });
    expect(img.src).toBe(ep);
    expect(img.replacedWith).toBeNull();
    vi.advanceTimersByTime(29);
    expect(img.src).toBe(ep);
    vi.advanceTimersByTime(1);
    expect(img.src).toBe(show);
    vi.advanceTimersByTime(30);
    expect(img.replacedWith).toBeTruthy();
    dispose();
  });

  it("does not treat a lazy cover that has not started as broken", () => {
    vi.useFakeTimers();
    const ep = "https://cdn.example/ep.jpg";
    const show = "https://cdn.example/show.jpg";
    const img = makeCoverImg({
      src: ep,
      candidates: [ep, show],
      complete: true,
      naturalWidth: 0,
      currentSrc: "",
      loading: "lazy",
    });
    const dispose = bindHistoryCoverRoot(makeRoot([img]), { timeoutMs: 30 });
    expect(img.src).toBe(ep);
    expect(img.replacedWith).toBeNull();
    vi.advanceTimersByTime(30);
    expect(img.src).toBe(ep);
    expect(img.replacedWith).toBeNull();
    dispose();
  });

  it("cancels the timeout once a pending cover fires load", () => {
    vi.useFakeTimers();
    const ep = "https://cdn.example/ep.jpg";
    const show = "https://cdn.example/show.jpg";
    const img = makeCoverImg({
      src: ep,
      candidates: [ep, show],
      complete: false,
      naturalWidth: 0,
      currentSrc: "",
      loading: "eager",
    });
    const dispose = bindHistoryCoverRoot(makeRoot([img]), { timeoutMs: 30 });
    img.complete = true;
    img.naturalWidth = 64;
    img.currentSrc = ep;
    img.dispatch("load");
    vi.advanceTimersByTime(30);
    expect(img.src).toBe(ep);
    expect(img.replacedWith).toBeNull();
    dispose();
  });

  it("does not downgrade an off-screen lazy cover after the timeout", () => {
    vi.useFakeTimers();
    const ep = "https://cdn.example/ep.jpg";
    const show = "https://cdn.example/show.jpg";
    const img = makeCoverImg({
      src: ep,
      candidates: [ep, show],
      complete: false,
      naturalWidth: 0,
      currentSrc: "",
      loading: "lazy",
    });
    const dispose = bindHistoryCoverRoot(makeRoot([img]), { timeoutMs: 8000 });
    vi.advanceTimersByTime(8000);
    expect(img.src).toBe(ep);
    expect(img.replacedWith).toBeNull();
    dispose();
  });

  it("fails over a broken cover after it intersects the viewport", async () => {
    vi.useFakeTimers();
    const ep = "https://cdn.example/ep.jpg";
    const show = "https://cdn.example/show.jpg";
    let decodeCalls = 0;
    const img = makeCoverImg({
      src: ep,
      candidates: [ep, show],
      complete: true,
      naturalWidth: 0,
      currentSrc: ep,
      loading: "lazy",
      decode() {
        decodeCalls += 1;
        return Promise.reject(new Error("broken"));
      },
      onSrc(url, el) {
        el.complete = true;
        el.naturalWidth = 80;
        el.currentSrc = url;
      },
    });
    const dispose = bindHistoryCoverRoot(makeRoot([img]), { timeoutMs: 30 });
    expect(img.src).toBe(ep);
    expect(decodeCalls).toBe(0);
    triggerIntersection(img);
    await flushPromises();
    expect(decodeCalls).toBe(1);
    expect(img.src).toBe(show);
    expect(img.replacedWith).toBeNull();
    vi.advanceTimersByTime(30);
    expect(img.src).toBe(show);
    expect(img.replacedWith).toBeNull();
    dispose();
  });

  it("keeps an in-viewport SVG cover with naturalWidth 0 after decode succeeds", async () => {
    vi.useFakeTimers();
    const ep = "https://cdn.example/ep.svg";
    const show = "https://cdn.example/show.jpg";
    const img = makeCoverImg({
      src: ep,
      candidates: [ep, show],
      complete: true,
      naturalWidth: 0,
      currentSrc: ep,
      loading: "lazy",
      decode() {
        return Promise.resolve();
      },
    });
    const dispose = bindHistoryCoverRoot(makeRoot([img]), { timeoutMs: 30 });
    triggerIntersection(img);
    await flushPromises();
    vi.advanceTimersByTime(30);
    expect(img.src).toBe(ep);
    expect(img.replacedWith).toBeNull();
    dispose();
  });

  it("keeps an in-viewport SVG cover with naturalWidth 0 after a load event", () => {
    vi.useFakeTimers();
    const ep = "https://cdn.example/ep.svg";
    const show = "https://cdn.example/show.jpg";
    const img = makeCoverImg({
      src: ep,
      candidates: [ep, show],
      complete: false,
      naturalWidth: 0,
      currentSrc: "",
      loading: "lazy",
    });
    const dispose = bindHistoryCoverRoot(makeRoot([img]), { timeoutMs: 30 });
    triggerIntersection(img);
    img.complete = true;
    img.naturalWidth = 0;
    img.currentSrc = ep;
    img.dispatch("load");
    vi.advanceTimersByTime(30);
    expect(img.src).toBe(ep);
    expect(img.replacedWith).toBeNull();
    dispose();
  });

  it("does not treat a lazy cover with currentSrc as broken before intersection", () => {
    vi.useFakeTimers();
    const ep = "https://cdn.example/ep.jpg";
    const show = "https://cdn.example/show.jpg";
    let decodeCalls = 0;
    const img = makeCoverImg({
      src: ep,
      candidates: [ep, show],
      complete: true,
      naturalWidth: 0,
      currentSrc: ep,
      loading: "lazy",
      decode() {
        decodeCalls += 1;
        return Promise.reject(new Error("decode must not run off-screen"));
      },
    });
    const dispose = bindHistoryCoverRoot(makeRoot([img]), { timeoutMs: 30 });
    expect(img.src).toBe(ep);
    expect(decodeCalls).toBe(0);
    vi.advanceTimersByTime(30);
    expect(img.src).toBe(ep);
    expect(img.replacedWith).toBeNull();
    expect(decodeCalls).toBe(0);
    dispose();
  });
});

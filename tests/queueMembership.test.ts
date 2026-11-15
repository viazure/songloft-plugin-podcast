import { describe, expect, it } from "vitest";
import {
  buildQueueIndex,
  episodeKey,
  isInPodcastQueue,
  normalizeFeedKey,
  queueButtonAttrs,
  queueButtonState,
  queueMenuAttrs,
  QUEUE_ADD_LABEL,
  QUEUE_IN_LABEL,
  QUEUE_ADD_ICON,
  QUEUE_IN_ICON,
  repaintQueueButtons,
} from "../ui/lib/queueMembership.js";
import { ICONS } from "../ui/lib/icons.js";

const QUEUE = [
  { id: 101, feedUrl: "https://Example.com/feed.xml", guid: "g-1" },
  { id: 202, feedUrl: "https://example.com/other.xml/", guid: "g-2" },
  // A queue row whose source_data was incomplete: id only, no identity.
  { id: 303, feedUrl: null, guid: null },
];

describe("queue membership lookup", () => {
  const index = buildQueueIndex(QUEUE);

  it("matches by song id", () => {
    expect(isInPodcastQueue({ songId: 101 }, index)).toBe(true);
    expect(isInPodcastQueue({ songId: 303 }, index)).toBe(true);
    expect(isInPodcastQueue({ songId: 999 }, index)).toBe(false);
  });

  it("matches by feedUrl + guid when the row has no song id yet", () => {
    expect(
      isInPodcastQueue({ songId: null, feedUrl: "https://example.com/feed.xml", guid: "g-1" }, index)
    ).toBe(true);
    // Trailing slash / case differences must not hide membership.
    expect(
      isInPodcastQueue({ feedUrl: "https://EXAMPLE.com/feed.xml/", guid: "g-1" }, index)
    ).toBe(true);
    expect(
      isInPodcastQueue({ feedUrl: "https://example.com/other.xml", guid: "g-2" }, index)
    ).toBe(true);
  });

  it("does not match on guid alone or feed alone", () => {
    expect(isInPodcastQueue({ feedUrl: "https://example.com/feed.xml", guid: "g-9" }, index)).toBe(
      false
    );
    expect(
      isInPodcastQueue({ feedUrl: "https://example.com/nope.xml", guid: "g-1" }, index)
    ).toBe(false);
    expect(isInPodcastQueue({ guid: "g-1" }, index)).toBe(false);
    expect(isInPodcastQueue({}, index)).toBe(false);
    expect(isInPodcastQueue(null, index)).toBe(false);
    expect(isInPodcastQueue({ songId: 101 }, null)).toBe(false);
  });

  it("never throws on malformed queue snapshots", () => {
    expect(isInPodcastQueue({ songId: 1 }, buildQueueIndex(null))).toBe(false);
    expect(isInPodcastQueue({ songId: 1 }, buildQueueIndex([null, undefined, {}]))).toBe(false);
    expect(episodeKey("", "g")).toBe("");
    expect(episodeKey("https://a/b", "")).toBe("");
    expect(normalizeFeedKey(null)).toBe("");
  });
});

describe("queue button state", () => {
  const index = buildQueueIndex(QUEUE);

  it("labels the control from membership and keeps it focusable", () => {
    const added = queueButtonState({ songId: 101 }, index);
    expect(added.inQueue).toBe(true);
    expect(added.label).toBe(QUEUE_IN_LABEL);
    expect(added.iconName).toBe(QUEUE_IN_ICON);
    expect(added.ariaPressed).toBe(true);
    expect(added.ariaDisabled).toBe(true);
    // No native `disabled`: it would drop the control out of the tab order.
    expect(added).not.toHaveProperty("disabled");

    const pending = queueButtonState({ songId: 999, feedUrl: "https://x/y", guid: "z" }, index);
    expect(pending.inQueue).toBe(false);
    expect(pending.label).toBe(QUEUE_ADD_LABEL);
    expect(pending.iconName).toBe(QUEUE_ADD_ICON);
    expect(pending.ariaPressed).toBe(false);
    expect(pending.ariaDisabled).toBe(false);
  });

  it("emits markers that let the button be repainted in place", () => {
    const attrs = queueButtonAttrs({ songId: 101, feedUrl: "https://e/f.xml", guid: "g" }, index);
    expect(attrs).toContain('aria-pressed="true"');
    expect(attrs).toContain('aria-disabled="true"');
    expect(attrs).toContain('data-queue-song="101"');
    expect(attrs).toContain("data-queue-key=");
    // aria-disabled (not disabled) so the control stays keyboard reachable.
    expect(attrs).not.toMatch(/\sdisabled/);
  });

  it("menu attrs keep data-more-act reachable and carry the same markers", () => {
    const attrs = queueMenuAttrs({ songId: 101, feedUrl: "https://e/f.xml", guid: "g" }, index, 3);
    expect(attrs).toContain('data-idx="3"');
    expect(attrs).toContain('aria-disabled="true"');
    expect(attrs).toContain("data-queue-song=");
    expect(attrs).not.toMatch(/\sdisabled/);
  });
});

/** Minimal element stand-in: `repaintQueueButtons` only uses these methods. */
function fakeButton(attrs = {}, opts = {}) {
  const map = new Map(Object.entries(attrs));
  const classes = new Set();
  const labelSpan = opts.icoOnly ? null : { textContent: "加入播放列表" };
  const icoSpan =
    opts.icoOnly || opts.withIco
      ? {
          className: "ico",
          textContent: "ICON",
          html: "ICON",
          getAttribute: (k) => (k === "style" ? "width:17px;height:17px" : null),
          set outerHTML(v) {
            this.html = v;
            this.textContent = v;
          },
          get outerHTML() {
            return this.html;
          },
        }
      : null;
  return {
    tagName: "BUTTON",
    classList: { toggle: (name, on) => (on ? classes.add(name) : classes.delete(name)) },
    has: (name) => classes.has(name),
    getAttribute: (k) => (map.has(k) ? map.get(k) : null),
    setAttribute: (k, v) => map.set(k, String(v)),
    removeAttribute: (k) => map.delete(k),
    querySelector: (sel) => {
      if (sel === "span:not(.ico)") return labelSpan;
      if (sel === ".ico") return icoSpan;
      if (sel === "span") return labelSpan || icoSpan;
      return null;
    },
    span: labelSpan,
    icoSpan,
  };
}

function fakeRoot(buttons) {
  return { querySelectorAll: () => buttons };
}

describe("repaintQueueButtons", () => {
  it("flips a button to 已在播放列表 and back without a re-render", () => {
    const btn = fakeButton({ "data-queue-song": "101", "data-queue-key": "x::y" });
    const root = fakeRoot([btn]);

    expect(repaintQueueButtons(root, buildQueueIndex(QUEUE))).toBe(1);
    expect(btn.getAttribute("aria-disabled")).toBe("true");
    expect(btn.getAttribute("title")).toBe(QUEUE_IN_LABEL);
    expect(btn.span.textContent).toBe(QUEUE_IN_LABEL);
    expect(btn.has("is-in-queue")).toBe(true);

    expect(repaintQueueButtons(root, buildQueueIndex([]))).toBe(1);
    expect(btn.getAttribute("aria-disabled")).toBe("false");
    expect(btn.getAttribute("title")).toBe(QUEUE_ADD_LABEL);
    expect(btn.span.textContent).toBe(QUEUE_ADD_LABEL);
    expect(btn.has("is-in-queue")).toBe(false);
  });

  it("is safe with a missing root or index", () => {
    expect(repaintQueueButtons(null, buildQueueIndex(QUEUE))).toBe(0);
    expect(repaintQueueButtons(fakeRoot([]), null)).toBe(0);
    expect(repaintQueueButtons({}, buildQueueIndex(QUEUE))).toBe(0);
  });

  it("swaps an icon button to listChecks without writing the label into .ico", () => {
    const btn = fakeButton({ "data-queue-song": "101" }, { icoOnly: true });
    expect(repaintQueueButtons(fakeRoot([btn]), buildQueueIndex(QUEUE))).toBe(1);
    expect(btn.getAttribute("title")).toBe(QUEUE_IN_LABEL);
    expect(btn.icoSpan.html).toContain(ICONS[QUEUE_IN_ICON]);
    expect(btn.icoSpan.html).not.toContain(QUEUE_IN_LABEL);
    expect(btn.span).toBeNull();

    expect(repaintQueueButtons(fakeRoot([btn]), buildQueueIndex([]))).toBe(1);
    expect(btn.icoSpan.html).toContain(ICONS[QUEUE_ADD_ICON]);
    expect(btn.getAttribute("title")).toBe(QUEUE_ADD_LABEL);
  });
});

describe("pending rows are not membership", () => {
  it("skips loading placeholders so buttons do not claim 已加入", () => {
    const index = buildQueueIndex([
      { id: 1, feedUrl: "https://feed.example/show", guid: "real" },
      { id: "pending:https://feed.example/show::new", pending: true, feedUrl: "https://feed.example/show", guid: "new" },
    ]);
    expect(isInPodcastQueue({ feedUrl: "https://feed.example/show", guid: "real" }, index)).toBe(true);
    expect(isInPodcastQueue({ feedUrl: "https://feed.example/show", guid: "new" }, index)).toBe(false);
  });
});

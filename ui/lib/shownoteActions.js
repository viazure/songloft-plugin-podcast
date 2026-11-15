/**
 * ShowNote footer action descriptors and a CSS-layout model for the 3.3 ladder.
 *
 * Visible short labels are for narrow widths only; aria-label / title always
 * carry the full name. Click handlers stay in the view so close:true semantics
 * are not redefined here.
 */

export const SHOWNNOTE_FOOT_CLASS = "modal__foot--episode-actions";
export const EPISODE_ACTION_MIN_HIT_PX = 44;
export const EPISODE_ACTION_GAP_PX = 8;
export const EPISODE_ACTION_FOOT_PAD_X_PX = 32;
/** Matches the existing mobile sheet breakpoint in static/css/app.css. */
export const EPISODE_ACTION_WRAP_MAX_WIDTH_PX = 720;
export const EPISODE_ACTION_ORDER = ["play", "queue", "cast", "favorite"];

/**
 * @param {{ favorited?: boolean } | null | undefined} ep
 */
export function shownoteFootActions(ep) {
  const favorited = !!(ep && ep.favorited);
  return [
    {
      key: "play",
      label: "播放",
      shortLabel: "播放",
      ariaLabel: "从这一集开始，按播放列表顺序继续",
      title: "从这一集开始，按播放列表顺序继续",
      kind: "primary",
      iconName: "play",
      close: true,
    },
    {
      key: "queue",
      label: "加入播放列表",
      shortLabel: "加入列表",
      ariaLabel: "加入播放列表",
      title: "加入播放列表",
      kind: "tonal",
      iconName: "listPlus",
      close: true,
    },
    {
      key: "cast",
      label: "投放到音箱",
      shortLabel: "投放",
      ariaLabel: "投放到音箱",
      title: "投放到音箱",
      kind: "ghost",
      iconName: "speaker",
      close: true,
    },
    {
      key: "favorite",
      label: favorited ? "取消收藏" : "收藏",
      shortLabel: favorited ? "已收藏" : "收藏",
      ariaLabel: favorited ? "取消收藏" : "收藏",
      title: favorited ? "取消收藏" : "收藏",
      ariaPressed: favorited,
      kind: "ghost",
      iconName: "star",
      close: true,
    },
  ];
}

/**
 * Model of the CSS rules (not a measured layout). Zoom is treated as shrinking
 * the layout viewport, which is how desktop page-zoom typically behaves.
 *
 * @param {number} viewportCssPx
 * @param {{ zoom?: number }} [opts]
 */
export function episodeActionsLayout(viewportCssPx, opts = {}) {
  const zoom = opts.zoom && opts.zoom > 0 ? opts.zoom : 1;
  const layoutVw = viewportCssPx / zoom;
  const modalWidth = layoutVw <= 720 ? layoutVw : Math.min(760, layoutVw - 24);
  const inner = Math.max(0, modalWidth - EPISODE_ACTION_FOOT_PAD_X_PX);
  const wrap = layoutVw <= EPISODE_ACTION_WRAP_MAX_WIDTH_PX;
  const cols = wrap ? 2 : 4;
  const gaps = (cols - 1) * EPISODE_ACTION_GAP_PX;
  const cellWidth = cols > 0 ? (inner - gaps) / cols : 0;
  return {
    layoutVw,
    modalWidth,
    inner,
    rows: wrap ? 2 : 1,
    cols,
    gap: EPISODE_ACTION_GAP_PX,
    cellWidth,
    cellMinHeight: EPISODE_ACTION_MIN_HIT_PX,
    hitAreaOk: cellWidth >= EPISODE_ACTION_MIN_HIT_PX,
  };
}

# Songloft 播客（Podcast RSS）

订阅公开播客 RSS；剧集按需入库为 `remote` 曲；固定宿主歌单「播客」作为唯一播放列表；插件页内通过宿主 `player.play` 点播。

## 0.4.0 范围

- 导航：更新 | 收藏 | 历史 | 订阅 | 设置（均带图标；「更新」=频道新上架，「历史」=收听记录）
- 列表：最近更新（按「M月 D日」分组）、收藏（可搜索）、收听历史、订阅（频道卡片 + 搜索）
- 播放列表：桌面右栏 / 移动端底部抽屉；拖拽排序、多选删除、移除已播放
- 播放器：桌面完整控制；移动端紧凑单行，点标题展开进度与跳转
- ShowNote：点击条目标题弹出的居中窗口（移动端底部上滑板）
- 订阅：OPML 预览导入 + OPML 2.0 导出
- 小爱音箱：经插件间通信 `songloft.comm` 把单集投放到「智能音箱」插件
- 统一弹窗：所有确认/详情/导出兜底都走同一 modal，不使用 `confirm()`
- 刷新订阅只更新剧集索引，不批量 `songs.create`，不改播放列表
- 收听进度：插件 `songloft.storage`（feedUrl+guid）；已听完与「在列表中」正交

## 不做

云同步进度、下载落盘、视频播客、付费/登录 RSS、倍速、默默 `setQueue`、Moon FM 私有搜索。

## 开发

```bash
npm install
npm test
npx songloft-plugin validate
npx songloft-plugin build     # prebuild 先把 ui/ 打包成 static/js/app.js
```

前端源码在 `ui/`（`main.js` 入口 + `lib/` + `views/`），`static/js/app.js` 是构建产物。
本地纯浏览器预览可用任意静态服务器指向 `dist/_build/static` 并注入 `SongloftPlugin` 桩。

### 响应式断点

| 断点 | 布局 |
|---|---|
| `> 900px` | 桌面：主区 + 右侧播放列表栏 |
| `721–900px` | 单列：播放列表收进抽屉（不折叠为侧栏，避免主区被压窄） |
| `≤ 720px` | 手机：播放列表底部抽屉、播放器紧凑单行（点标题展开）、条目缩小、弹窗变底部上滑板 |

说明：手机断点取 `720px` 而非 `560px`——插件页常以窄侧栏形式出现，`560–720px` 区间若仍用双栏布局，主区会被压到 200px 左右而不可用。`900px` 与设计稿一致。

未经同意不要 `songloft-plugin dev`（会热更真实实例）。

## 播放路径

1. 准备：`POST /api/episodes/prepare` → `songs.create`
2. 列表：`POST /api/queue/add` → 固定歌单「播客」
3. 出声：客户端 `SongloftPlugin.player.play(songId)`（默认）；`setQueue` 仅二次确认

## OPML

通用 OPML 2.0；确认导入不拉 RSS、不改播放列表。导出走 `GET /api/opml/export`。

## 小爱音箱投放

`POST /api/cast/miot` → `songloft.comm.call("miot", castAction, { song_id })`。
插件在 `plugin.json` 声明 `inter-plugin` 权限；动作名默认 `play`，可在「设置 → 智能音箱」调整。
投放失败时弹窗提供「打开插件页」（直达 `/api/v1/jsplugin/miot/`）与「去设置」入口。

## ShowNote 安全

ShowNote 是外部 RSS 内容，双端都做白名单过滤：

- 入库：`src/rss.ts` 的 `sanitizeShowNoteHtml()`（标签白名单；仅保留 `img[src|alt]`、`a[href]`；仅允许绝对 http(s)）
- 渲染：`ui/lib/sanitize.js` 的 `sanitizeShowNote()`，在写入 `innerHTML` 前再过滤一次（防历史脏数据）
- 测试：`tests/showNoteXss.test.ts` 覆盖 `<script>`、`on*` 事件、`javascript:`/`data:`/`vbscript:`/`file:`、非法 `<img src>`、iframe/svg/style、标签不闭合、幂等性

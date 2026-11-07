# Songloft 播客（Podcast RSS）

订阅公开播客 RSS，把剧集入库为 `type=remote` 曲，并覆盖同步到「每订阅一张」歌单。

## 本刀范围（0.1.0）

- 订阅增删改、校验 channel + audio enclosure
- 最近 N 集（默认 50）剧集列表
- 刷新：重拉 feed → upsert remote → 覆盖歌单曲目集
- 定时刷新默认关（建议间隔 6h，插件内定时器）
- 删订阅只去管理项，保留歌单/remote 曲

## 不做

收听进度、下载落盘、视频播客、付费/登录 RSS、直连音箱、OPML 确认时自动刷新。

## 开发

```bash
npm install
npm test
npx songloft-plugin validate
npx songloft-plugin build
```

Review 通过前不热更到现网。

## 播放路径

剧集入库后出现在对应歌单；在 Songloft 客户端打开该歌单点播即可（当前 SDK 无 `player.setQueue`，本刀不直打 miot）。

## 歌单覆盖

SDK 无 `playlists.replaceSongs`；实现为 clear（`removeSongs`）+ `addSongs`，与 Last.fm Loved 同语义。

## OPML 导入

- 通用 OPML 2.0 订阅解析（不按小宇宙 / Moon FM 分支）
- 上传/粘贴 → 离线预览（新增/重复/无效/警告）→ 确认后只新增订阅管理项
- 确认导入 **不** 拉 RSS、不建歌单、不播放；之后用「刷新全部」或单条刷新
- Moon FM 样本仅离线单测；禁止对其 feed 做现网导入/联机探测


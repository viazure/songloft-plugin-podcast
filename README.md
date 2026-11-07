# Songloft 播客（Podcast RSS）

订阅公开播客 RSS，把剧集入库为 `type=remote` 曲，并覆盖同步到「每订阅一张」歌单。

## 本刀范围（0.1.0）

- 订阅增删改、校验 channel + audio enclosure
- 最近 N 集（默认 50）剧集列表
- 刷新：重拉 feed → upsert remote → 覆盖歌单曲目集
- 定时刷新默认关（建议间隔 6h，插件内定时器）
- 删订阅只去管理项，保留歌单/remote 曲

## 不做

收听进度、下载落盘、OPML、视频播客、付费/登录 RSS、直连音箱。

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

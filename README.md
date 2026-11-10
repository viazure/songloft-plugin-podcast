# Songloft 播客

Songloft 上的**泛用型播客**：用公开 RSS 订阅收听，不依赖喜马拉雅等平台内容库。浏览更新、收藏单集、继续收听，节目放进固定歌单「播客」播放。

## 功能

- **更新**：各频道新上架的节目，按日期分组浏览
- **收藏**：收藏过的单集，支持搜索
- **历史**：最近听过的节目，可续播；进度保存在本机
- **订阅**：添加 / 管理 RSS 频道；支持 OPML 导入与导出
- **播放列表**：固定歌单「播客」——排序、多选删除、清理已播
- **播放器**：桌面完整控制；手机上为紧凑条，点标题可展开进度与跳转
- **节目介绍**：点条目标题查看 Show Notes
- **小爱音箱**：一键投放到已安装的「智能音箱」插件（需音箱能访问本机网络地址）
- **定时刷新**：可在设置里打开，定期拉取订阅更新

## 安装

### 从 Songloft「GitHub 发现」

1. 打开 Songloft → **插件** → 选源 / GitHub 发现
2. 搜索 **播客** 或 `podcast`
3. 安装并启用

### 手动上传

1. 从 [Releases](https://github.com/viazure/songloft-plugin-podcast/releases) 下载 `podcast.jsplugin.zip`
2. Songloft → **插件** → 上传该 ZIP → **启用**「播客」

需要 Songloft ≥ **2.8.0**。

## 使用说明

1. 打开插件 → **订阅**，粘贴播客 RSS 地址添加频道（也可导入 OPML）
2. 在 **更新** 里点节目收听；需要时可收藏，或加入播放列表排队
3. 没听完的进度会记在本机，可从 **历史** 或列表继续听
4. 想用小爱音箱听：先装好并登录「智能音箱」插件，再在条目上选投放；失败时可按提示打开音箱插件页或去设置检查

### 关于「保活」（建议看一眼）

Songloft 空闲约 10 分钟后可能卸载插件。若之后只从宿主底栏点播，收听历史有时会漏记。

插件启动时会尽量把自己加入 Songloft 的插件保活名单。若仍漏记，请到 Songloft 设置里把 `podcast` 加进 **plugin-keep-alive**。在插件页内点播、拖进度不受影响。

## 开发

```bash
npm install
npm test
npx songloft-plugin validate
npm run build
# 产物：dist/podcast.jsplugin.zip
```

前端在 `ui/`，构建后写入 `static/js/app.js`。需要 `@songloft/plugin-builder` / `@songloft/plugin-sdk`。

未经同意不要跑 `songloft-plugin dev`（会热更真实实例）。

## 发现与更新

- 仓库：https://github.com/viazure/songloft-plugin-podcast
- 自动更新读取仓库根目录 `plugin.json`
- 安装包：对应 Release 中的 `podcast.jsplugin.zip`

## License

[Apache-2.0](./LICENSE)

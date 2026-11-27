# 微信小游戏远程资源

## 包内与远程的划分

- 留在小游戏包内：引擎与适配层（`cocos-js/`、`web-adapter.js`、`engine-adapter.js`、`first-screen.js` 及 Cocos 启动图）、`src/`（设置、脚本块、`effect.bin`、`bundle-scripts/resources/` 下的 resources 包脚本）、`internal` 分包（引擎内置材质）、`main` 分包（全部游戏脚本和 PinePilot 场景）。
- 放到远程：整个 `resources` 资源包，即 `cocos-pilot/assets/resources/` 下的全部美术和音频（怪物动作图集、技能特效、藏书阁物品、宗门场景、加载图、图标、音效等，构建后约 260 MiB）。
- 原因：微信主包和单个分包都不能超过 4 MiB，总包不能超过 20 MiB；仅 `sect-scene/` 就有约 21 MiB，菜单美术无法放在包内。Cocos 的 Asset Bundle 不支持嵌套，拆出首屏小包需要改动大量按路径加载的代码，因此本次整体远程加载，游戏代码不改。慢速或失败的加载仍由现有的加载队列（15 秒超时、重试 3 次）和加载界面「重新加载」按钮处理。
- 实际大小见每次构建后的 `cocos-pilot/package-report.json`（`mainBytes`、`subpackageBytes`、`totalBytes`、`remoteBytes`）。

## 远程地址配置

- 唯一配置项：`release/settings.json` 的 `remoteAssetBaseUrl`，当前为本地测试值 `http://127.0.0.1:8091/`。
- 临时覆盖：构建时设置环境变量 `WECHAT_REMOTE_BASE_URL`，例如 `WECHAT_REMOTE_BASE_URL=https://cdn.example.com/game/ npm run cocos:build:wechat`。
- 地址必须以 `http://` 或 `https://` 开头，末尾缺少 `/` 会自动补上。地址在构建时写入 `src/settings.*.json`，切换地址后需要重新构建。

## 构建产物

`npm run cocos:build:wechat` 生成两个目录：

- `cocos-pilot/build/wechatgame/`：小游戏包（开发者工具打开并上传的目录）。
- `cocos-pilot/build/wechatgame-remote/`：远程资源目录，内容为 `remote/resources/...`。它在小游戏目录之外，不会被开发者工具上传。

## 本地测试（微信开发者工具）

1. `npm run cocos:build:wechat`
2. 另开终端运行 `npm run cocos:serve:remote`（在 8091 端口提供 `wechatgame-remote/`，每个请求打印一行日志）。
3. 开发者工具打开项目，在「详情 → 本地设置」勾选「不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书」。
4. 编译运行；服务器日志中应出现 `/remote/resources/config.*.json` 和 `/remote/resources/native/...` 请求。

## 真机局域网测试

1. 手机与 Mac 连接同一 Wi‑Fi；`npm run cocos:serve:remote` 启动后会打印 Mac 的局域网地址。
2. 用该地址重新构建：`WECHAT_REMOTE_BASE_URL=http://<Mac 局域网 IP>:8091/ npm run cocos:build:wechat`。
3. 开发者工具「预览」扫码，在手机上打开调试模式（右上角菜单 → 开发调试 → 打开调试），否则未配置的域名会被拦截。

## 正式上传

1. 准备一个 HTTPS 地址（微信云存储或 CDN），把 `cocos-pilot/build/wechatgame-remote/` 目录里的**内容**上传到该地址的根目录，使 `<地址>remote/resources/config.*.json` 可以直接访问。
2. 在小游戏后台「开发管理 → 开发设置 → 服务器域名」把该域名加入 downloadFile 合法域名。
3. 把 `release/settings.json` 的 `remoteAssetBaseUrl` 改为该地址，重新运行 `npm run cocos:build:wechat`，再上传小游戏包。
4. 文件名带 md5（`md5Cache` 已开启），重新上传时只需增量上传新文件；旧文件可以保留，不影响已发布版本。

## 已知限制

- `resources` 仍在启动预加载列表中，游戏启动时会先下载远程 `config.*.json`（约 0.35 MiB）；远程地址不可达时，游戏会停在 Cocos 启动画面。
- 首次进入各页面和楼层需要联网下载对应美术，之后由微信缓存。

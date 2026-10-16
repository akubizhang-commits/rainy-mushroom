# 雨后菌语

微信小游戏，Cocos Creator 3.8.8。当前唯一玩法是「雨后森林幸存者」：竖屏割草生存，小旅人在雨后森林里自动攻击被浊雾附身的虫群，拾取孢子升级、三选一强化。Sprint 1 为几何占位美术的可玩原型（1 种武器、2 种敌人、存活 180 秒胜利）。

旧玩法（森林冒险、图书馆、装箱）已删除。

设计与计划：[docs/survivor/](docs/survivor/)，从 `00-project-plan.md` 和 `07-sprint-1-backlog.md` 开始看。

## 开发与试玩

- `npm test`：全部测试（逻辑层、打包、入口）。
- `npm run survivor:test`：只跑幸存者逻辑层测试。
- `npm run check`：源码语法与依赖检查。
- `node scripts/survivor/preview-run.mjs [seed]`：不开引擎，用文字跑一局模拟，看数值节奏。
- `npm run cocos:build`：构建浏览器版本；`npm run preview` 启动本地服务，打开终端里的地址试玩。加 `?smoke=1` 跑自动冒烟。
- `npm run cocos:build:wechat`：构建微信版本，不上传、不发布。微信开发者工具使用根目录配置，项目路径指向 `cocos-pilot/build/wechatgame/`，普通编译即进入游戏。

## 结构

- `js/survivor/`：引擎无关的纯逻辑（固定步长模拟、刷怪、武器、升级、存档），`npm run cocos:sync` 同步到 `cocos-pilot/assets/scripts/shared/`，同步副本不要手改。
- `cocos-pilot/assets/scripts/Survivor*.ts`：Cocos 表现层（视图、战斗绘制、输入、HUD、平台适配、冒烟）。
- `cocos-pilot/assets/scripts/PinePilot.ts`：场景宿主，名称和 UUID 保留以维持场景引用。
- `cocos-pilot/assets/survivor/`：survivor 分包（占位图集），`npm run survivor:art` 重新生成。
- `js/services/`：广告与隐私服务；`assets/cases/`、`design/`：保留的资料与美术源稿，不进运行包。
- `docs/`：`docs/survivor/` 是当前依据，其余为历史记录。

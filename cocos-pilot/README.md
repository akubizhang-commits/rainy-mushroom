# 栖云宗 · Cocos 工程

Cocos Creator 3.8.8。保留 PinePilot 场景名称与 UUID，唯一入口为 TowerView。

从项目根运行 `npm run cocos:build`、`npm run preview`，直接打开 `build/web-mobile/` 即可进入横屏宗门。无需 `ruleset` 或 `tower` 参数；旧玩法及其专用素材已删除。

`assets/scripts/shared/` 由 `scripts/cocos/sync-shared.mjs` 从当前宿主依赖生成，禁止手改。浏览器 `smoke=1` 使用内存档，普通入口使用宗门永久存档。

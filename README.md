# 栖云宗 · 宗门与九层锁妖塔

当前唯一运行玩法为横屏宗门与锁妖塔。2026-10-31 已移除旧森林、蘑菇幸存者及早期装备试玩代码、专用素材和工具；打开构建页即可进入宗门，无需模式参数。

- `npm run cocos:build`：同步当前逻辑并构建浏览器版。
- `npm run preview`：启动本地服务，打开终端输出的游戏地址。
- `npm run cocos:build:wechat`：构建微信版。
- `npm test`：运行测试；`npm run check`：检查源码与依赖。
- `js/xianxia/`：当前战斗、养成、存档及共享函数。
- `cocos-pilot/assets/scripts/`：当前 Cocos 表现层；`shared/` 由同步脚本生成。
- `cocos-pilot/assets/resources/`：当前游戏素材。

`smoke=1` 为内存档验收入口，普通入口使用独立永久存档。设计原稿、付费特效源文件、生成记录和历史验收报告保留在 `design/`、`docs/`、`reports/`，不作为旧玩法运行入口。

现行规则见 `docs/xianxia/sect-tower-v1/31-current-requirements.md`；交接见 `CODEX_HANDOFF.md`。

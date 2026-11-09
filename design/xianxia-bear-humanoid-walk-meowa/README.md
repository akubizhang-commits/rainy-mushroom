# 高阶熊妖（撼地熊王）行走已接入 · 2026-11-06

接续 `../xianxia-bear-humanoid-walk-scenario/`（11-05 因 Scenario 额度 429 未提交）。本次 Meowa 当日有 20 积分，改用 Meowa V2 一次生成，10 积分；Scenario request.json 未提交、无费用。

- 输入：已验收母图的绿幕参考 `reference-green.png`（同 Scenario 目录那张，未重画）。prompt 见 `prompt.txt`。
- 源片：`v1/original.webp` 640px/16帧/约1.625秒，逐帧 `v1/raw-frames/`，帧时长 `v1/durations.json`，原片全部保留。
- 导出：`export.py`。去绿+去溢色，所有帧同一倍率 0.7667（按静态立绘主体高 0.805、脚底 0.9 校准），逐帧脚底贴 432px；16帧全用（去掉第15帧会使接缝变为平均位移的1.75倍）。接缝/平均位移 0.61。输出 `final/`：16帧 480px、1920² 图集（RGBA 14.06MiB）、预览 gif/webp、contact。
- 接入：`tower-monsters-motion/bear-humanoid-v1.png/json`；`TowerMonsterArt.ts` 把 bear-humanoid 加入独立行走图集族（改前副本 `TowerMonsterArt.before.ts`）。只在实际位移时播放；静止、普攻（bite/slam）、M02/M04/M07/M09 机制回退原立绘。低阶 bear 拍地图集不会被高阶熊妖加载。
- 测试：新增 bear-humanoid 行走单测，更新旧“熊族不加载动作”断言；相关 4 个测试文件 95/95 通过。全仓 2378/2381，3 项失败在改前代码下同样失败，与本次无关（见 production.json）。
- 实机：Cocos web-mobile 构建成功；`verify.cjs` 8 个正式原型（普通/精英/第6层Boss）×左右×1280/844 双横屏共 32 组通过：真实位移、完整 16 帧循环、暂停不变、静止/攻击/机制回退、标签、击杀单次清理、存档不变。首轮 844 页面加载超时记录于 `browser-run1-timeout-844.json`，重跑通过。截图 `game-review/`。
- 熊王无狂暴技能，未追加。未上传 Scenario 集合（本会话无 Scenario MCP），微信真机未验。

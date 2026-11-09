# 青莲剑阵重做 验收说明

分支 `codex/qinglian-redo-2026-11-09`，基于 `e5b65c59`。未合并主线。

## 本轮修复（对应 build-review 的三项阻断）

- B1 视觉接入：新增 `cocos-pilot/assets/scripts/QinglianVortexArt.ts`，用 `resources.load` 加载 `tower-skill-fx/qinglian-vortex-layer-v1` 与 `qinglian-pool-v1`。涡旋层不旋转，位于战斗世界图形之下；阵眼淡光在涡旋层之下。`TowerView.ts` 接入创建、清理、死亡与退出的生命周期。`QinglianFormationArt.ts` 增加 r≈200 的外层装饰弧（不判定，随外层旋转）。
- B2 平衡复跑：脚本加入 `qinglian` 流派，前后各跑一次（见下）。
- B3 实机：`scripts/verify-qinglian-live.cjs` 改为三轮、每秒一轮、冷却 9 秒、10 个范围内目标加 1 个范围外目标，并统计每轮每目标命中。两个视口均通过。
- 测试桩：`tests/xianxia-material-feedback.test.mjs` 与 `tests/xianxia-tower-host-tools.test.mjs` 加入 `qinglianArt`/`QinglianVortexArt`，只补桩，不改断言。

## 判定规则（运行时，沿用上一次提交）

- 冷却 9 秒，法力 8，解锁 7 级，阶段不变。
- 持续 3 秒，三轮，每轮 1 秒，0/1/2 秒施放。顺序：外 16 瓣（20%）→ 中 12 瓣（35%）→ 内 8 瓣（45%）。
- 转速：内 10.05、中 8.17、外 6.6 rad/s，全部顺时针。外层一轮内转过 6.6 rad，大于 2π，因此每瓣每轮必扫过范围内每个目标。
- 目标不设上限。同一目标三轮合计 36 次（16+12+8），单次伤害 = 环占比 ÷ 瓣数。
- 判定剑从阵眼辐射到 r=200，三环共用半径。

## 验证结果（真实数字）

- 相关 node --test（4 个文件）：140 通过，0 失败。
- 宿主桩相关测试：`xianxia-tower-host-tools` + `xianxia-material-feedback`：197 通过，0 失败。
- 全量 `npm test`：2401 个，2400 通过，1 失败。失败项为 "encyclopedia shows fixed stats, unique quality and explicit art gaps"，即基线失败（见 `baseline/fail-names.txt`）。新增失败 0。输出：`full-tap-after-3.txt`。
- 注意：`docs/xianxia/reports/monster-mechanics-2026-10-31/baseline-failures.json` 含 210 个名字，与本分支实际基线（1 个失败）不一致。对照以本分支实际基线为准。
- `npm run cocos:sync`：退出码 0。
- `npm run cocos:build`（web-mobile）：构建成功，日志 `cocos-pilot/temp/pilot-builds/web-mobile.log` 含 "build Task (web-mobile) Finished"。日志中另有一条 SIGTERM 调试信息，属于构建子进程退出，构建本身完成。
- `npm run cocos:test`：6 通过，0 失败。输出：`cocos-test.txt`。
- 实机（`live/live-results.json`，status PASS，0 页面错误）：
  - 1280×720 与 844×390 两个视口均通过。
  - 三轮时间为 0.78、1.78、2.78 秒（间隔 1 秒），每轮区间 3 秒。
  - 冷却间隔 9 秒。
  - 暂停后时间与轮次冻结，恢复后继续。
  - 死亡后阶段为 lost，退出后运行清理。
  - 范围内 10 个目标每个各 36 次命中；范围外目标 0 次。
  - 录像与截图位于 `live/`：`video-sj_qinglian-*`、`sj_qinglian-{cast,paused,after-resume,death,exit}-*.png`。
- 注意：截图里 `cast` 拍在 0.6 秒起阵期，涡旋层尚未出现；`paused` 拍到了暂停菜单遮挡画面。因此**涡旋层与阵眼淡光在实机画面中的呈现尚未用截图确认**。这是未完成的验收项。

## 平衡对照（`balance/before-after.md`）

- qi、yujian、formation 三个流派的前后结果逐项相同。
- qinglian 流派（由第 3 层起学到 sj_qinglian，第 2 层学不到）：
  - 胜场：第 3 层由 2/4 升至 3/4，其余层基本持平。第 4 层 2/4 不变。
  - 玩家受伤：第 6 层由 1034 升至 1476（约 +43%），第 3 层 389 升至 742（约 +91%），第 4 层 523 升至 561；第 8 层由 5002 降至 3925，第 9 层由 5825 降至 4822。
  - 最低血量比例：第 6 层由 0.31 降至 0.16。
- 注意：脚本模拟的是普通楼层战斗，不是专门的群怪场景。因此"取消目标上限后群怪伤害上升"无法从此表直接读出。群怪场景没有单独测量，这一点需要专门场景才能量化。
- 按用户指示，本轮未调数值。

## 存档

- 本轮未改存档结构。沿用上一次提交：`SCHEMA` 89 → 90，只重置本塔模式存档（`xianxia.sect-tower.campaign.v1`），不删除其他数据。

## 已知问题与待确认

1. 涡旋层视觉：参考图是透视椭圆，判定与绘制仍是俯视圆。当前按 r=200 的水平宽度等比缩放，保留了参考图的椭圆比例，因此竖向范围小于判定圆。需要用户看实机画面后确认是否接受，或改为压扁到圆。
2. 涡旋层与阵眼淡光在实机截图中未确认可见（见上）。
3. 技能图标 `sj_qinglian.png` 未改动。Cocos 构建会把其 `.meta` 的 `hasAlpha` 从 false 改为 true，本分支已还原该 `.meta`，未随提交。是否保留，请确认。
4. 受击反馈强度 .6 → .35（上次提交，计划中标注为需用户接受）。
5. 共享镜像由 `npm run cocos:sync` 生成，本轮 JS 运行时未改动，镜像无新差异。

## 工作文件

- 代码：`cocos-pilot/assets/scripts/QinglianVortexArt.ts`（新）、`QinglianFormationArt.ts`、`TowerView.ts`。
- 脚本：`scripts/verify-qinglian-live.cjs`、`scripts/verify-skill-school-curve.mjs`。
- 测试：`tests/xianxia-material-feedback.test.mjs`、`tests/xianxia-tower-host-tools.test.mjs`。
- 报告：`balance/`（before、after、before-after.md）、`live/`、`full-tap-after-3.txt`、`cocos-test.txt`、`build-web-mobile-2.txt`。

## 合并建议

本分支可按用户决定合并到 `codex/crafting-minigames`。合并前请先确认上面第 1、2、3 项。

## 群怪伤害（补充，对应审查 B2）
- 单目标 d=60：前 1556.3，后 1556.4，基本不变。
- 10 目标全在 200 px 内：前 7538.2（cap 6，只有 6 个目标受伤），后 13260.9，约 +76%。这是取消 cap 6 的直接结果。
- 数据与生成方式见 `balance/before-after.md` 的“群怪场景”一节。

## 视觉修改（用户实机反馈，判定规则不变）
1. 去掉外圈白色细圆线：`QinglianFormationArt.ts` 的起阵圈、爆发闪光圈和 r≈200 装饰弧刃都已移除。
2. 去掉中心向外的长直尖刃：判定剑不再绘制。`qinglianPetals`、`TowerSkillForms`、判定次数与伤害均未改动，测试仍断言 8/12/16 瓣的判定几何。周天剑阵与流云斩未改动。
3. 涡旋拆两层：`scripts/art/qinglian_vortex_split.py` 从 `qinglian-vortex-layer-v2.png` 按半径（分界 0.52，羽化 0.05）拆出外层大瓣与内层小瓣，输出 `qinglian-vortex-{outer,inner}-v3.png`（均为正圆、1395×1395）。alpha 之和与 v2 一致（误差 0）。原 v2 图保留。
4. 压扁：两层在正圆上旋转，父节点 `青莲地面压扁` 的 y 缩放为 897/1395（约 0.643，即 263:409），与参考椭圆一致。阵眼淡光不压扁，保持原 v2 pool 层。
5. 转速（仅视觉）：外层 1.6 rad/s、内层 0.7 rad/s，均为顺时针；两层同时开始。伤害、判定、三轮、冷却、持续时间、圆形判定半径均未改。

## 验证（本轮）
- `node --test tests/qinglian-formation-art.test.mjs tests/xianxia-tower-skill-forms.test.mjs tests/xianxia-tower-host-tools.test.mjs tests/xianxia-material-feedback.test.mjs`：292 通过，0 失败。新增断言：旋转方向与快慢，爆发与起阵不再绘制弧刃、判定线和圆线。
- 全量 `npm test`：2403 个，2402 通过，1 失败。失败为基线项 “encyclopedia shows fixed stats, unique quality and explicit art gaps”，新增失败 0。输出：`full-tap-after-4.txt`。
- `npm run cocos:build`：成功（exit 0）。日志：`build-web-mobile-3.txt`。
- `npm run cocos:test`：6 通过，0 失败。输出：`cocos-test-3.txt`。
- 爆发期截图（正常运行、不暂停）：`burst/burst-{early,mid}-{1280x720,844x390}.png`。截图确认判定线和长直尖刃已消失，阵眼淡光可见，伤害数字正常显示。**冰晶涡旋两层在这组无头截图中仍不可见**，与前一轮的无头截图问题一致。用户实机看到的效果需要以浏览器（localhost:8740，重新构建后）为准，本报告没有以无头截图验证涡旋层。

## 未完成与待确认
- 涡旋两层的实机可见性：无头截图无法确认，需要用户在浏览器中验收，尤其是外层快、内层慢和压扁的观感。
- 拆层的分界半径 0.52 为目测选定，可在验收后调整并重跑 `qinglian_vortex_split.py`。
- 内层小瓣比外层暗，若不满意可在 `QinglianVortexArt` 中调整颜色 alpha。

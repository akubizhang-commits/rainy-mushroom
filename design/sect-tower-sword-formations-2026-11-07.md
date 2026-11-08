# 周天剑阵迁移与青莲剑阵：设计与验收说明（2026-11-07）

范围：仙侠锁妖塔（sect-tower-v1）。周天剑阵（sj_wanjian）迁到炼气中期；新增青莲剑阵（sj_qinglian）放在炼气巅峰。两者都属于剑阵流派。

## 1. 已确认决定

| 项 | 结果 |
|---|---|
| 周天剑阵 | 从炼气巅峰（7 级）迁到炼气中期（4 级）。数值与机制不变：冷却 6 秒、持续 4 秒、剑数 4–8、同目标间隔 0.6 秒。 |
| 青莲剑阵 | 主动技能，剑阵流派，放在炼气巅峰（7 级）。 |
| 青莲数值 | 冷却 9 秒；法力 8；三层环：内 4 剑 / 中 6 剑 / 外 8 剑；同目标间隔 0.5 秒；伤害分配 20% / 35% / 45%，整招预算不随层数增加；范围 90 / 150 / 200 像素（约 0.6 / 1.2 / 2.0 米）；目标上限 6；起阵 0.3 秒、成阵 0.5 秒、爆发 1 秒、收势 0.4 秒。 |
| 视觉 | 瓣数 8 / 12 / 16；只有判定剑参与伤害；外层透明度低于内层（0.80 / 0.70 / 0.60）。 |
| 视觉语义 | 莲瓣形半透明剑刃，青白、淡青、银青为主色，中心月白。无水波、荷叶、露珠，无复杂法阵纹样。青莲不减速敌人。 |
| 伤害系数 | 用户确认：`damageCurve(8, 1.15)`，阶 1 为 8，阶 10 约 28.1。 |
| 平衡范围 | 用户确认 A：按 8 层 × 3 流派执行，注明对比局限。 |

## 2. 实现位置

- 运行时（js/xianxia）：`TowerGrowth.js`（阶段表、技能定义）、`TowerCharacterStats.js`（法力）、`TowerSkillTiming.js`（起阵与收势）、`TowerAttackActions.js`（施放顺序）、`TowerResonance.js`（剑阵共鸣）、`TowerWeapons.js`（名称与流派）、`TowerSkillForms.js`（几何与判定剑姿态）、`TowerRun.js`（施放、脉冲、存档校验）、`TowerQingping.js`（周期来源）、`TowerHitFeedback.js`（命中反馈）、`TowerSkillPresentation.js`（文案）、`TowerCampaign.js`（存档版本 88 → 89）。
- 镜像：cocos-pilot 下的 shared/js/xianxia，由 `scripts/cocos/sync-shared.mjs` 生成，未手改。
- 渲染：`cocos-pilot/assets/scripts/QinglianFormationArt.ts`、`TowerSkillEffects.ts`、`TowerMenu.ts`、`TowerCharacterArt.ts`。
- 技能树：`TowerSkillTreeCatalog.ts`。
- 图标：`design/sect-tower-sword-formations-2026-11-07/icons/sj_qinglian.svg`（源），`cocos-pilot/assets/resources/tower-skill-icons/sj_qinglian.png`（本地矢量制作，未调用 Scenario）。

## 3. 存档

存档版本从 88 升到 89。不兼容时只重置本项目塔模式的存档（`TOWER_CAMPAIGN_KEY`），不改其他键。正常存读档、失败原子性与重复领奖校验保留。

## 4. 验收证据

- 调色测试：`tests/qinglian-formation-art.test.mjs` 用色相区间 180–200 度检查调色板（替换了原来近乎空的检查）。3/3 通过。
- 干净构建：`node scripts/cocos/build.mjs web-mobile` 退出码 0，日志 `reports/sect-tower-sword-formations-2026-11-07/build/build-2026-11-07-full-resources.log`，无 `error TS`。
- 实机（真实游戏循环，横屏 1280×720 与 844×390）：脚本 `scripts/verify-qinglian-live.cjs`，结果 `reports/sect-tower-sword-formations-2026-11-07/live/live-results.json`，状态 PASS，无页面错误。
  - 学习：周天在炼气初期（Lv3）不可学、在炼气中期（Lv4）可学；青莲在 Lv6 不可学、在 Lv7 可学。
  - 周天施放时间 0.02–0.07 秒与 6.02–6.05 秒，间隔均为 6.0 秒。
  - 青莲施放时间 0.03 秒与 9.03–9.05 秒，间隔 9.0 秒；两次判定脉冲在约 0.8 秒与约 1.3 秒，间隔约 0.5 秒（实时采样误差约 50 毫秒）。
  - 暂停：青莲在第一次判定后暂停，时间与脉冲计数冻结；恢复后第二次判定正常发生。周天在冷却中暂停，时间冻结。
  - 死亡：暂停后设生命为 0 并推进一步，阶段变为 `lost`，区域数为 0。
  - 退出：回到山门，运行清空。
  - 录像：`live/video-*/` 下的 webm；截图：`live/*.png`。
- 平衡（8 层 × 3 流派，固定夹具，4 个种子）：见 `reports/sect-tower-sword-formations-2026-11-07/balance/comparison-2026-11-07.md`。

## 5. 已知限制与未解决项

- **伤害预算未在实机中单独验证。** 实机中敌人血量下降包含角色的普通攻击，无法归因到青莲。每次施放不超过预算的约束，只由单元路径保证。
- **第 4 层纯剑阵仍失败。** 平衡矩阵中 `formation` 路线在第 4 层为 0/4 通关，改动前后相同（改动前 0/4，改动后 0/4）。按决定未调数值。
- **第 3 层纯剑阵的对比不完全公平。** 改动前的夹具无法在 3 级学到周天，因此该行的前后差异来自夹具，不是纯粹的改动效果。
- **与 2026-11-06 报告不可直接比较。** 该报告的生成工具不在仓库中。本次使用的是 `verify-monster-mechanics-balance.mjs`，并为之新增了 `formation` 与 `yujian` 路线。
- **完整测试套件未在本轮运行。** 按流程，本轮只跑了直接相关的测试。完整套件在后续验证步骤中运行。
- **资源文件。** 359 个资源文件已直接提交到 codex/crafting-minigames（提交 `e060c191`），未设独立分支。有 20 MB 以上的文件无。总计 82.3 MiB。

## 6. 决策记录

- B1（资源文件）：用户决定直接提交到主线。已执行。
- B5 / S2（主线已被修改）：用户决定保留现状，仅记录，不改写历史。
- S4（合并基线）：用户决定直接在主线完成，不以独立分支交付。
- S7（第 4 层纯剑阵变慢）：用户接受。
- S9（伤害系数）：用户确认 A。

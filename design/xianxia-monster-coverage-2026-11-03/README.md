# 怪物技能表现覆盖审计 · 2026-11-03

**最新审查口径：有素材分支不等于技能素材完整；下方“待补0”是接入统计，不再作为素材制作收口依据。** 2026-11-04重新review修正：此前“19项有素材、待补0”仅代表渲染接入覆盖，不代表技能表现完整。M09土浪、M08尾扫仍为尘纹过渡；普通slam/sweep未自动接入M07/M08特效，另有M03回血联系、M04护甲解除、M22裂卵反馈可补。M16优先调整喷息连接而非重画。先复用；M08动作仍暂缓。完整分级审查见design/xianxia-monster-skill-material-review-2026-11-04/README.md。本轮未改运行代码、未生成素材、未做新全量实战。

**2026-11-04更新：M24地印复用已接入技能库，65项测试、Web构建和双横屏低血量/安全区伤害/暂停/清理通过。当前19项专用素材、5项角色/状态，专用表现待补0项；不等于所有角色动画或微信真机验收。前轮首层别名数值失败未修复。最新逐项数据见coverage.json。**

本表逐项对照TowerMonsterMechanics、TowerMonsterMechanicsView、TowerMonsterArt与专用Art类。专用素材≠所有怪物动作验收；历史浏览器报告≠微信真机验收。本轮只审计与记录，没有新生成、运行时修改或构建。

| 技能 | 正式Boss楼层 | 当前覆盖 | 证据/下一步 |
|---|---|---|---|
| M01 镜魄分身 | 2、9 | 角色复用：分身复用怪物图并青色半透明；狼有技能动作。 | 无需新母图；其他物种动作另验。 |
| M02 血怒狂暴 | 1、4、9 | 角色状态：现有变红、放大与狂暴动作规则。 | 不因无需新图而推定所有怪物动作已验收。 |
| M03 汲灵回生 | 5 | 专用素材：core_ling灵核，TowerCoreArt | 历史报告 PASS，2组；[记录](../../design/xianxia-monster-core-2026-11-03/game-review/report.json) |
| M04 岩甲蛰伏 | 6 | 专用素材：凝灵晶，TowerCrystalArt；随从复用角色 | 历史报告 PASS，2组；[记录](../../design/xianxia-monster-crystal-2026-11-03/game-review/report.json) |
| M05 号令群妖 | 2、8 | 角色复用：随从复用角色；狼有号令动作。 | 无需独立静态母图。 |
| M06 裂岩冲锋 | 1、7、9 | 动作＋通用预警：胶囊预警/移动本体；妖猪有冲锋动作。 | 其他Boss动作覆盖需单独核对，不强行复用妖猪动作。 |
| M07 裂地重踏 | 6、7 | 专用素材：复用M15尘浪，整圆判定保留 | 历史报告 PASS，6组；[记录](../../design/xianxia-monster-stomp-2026-11-03/game-review/report.json) |
| M08 回旋尾扫 | 4 | 专用素材：复用M15尘浪，保留216度实心扇形提示。 | [复核记录](../xianxia-monster-tail-sweep-2026-11-04/README.md)；角色回旋动作仍暂缓。 |
| M09 撼岳掀浪 | 6 | 专用素材：复用M15土石尘浪，保留整条胶囊提示。 | [验收记录](../xianxia-monster-earth-wave-2026-11-04/README.md)；本体不冲锋，非角色拍地动画。 |
| M10 缚足蛛网 | 3 | 专用素材：蛛网，TowerSpiderWebArt | 已接入；[历史报告](../../design/xianxia-spider-web-2026-11-03/game-review/report.json)，本轮未重跑。 |
| M11 寒瘴泥沼 | 3、5 | 专用素材：瘴气地面，TowerMiasmaArt | 历史报告 PASS，6组；[记录](../../design/xianxia-monster-miasma-2026-11-03/game-review/report.json) |
| M12 毒痕追猎 | 4 | 专用素材：M11瘴气复用，三处独立地面毒区 | [2026-11-04验收](../xianxia-monster-poison-ground-2026-11-04/README.md) |
| M13 落雷点名 | 无 | 专用素材·库内：落雷，TowerLightningArt | 历史报告 PASS，4组；[记录](../../design/xianxia-monster-lightning-2026-11-03/game-review/report.json) |
| M14 连环落石 | 无 | 专用素材·库内：落石，TowerFallingRockArt | 历史报告 PASS，18组；[记录](../../design/xianxia-monster-falling-rock-2026-11-03/game-review/report.json) |
| M15 环形震波 | 8 | 专用素材：尘浪，TowerShockwaveArt | 历史报告 PASS，6组；[记录](../../design/xianxia-monster-shockwave-2026-11-03/game-review/report.json) |
| M16 摆首妖息 | 5 | 专用素材：妖息，TowerBreathArt | 历史报告 PASS，6组；[记录](../../design/xianxia-monster-breath-2026-11-03/game-review/report.json) |
| M17 风刃封侧 | 无 | 专用素材·库内：青蓝长条首帧，TowerWindbladeArt | 历史报告 PASS，6组；[记录](../../design/xianxia-monster-windblade-2026-11-03/game-review/report.json) |
| M18 狱锁禁锢 | 无 | 专用素材·库内：锁链＋复用石塔锁柱 | 历史报告 PASS，6组；[记录](../../design/xianxia-monster-lock-2026-11-03/game-review/report.json) |
| M19 六门避劫 | 8、9 | 专用素材：安全门地印，TowerSafeSealArt | 历史报告 PASS，8组；[记录](../../design/xianxia-monster-safe-seal-2026-11-03/game-review/report.json) |
| M20 引兽破阵 | 7 | 专用素材：机关柱，TowerPillarArt；冲锋路径沿原机制 | 历史报告 PASS，2组；[记录](../../design/xianxia-monster-pillar-2026-11-03/game-review/report.json) |
| M21 镇妖破甲阵 | 无 | 专用素材·库内：复用晶环，独立蓄能进度及引妖入阵提示。 | [夹具验收](../xianxia-monster-armor-trap-2026-11-04/README.md)，未配正式Boss。 |
| M22 噬灵妖卵 | 3 | 专用素材：妖卵，TowerEggArt；幼体角色复用 | 历史报告 PASS，2组；[记录](../../design/xianxia-monster-egg-2026-11-03/game-review/report.json) |
| M23 妖核暴露 | 无 | 状态提示：妖核暴露：文字、状态、奖励恢复期；不是缺一张实体妖核。 | 无需独立母图，不能套用M03灵核对象。 |
| M24 濒死绝唱 | 无 | 专用素材·库内：复用M19两处晶环地印，10%触发及单次限制保持。 | [夹具验收](../xianxia-monster-last-song-2026-11-04/README.md)，未配正式Boss。 |

## 当前结论与后续

截至2026-11-04，24项中19项已有专用素材，5项由角色、动作或状态承载（M01/M02/M05/M06/M23），本轮专用技能表现待补清单已收口。各项浏览器证据日期不同，不代表本轮对24项做了统一全量回归，也不是“24项完整角色动画验收通过”。

M13/M14/M17/M18/M21/M24仍未列入正式Boss技能配置，均保留技能库/夹具属性，不因完成素材而擅自投放。

后续转向真实角色动作缺口与场景覆盖：M08回旋角色动作仍按用户要求暂缓，熊王拍地等尚未完成；优先复用已验收母图，选择固定视角、轮廓稳定的动作。普通/精英/Boss/狂暴、真实击杀、微信真机内存及性能仍需按各自记录补验。前轮首层妖猪别名数值一致性失败未在本轮处理。

飞羽、音波、毒液三类普通飞行弹体不属于上述24项独立技能的逐项覆盖；静态素材的移动、缩放、旋转或淡出不称作新逐帧动画。

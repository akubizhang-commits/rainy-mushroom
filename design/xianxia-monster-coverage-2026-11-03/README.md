# 怪物技能表现覆盖审计 · 2026-11-03

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
| M08 回旋尾扫 | 4 | 通用表现待补：回旋尾扫当前扇形预警，无专用尾扫效果分支。 | 已有弧形/尘浪是候选；需按216度扇形和鳄尾动作试制。 |
| M09 撼岳掀浪 | 6 | 通用表现待补：撼岳掀浪当前胶囊预警，无专用浪体效果分支。 | 优先试已有土石纹理；不得把M06本体冲锋逻辑搬过来。 |
| M10 缚足蛛网 | 3 | 专用素材：蛛网，TowerSpiderWebArt | 已接入；[历史报告](../../design/xianxia-spider-web-2026-11-03/game-review/report.json)，本轮未重跑。 |
| M11 寒瘴泥沼 | 3、5 | 专用素材：瘴气地面，TowerMiasmaArt | 历史报告 PASS，6组；[记录](../../design/xianxia-monster-miasma-2026-11-03/game-review/report.json) |
| M12 毒痕追猎 | 4 | 通用表现待补：三次追踪地面毒区，无独立地面素材；毒液飞弹不是此技能。 | 最高优先：试复用M11瘴气，以原1秒预警和持续毒区验证。 |
| M13 落雷点名 | 无 | 专用素材·库内：落雷，TowerLightningArt | 历史报告 PASS，4组；[记录](../../design/xianxia-monster-lightning-2026-11-03/game-review/report.json) |
| M14 连环落石 | 无 | 专用素材·库内：落石，TowerFallingRockArt | 历史报告 PASS，18组；[记录](../../design/xianxia-monster-falling-rock-2026-11-03/game-review/report.json) |
| M15 环形震波 | 8 | 专用素材：尘浪，TowerShockwaveArt | 历史报告 PASS，6组；[记录](../../design/xianxia-monster-shockwave-2026-11-03/game-review/report.json) |
| M16 摆首妖息 | 5 | 专用素材：妖息，TowerBreathArt | 历史报告 PASS，6组；[记录](../../design/xianxia-monster-breath-2026-11-03/game-review/report.json) |
| M17 风刃封侧 | 无 | 专用素材·库内：青蓝长条首帧，TowerWindbladeArt | 历史报告 PASS，6组；[记录](../../design/xianxia-monster-windblade-2026-11-03/game-review/report.json) |
| M18 狱锁禁锢 | 无 | 专用素材·库内：锁链＋复用石塔锁柱 | 历史报告 PASS，6组；[记录](../../design/xianxia-monster-lock-2026-11-03/game-review/report.json) |
| M19 六门避劫 | 8、9 | 专用素材：安全门地印，TowerSafeSealArt | 历史报告 PASS，8组；[记录](../../design/xianxia-monster-safe-seal-2026-11-03/game-review/report.json) |
| M20 引兽破阵 | 7 | 专用素材：机关柱，TowerPillarArt；冲锋路径沿原机制 | 历史报告 PASS，2组；[记录](../../design/xianxia-monster-pillar-2026-11-03/game-review/report.json) |
| M21 镇妖破甲阵 | 无 | 通用表现·库内待补：镇妖破甲阵为站圈积累并引怪入圈的机关，当前通用图形。 | 可试复用地印，但必须另配站圈进度/引怪语义，不能冒充M19安全门。 |
| M22 噬灵妖卵 | 3 | 专用素材：妖卵，TowerEggArt；幼体角色复用 | 历史报告 PASS，2组；[记录](../../design/xianxia-monster-egg-2026-11-03/game-review/report.json) |
| M23 妖核暴露 | 无 | 状态提示：妖核暴露：文字、状态、奖励恢复期；不是缺一张实体妖核。 | 无需独立母图，不能套用M03灵核对象。 |
| M24 濒死绝唱 | 无 | 通用表现·库内待补：濒死绝唱与M19共享safe-gates机制，但SafeSealArt仅匹配M19。 | 先试复用M19地印，再独立验证低血量触发。 |

## 结论与顺序

当前24项中，14项有专用素材（M03/04/07/10/11/13/14/15/16/17/18/19/20/22），5项以角色、动作或状态承载（M01/02/05/06/23），5项专用表现仍待补（M08/09/12/21/24）。这不是“19项全量美术验收通过”。

正式Boss当前使用17项技能；M13/14/17/18/21/24未列入Boss配置。精英默认映射为猪M06、狼M05、蛛M10、鳄M08、熊M02，其他家族M07；M23是机制奖励转换进入的状态。未配置技能不能擅自加进正式阵容。

下一步先处理正式第四层M12地面毒区：已有M11瘴气可以试制，飞行poison贴图不等于地面毒区。随后M08尾扫、M09掀浪；M21与M24优先在技能库中复用地印。暂未发现必须要求用户重新出静态母图的证据，先本地试制，确实不合格再给prompt。

飞羽、音波、毒液三类普通飞行弹体不属于上述24项独立技能的逐项覆盖，已有贴图记录不能替代对应技能验收。静态素材按模拟时间移动、缩放或淡出，不能统称新逐帧动画。

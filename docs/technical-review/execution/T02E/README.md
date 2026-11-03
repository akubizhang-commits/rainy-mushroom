# T02E 执行报告

唯一工作区：`/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom`。只修改下列九个测试文件，没有改生产代码、数值或素材；由主代理归档后提交；本组没有运行全仓测试。

## 结果

- 原始九文件基线：153项，102通过、51失败，0 skipped/todo/cancelled。
- 最终九文件定向回归：159项，159通过、0失败，0 skipped/todo/cancelled。
- 新增6项真实击杀边界：1799→1800、1800→1800、6599→6600、6600→6600、13484→13485、14399→14400；旧10920封顶用例迁移为14400封顶。
- `git diff --check -- <九文件>` 通过。
- 没有剩余失败名称；原51项名称完整保存在 `task-2e-failures.json`，after为空。
- 本报告不等于全仓测试通过，不等于设备性能、自然玩家通关或三槽全组合平衡验证。

## 原因与修改依据

### 伤害、技能和预算

依据 `docs/xianxia/sect-tower-v1/90-current-critical-hit-rules.md`、`design/balance/attribute-rules-2026-11-02.md`、`design/balance/dot-conversion-2026-11-03.md`、当前已实施的整数装备规范，以及 `TowerGrowth.js` 中已批准的技能规则。

- 碧落4级为剩余直伤50%转化、异常增伤50%，替换旧15%增伤预期。保留混合伤害分量、过量伤害、怪物减伤仅一次、6跳预算、叠层一次、暂停/JSON恢复和非法分量拒绝。
- 暴击乘在包含装备与被动的普通伤害上。不同装备增伤先乘，剑骨在乘积后相加；装备全功法+1使剑骨/剑心达到装备专属下一档。新期望函数仅读取物品数据并按文档独立实现算式，没有调用运行时 `outgoingDamageFactor` 或反推实际结果。
- 持续功法也可暴击，但不能递归触发只允许直接伤害的碧落/剑罡。`scaled` 派生伤害不能再次增伤、判暴击、转化或生成附伤。额外验证随机调用次数及只产生一条伤害效果。
- 当前附伤按每次真实命中的转化后伤害计算，继承暴击收益而不再次判暴击，不再每个cast/target只一次。保留两次实际命中总扣血守恒、附伤数量、无递归及十目标覆盖。
- 旧五次施放focus机制已经退出，改为验证第五次、零伤害、空挥、尸体和training都不能使其复活；保留已有字段的初始值、真实飞剑命中receipt、暂停存读和篡改拒绝。
- 元素词条当前为全元素覆盖。保留neutral与元素增伤差异、物理/法术混合只分配一次、实际装备描述的全元素标识。
- 御剑1级单剑对应1秒预算，10级对应0.5秒预算。两仪10级为7跳分摊相同的damage×6总量；观察窗口包含实际动作释放和飞行，原0.5秒不足以观察连续剑气的后两次释放。没有修改伤害或演出节拍。
- 旧双槽3倍/focus预算已被现行规则覆盖。经主代理确认，将此测试替换为代表性双槽单次命中的当前公式与6倍上限检查，保留原严格容差。覆盖3136个参数组合（含重复端点），包含物理直伤、一次流血预算、附伤、暴击期望及戒指冷却折算。**它不是三槽全部组合、持续叠层或实战DPS认证**；D组和数值治理的全局风险仍独立存在。

### 周期回复、成长和存档

依据 `docs/xianxia/sect-tower-v1/71-ten-layer-realms.md`、72号突破说明、`docs/superpowers/specs/2026-11-01-tower-breakthrough-continuity-design.md` 和属性规则定稿。

- 1485、5400现在是小层升级，回复新上限30%，不是大境界回满；14400才封顶。瓶颈1800/6600进入时先有合法安全节点暂停，调用公开resume继续而不突破，再验证击杀不越瓶颈。
- 26个真实生成单位横跨两次正常回复脉冲，先独立校验该2次回复，再验证同tick连续两级按各新上限回复和截断。满级整层测试保留真实周期回复，仅禁止结算凭空附加回血。
- 防具回复由受击触发/延时/20秒冷却/每层10%上限迁移为每180tick一次、基础1/60、总上限1/40；澄霄安全期加成也独立计算。7个装备档位均测试前179tick不回复、第一脉冲精确值、后续10脉冲及旧10%整层上限已经失效。
- 旧pending字段的负测迁移到当前`armorState.healedTotal`和严格字段集合：负数、非数字、无穷、无时间却声明回复、超过一次脉冲最大额、错装备ID、缺state、注入旧pending/cooldown/trigger字段均拒绝。正向真实脉冲和JSON恢复接受。
- 保留满血不存额外回复、升级后下次脉冲用新上限、暂停冻结、相同快照恢复不补发、同tick致死优先于回血、死亡恢复不复活。

### 怪物、掉落和视觉引用

依据 `docs/xianxia/sect-tower-v1/79-monster-rank-role-and-equipment.md`、`docs/xianxia/economy/2026-11-03-resource-roles.md`、当前已接入 `TowerPickups.js` 及 `tests/xianxia-resource-pickup.test.mjs` 的落地/吸附/receipt合同。

- 现行配额4772（4716普通+47精英+9Boss），正式投放为11个物种。保留180波、每个真实击杀身份、掉落品阶和值上下界、全部投放资源类型覆盖、JSON重放、原计数器，以及训练不产资源。
- 普通波次/Boss不发点眷，点眷只在Campaign指定首通结算。本批改为精确0，保留击杀/通关不重复奖励。旧loot分支总额按79号独立配额和历史面额表重算：普通235+精英436+Boss260+通关180=1111，计数器余16；没有直接照抄实际总额。
- **floor9/wave4/kills93并非死锁。** 原夹具用Lv1旧周天1级挑战第9层，80000tick仍在缓慢扣血。保留的探针显示第9层第4波目标满HP3600，80k tick后235.0573；额外6000tick的诊断观察记录1008次命中、26548.333伤害，并前进至第5波、116击杀。这段诊断仅证明持续推进，修复后的测试没有增大循环上限。新掉落夹具用 `_damageEnemy` 的显式伤害输入经正常死亡/掉落/账本/拾取结算推进，保留全HP真实生成单位，绝不直接改HP、kills、clear或删除敌人；伤害真实性由实际技能专项继续覆盖。整层掉落夹具从14400开始以隔离中途突破暂停。该迁移已获主代理明确确认。
- 拾取物使用收据可合堆、0.5秒落地、距离外不自动过期；测试对每个kill要求唯一地面或已收取receipt，而不是一杀一个sprite。非法关联从已无权威含义的killId迁移到receipts；缺收据、未知收据、金额、品阶、重复视觉等仍严格拒绝。距离外4秒仍在地面，靠近或离场只收一次、不二次加earned。
- **boar_boss冲撞恢复失败源于测试清空drops。** 新拾取合同要求所有已发receipt必须留在地面或collected；改为只排除无收据的治疗掉落，保留全部资源收据，命中/未命中、路径端点、剩余尾段不命中及中途重放均通过。
- 旧机器人录制快照包含过期装备词条、缺mana等当前字段。原文件保持不动；只取原角色/Boss几何，通过真实关卡生成和死亡推进得到当前Boss，等待真实sweep或M06预警再存读。增加静止对照实际会中招，避障机器人两个窗口均0次受击，结束快照有效。原生sweep窗口明确隔离原生控制器；M06窗口保留正式机制控制器。
- 白虎资源仍独立且UUID不同，塔菜单和战斗现在都经 `TowerMonsterArt.artFamily` 查 `ARCHETYPES.art_family`；替换旧硬编码三元表达式的源码断言，保留白虎与普通虎资源和映射区别。

## 验证记录

所有日志原件位于同目录：

|日志|范围/结果|
|---|---|
|task-2e-before.tap|9文件：153 / 102过 / 51失败|
|task-2e-pass1.tap|首批5文件：83 / 73过 / 10失败|
|task-2e-weapon-pass1.tap|武器战斗：23 / 23过|
|task-2e-pass2.tap|7文件：116 / 113过 / 3失败|
|task-2e-pass3.tap|4文件：63 / 61过 / 2失败|
|task-2e-final.tap|新增瓶颈边界首次：159 / 157过 / 2失败；进入时真实暂停未被夹具resume|
|task-2e-final-verified.tap|最终9文件：159 / 159过 / 0失败|
|task-2e-root-causes.json|旧低等级慢杀探针、旧机器人快照当前合法性检测|
|task-2e-review.patch|本批精确九文件diff|
|task-2e-files.sha256.json|九个文件及日志/diff的SHA-256|
|task-2e-failures.json|原51项完整失败名称与最终空列表|

最终命令：`node --test` 加下面九文件。未运行全仓或构建，没有跳过/移除测试；部分旧机制用例按上文映射到当前合同。

## 精确文件清单

- `tests/sword-damage-types.test.mjs`
- `tests/xianxia-monster-balance-harness.test.mjs`
- `tests/xianxia-tower-cultivation-rewards.test.mjs`
- `tests/xianxia-tower-run-attacks.test.mjs`
- `tests/xianxia-tower-run-growth.test.mjs`
- `tests/xianxia-tower-run-loot.test.mjs`
- `tests/xianxia-tower-run.test.mjs`
- `tests/xianxia-tower-weapon-combat.test.mjs`
- `tests/xianxia-weapon-actions.test.mjs`


## 独立复审

t02e_review：18项源码与证据哈希匹配；规格与质量通过，无需修改。真实死亡/掉落/收据路径、当前合法快照负测、机器人静止命中对照及六个成长边界均核对。全局平衡与真机不在本组通过结论范围。gzip证据无损，evidence.json记录解压后的哈希。

# T02 只读归因与执行建议

工作区：`/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom`

本报告只分析，不改生产数值，不提交代码。除本临时报告外没有修改文件。依据是 `docs/technical-review/evidence/test-failures.json` 的 563 项及 `tests.log` 的完整错误、现行源码和规范。以下计数是原始基线分类，不是声称现已修复。

## 1. 结论和执行顺序

1. **先修 VM fixture 的完整依赖图。** 291 项缺类只是第一层异常，不能承诺加三个空类即可全部通过。
2. **再统一当前存档/等级/固定装备的合法 fixture。** 先证明正向 fixture 能被当前 Store/Run 接受，再做故障注入，避免 `realm-locked` 抢在 `save-failed` 前面，导致事务测试根本没走到保存。
3. **优先保全负向门禁。** 当前合法档读写、失败原子性、过期写保护、重复领奖、非法快照拒绝不能删除或降格。旧机制的负向用例应迁移到新机制对应信任边界。
4. **按新版规范修正已经明确被覆盖的断言。** 当前每境十层、进阶继承实际父技能等级、周期回复、持续伤害暴击、伤害转化等都有明文。
5. **数值预算和 UI/资源未裁决项独立处理。** 不能把当前实际结果抄成预期，不能扩大容差或给生产数值打补丁以消灭红灯。装备 6 倍全效果上限在现行报告里仍是 CONCERNS，必须保留这项风险。

## 2. 563 项的可核对分类

### 缺类 291

| 测试文件 | 项数 | 基线首个异常 |
|---|---:|---|
| `tests/xianxia-tower-host-tools.test.mjs` | 180 | `TowerBreakthroughAudio is not defined` |
| `tests/xianxia-tower-inventory.test.mjs` | 108 | `TowerCharacterArt is not defined` |
| `tests/tower-skill-effects.test.mjs` | 3 | `WeaponQualityArt is not defined` |

余下 272 项还有 1 个 `drawPlayerMana is not defined`，因此“272 全是业务错误”不成立。

### 余下 272 的文件主责分组

这些分组互斥且覆盖全部 272；是实施分组，不代表每个断言已经裁决。

| 组 | 项数 | 文件与基线失败数 |
|---|---:|---|
| UI、fixture、selector | 35 | `xianxia-material-feedback` 1；`xianxia-tower-forge-ui` 24；`xianxia-tower-host-tools` 2；`xianxia-tower-skill-icons` 8 |
| 成长、境界、技能及其 schema | 91 | `tower-qi-progression` 8；`xianxia-natural-growth-strategy` 7；`xianxia-stone-skill-costs` 1；`xianxia-tower-campaign-growth` 21；`xianxia-tower-flight` 1；`xianxia-tower-growth-feedback` 2；`xianxia-tower-growth` 12；`xianxia-tower-manual-learning` 2；`xianxia-tower-rank-bands` 2；`xianxia-tower-realm-only-skills` 3；`xianxia-tower-skill-decrease` 7；`xianxia-tower-stage-growth` 24；`xianxia-yujian-growth` 1 |
| 装备目录、工厂、预算 | 52 | `xianxia-armor-offense` 2；`xianxia-equipment-bases` 1；`xianxia-equipment-eight-tier-budget` 4；`xianxia-equipment-eight-tiers` 1；`xianxia-equipment-identities` 1；`xianxia-equipment-output-scheduling` 1；`xianxia-fixed-equipment` 3；`xianxia-forging` 1；`xianxia-ring-universal-budget` 1；`xianxia-tower-balance-optimization` 1；`xianxia-tower-doc52-tier-gate` 1；`xianxia-tower-equipment-budget` 2；`xianxia-tower-equipment-campaign` 7；`xianxia-tower-equipment-doc52` 5；`xianxia-tower-equipment-history` 8；`xianxia-tower-equipment` 3；`xianxia-tower-v21-integration` 2；`xianxia-tower-weapon-campaign` 6；`xianxia-tower-weapons` 2 |
| Campaign、丹药、Profile | 43 | `xianxia-breakthrough-items` 1；`xianxia-developer-tools` 1；`xianxia-library` 3；`xianxia-opening-pill-gate` 2；`xianxia-tower-campaign` 19；`xianxia-tower-playtest-resources` 3；`xianxia-tower-playtest` 4；`xianxia-tower-profile` 9；`xianxia-zhuji-pill` 1 |
| 战斗、掉落、怪物机制 | 51 | `sword-damage-types` 3；`xianxia-monster-balance-harness` 1；`xianxia-tower-cultivation-rewards` 1；`xianxia-tower-run-attacks` 2；`xianxia-tower-run-growth` 9；`xianxia-tower-run-loot` 7；`xianxia-tower-run` 7；`xianxia-tower-weapon-combat` 19；`xianxia-weapon-actions` 2 |

上述短名均为 `tests/<短名>.test.mjs`。

## 3. 最小 fixture 修复方案与实测证据

### 3.1 `tower-skill-effects`：最小且已在内存验证

三个失败在第 235、246、269 行附近创建真实 `TowerCharacterArt` 时只传 `{Color}`。

`TowerCharacterArt.ts:55` 左右的字段初始化现在会 `new WeaponQualityArt()`；`reset()` 也调用该对象。最小修复：

- 用现有 `source('WeaponQualityArt')` 转译真实类，在独立 VM closure 中返回它。
- 对三处 `TowerCharacterArt` context 增加 `{Color, WeaponQualityArt}`。
- **不用空类**，该真实类只依赖 Cocos Color/Graphics，当前三个动作测试无须实际 GPU。

通过 Node `registerHooks` 仅在内存改写测试源码试跑：**28/28 通过，0 失败**。没有落盘测试修改。

### 3.2 `inventory`：补真实角色依赖，并补菜单导入

位置：`tests/xianxia-tower-inventory.test.mjs:30,149–167`。

- `sources` 增加 `WeaponQualityArt`、`TowerCharacterArt`。
- 初始化顺序：`WeaponQualityArt` → `TowerCharacterArt` → `TowerMenu`。
- `TowerMenu.ts:1` 新增 `equipmentSkillBonus`，从真实 `js/xianxia/TowerEquipmentSkillLevels.js` 注入。
- `TowerCharacterArt` 的实际渲染还需 `JsonAsset/Rect/Size` 等 Cocos 类型；当前 inventory 的资源 loader 不回调，内存试跑没有触发这些分支，但共用 helper 若要让资源完成，必须补真实边界结构。

以上最小注入的内存试跑：**111 项中 77 通过、34 失败**，没有缺类错误。原来的 108 个缺类不是 108 个独立生产缺陷；后续 34 项主要是旧节点名、试玩券入口、钱包退款和丹药交互预期。

示例暴露的实际断言：

- `领取10张试玩券` 控件不存在；
- `技能` 控件名已经变为当前功法文案；
- 分解前后钱包差异 `4985` vs 旧预期 `4976`；
- 点击旧丹药入口未走当前购买动作，余额 `300` 未变而旧测试期待 `295`。

这些只说明需重新走当前 UI 流程，不能据此直接修改余额预期。

### 3.3 `host-tools`：完整传递依赖，不止突破音频

位置：`tests/xianxia-tower-host-tools.test.mjs:43` 的 sources，`:329` context，`:350–390` 实例化顺序。

生产 `TowerView.ts:71–123` 新增了一批字段初始化；`TowerMonsterMechanicsView.ts:1–13` 也新增独立 Art 类。以 `TowerView` 为根遍历当前 TS imports，排除既有 Cocos / Resources / Platform / Library boundary 后，原 `sources` **缺 26 个传递 TS 模块**：

```text
TowerBreakthroughArt
TowerBreakthroughScene
TowerBreakthroughAudio
TowerLevelBeamArt
FlightSwordArt
FlightStreamArt
NingshenAuraArt
JianguAuraArt
BumieAuraArt
JianxinAuraArt
TowerDamageNumbers
TowerDebuffIcons
CrossBurstArt
TowerChainArt
TowerFallingRockArt
TowerSafeSealArt
TowerCrystalArt
TowerCoreArt
TowerPillarArt
TowerShockwaveArt
TowerWindbladeArt
TowerBreathArt
TowerLightningArt
TowerEggArt
TowerMiasmaArt
TowerSpiderWebArt
```

配套缺的 JS 导入组：

- 突破：`TowerBreakthrough`、`TowerBreakthroughPresentation`、`TowerBreakthroughPainter`、`TowerJindanPainter`、`TowerLevelBeamPainter`；
- 飞行/心法动画模型：`TowerFlight`、`TowerNingshen`、`TowerJiangu`、`TowerBumie`、`TowerJianxin`；
- 表现/拾取：`TowerWeaponElements`、`TowerPickups`、`TowerPickupPresentation`；
- 菜单：`TowerForging`、`TowerForgeMaterials`、`TowerEquipmentSources`、`TowerMixedDraw`、`TowerEquipmentSkillLevels`。

具体核心 binding 包含 `FlightStreamState`、四个 AuraState、`PickupFeedback`、`pickupLabelBudget`、`collectedMaterials`、`pendingCoreValue`、`breakthroughOptions`、`levelUpPresentation`、`CEREMONY_DURATION`、`breakthroughReady`、`floorBreakthroughPreparation`、`ELEMENT_NAMES`、`equipmentSkillBonus` 等。使用真实 JS 模块，不能用 no-op 代替业务函数。

`TowerPlayerHud` 的 VM 返回集合还漏了 **`drawPlayerMana`**，host 与 forge-ui 都要补。inventory 已导出该函数。

建议 helper 保留当前每个模块独立 closure 的做法（避免私有 `C` 等常量冲突），根据每个 TS import 精确绑定真实模块。共享的是加载依赖逻辑和 Cocos 边界，不要让 inventory 导入/执行 host-tools 测试。

只在内存补全部 26 个类、相关真实 JS 和 `drawPlayerMana` 的试跑：**182 项中 36 通过、146 失败，缺类 ReferenceError 为 0**。这证实依赖图修复足够使测试暴露真正断言，但不意味着这些断言均为旧规则。

暴露的剩余异常包括：

- 当前资源请求数 5 vs 旧预期 3；
- 旧 `重试打开体验档`、`技能`、`购买一颗 · 5贡献` 节点不存在；
- 新档贡献/点眷为 1000 vs 旧预期 300；
- floor 7 已不满足“必定生成普通虎”的假设；
- `magnet` 不是当前 growth skill；
- `game.showPlaytestResources` 已非当前方法；
- 三个角色 volley 测试读取 null `spriteFrame`，需要加载当前 `ground-actions` 图与 atlas；
- HUD 触点/波次位置/暂停节点需对照当前布局，仍待裁决。

这次内存试跑属于诊断，不是提交后的正式验收。正式修复后按完整测试名称对照基线。

### 3.4 其余可先修的 fixture/selector

- `xianxia-tower-skill-icons.test.mjs:96` 用 `技能素材裁剪-${id}` 查节点；生产 `TowerSkillIcons.ts:33` 已使用 `功法素材裁剪-${id}`。这是 8 个 undefined.active/getComponent 的直接原因。只更新 selector，继续保留缓存、引用计数、失败负缓存、destroy 晚回调、严格 isValid 等断言。
- `xianxia-material-feedback.test.mjs` 使用 `Object.create(View.prototype)` 绕过初始化。`clearBattleFeedback()` 现在先调用 `debuffIcons.reset()`、随后 `ritualAudio.stop()`；fixture 没提供这些边界。补这些明确方法（或直接加载真实对象），保留通知清空断言。
- `xianxia-tower-forge-ui` 的 24 项包含缺 `drawPlayerMana` 1 项，其余多是旧房间/旧购买节点和旧文案。先走当前 `入殿购器` / `开炉炼器` 两级流程，购买测试必须真正触发现行 action 再检查持久化，不能只改文本正则。

## 4. 有明确规范覆盖的业务组

### 4.1 每境十层与技能阶段

权威依据：

- `docs/xianxia/sect-tower-v1/71-ten-layer-realms.md` 明确覆盖旧 27/28 级；
- `72-breakthrough-items.md`：1800/6600 停瓶颈，成功突破到 1801/6601；
- `91-skill-gates-and-caption-2026-11-03.md` 顶部最后覆盖优先于该文旧段；
- `75-skill-inheritance.md` 与 91 号追加一起读。

源码核对：

- `TowerProfile.js` 当前 cap 14400，30 级；11 级起点 1801，21 级起点 6601；
- `TowerGrowth.js` 当前阶段起点 1/4/7/11/14/17/21/24/27；
- 御剑术角色 2 级开放，rank 1–3/4–6/7–9/10 对应角色 2/4/7/11；不再要求凝神诀；
- 剑骨与剑罡爆裂每级 1 点、御剑飞行 1 点，进阶各级固定费 2/4/2/4；
- 周天剑阵改为角色 17 层开放；四象二阶角色 30 层；
- 金丹进阶读取实际父技能等级，不能无条件把父技能当 10 级。

直接证据：

- `xianxia-tower-stage-growth.test.mjs:66,149–152` 仍硬编码 27、10920、旧阶段表；
- `xianxia-tower-growth.test.mjs:13` 用 xp10920 构造“满级”状态；旧奖励边界仍把 1485/5400 当大境界；
- `tower-qi-progression` 第一项期待 `hybrid`，现行剑气已是 `physical`；保存失败测试实际先返回 `realm-locked`；
- `xianxia-tower-run-growth.test.mjs:51–59` 在 1484→1485 / 5399→5400 仍期待大境界回满，现行只是小等级。

执行：

- 新建合法当前成长 fixture，用 `cultivationLevelXp(level)` 表示非边界场景；**边界测试仍写规范给出的 1800/1801、6600/6601、14400 独立常量**，不能全部从被测函数推导 expected。
- 对每项技能测试明确“测试学习门槛 / 测试保存失败 / 测试退点”的职责；非门槛测试设置足够合法等级、点数、书及父技能。
- 保留 exact cost / exact SP refund / atomic save / repeated respec 不增点等性质；重新写符合现行规范的精确数值。
- `held at old Lv19 stays valid` 等保留旧投资兼容测试不再是当前需求。可替换为“旧 schema 只重置本模式，当前 schema 不合法投资拒绝”的测试，记录 71/91 与 AGENTS 开发期规则依据。

### 4.2 当前 schema fixture 与迁移失败原子性

- Campaign 当前 `SCHEMA=68`（`TowerCampaign.js:42`），已有 `tests/helpers/tower-schema.mjs` 从新建内存 Store 编码取当前 schema。
- `xianxia-yujian-growth.test.mjs:26` 仍断言 61；
- `xianxia-armor-offense.test.mjs:186`、`xianxia-ring-universal-budget.test.mjs:29` 仍断言 58；
- `xianxia-tower-profile.test.mjs:30` 手拼 schema1，而独立 Profile Store 当前 schema5。

执行：

- 当前档 fixture/expected 使用 helper；迁移输入保留显式旧版本，不能把旧输入也换成 current。
- 每个 fixture 落盘后先断言新 Store `readOnly === false`、error 空、其状态等于设定状态，防止被静默 reset 后继续测。
- 迁移测试保持其他游戏 key sentinel、只写一次、失败原始 raw/内存不变、重试一次成功、再次 reload 不写的断言。
- Profile Store 是独立历史入口，不能不核实引用就删整个 suite；先分开“仍被 Campaign 用到的 cultivation/pills 函数”和独立 Profile 保存合同。

### 4.3 丹药与背包

依据：72 号、74 号；更完整商品/炼丹覆盖在 `docs/superpowers/specs/2026-10-31-alchemy-and-material-drops-design.md` 的后续用户修订。

- 74 号明确修为丹首层正式通关才可买/炼/服，每境共享 6 颗。
- 当前 `TowerProfile.js` 不再只有回春、培元两种药，包含各境修为丹、突破物品、材料，且 `purchasable` 区分可买和仅炼制。
- `xianxia-opening-pill-gate` 把 `ningqi` 当可购买物品，但当前它为不可直接购买的高级丹药。开门测试应该用可购买 `peiyuan` 测购买，`ningqi` 测炼制/服用；购买高级药应保留独立拒绝断言。
- `campaign-growth` 在未首通 fixture 上 use peiyuan，先失败于门槛而未覆盖 HP 不变。
- `library` 的“总 cap14400必须出现在炼气培元丹说明”预期应改为本境瓶颈及可用规则，不强迫每种丹药宣称可跨境。

未裁决：点眷商品价格、赠送 1000 和旧贡献支付错误需继续找相应最新商店/经济规范。不能仅因 `TowerEconomy.js` 当前常量是 1000/100 就接受为需求；其引用入口目前在此报告中只核对到源码。

### 4.4 周期恢复与会心移除

依据：

- 62 号开头明示会心词条退出、受击回复过时；
- 80 号开头明确当前按每 3 秒生命比例回复；
- `design/balance/attribute-rules-2026-11-02.md`、`equipment-rebalance-targets-2026-11-02.md` 为详细当前公式；
- `TowerAttributeRules.js`：`REGEN_INTERVAL=3`，基础 `1/60`，总上限 `1/40`。

直接证据：

- `xianxia-tower-equipment-history.test.mjs:74–75` 仍等 `armorState.triggerCount/pending`；
- `xianxia-tower-weapon-combat` 连续 7 项对已不存在 `pending` 做 JSON clone，产生 `"undefined" is not valid JSON`；
- 旧 tests 仍人为构造 4/5 次 cast 的 `focusCount`；
- Camp 1%/分钟已过时，旧 `12.5568` vs 当前 `486.2747` 的差异不能用扩大浮点容差解决。

执行：

- 用真实受伤玩家推进到 3 秒脉冲，再测试 hp 与 healing ledger；暂停冻结、满血不银行化、死亡不复活仍保留。
- 把“伪造 pending 回血/四次会心计数”的旧测试迁移为“无脉冲时间却增加 totalHealed、回滚 regen 时钟、重复 checkpoint 额外回复、保存失败不提交”。
- 已有 `tests/xianxia-health-regeneration.test.mjs` / `tests/xianxia-attribute-rules.test.mjs` 可作为当前正向 fixture 参考，不能通过共享 expected 公式让测试变成同义反复。
- 新回复条件（如 safeRecovery）还有当前合法上界，参考 `design/balance/balance-check-full-growth-2026-11-03.md` 末尾的已修复保存回归；不要把合法增强回复当伪造。

### 4.5 物理/法术、暴击和 DOT

依据：

- `sword-damage-types-2026-11-01.md` 顶部 11-02 覆盖：剑气纯物理、剑阵混合；
- `90-current-critical-hit-rules.md` 最新：持续功法可独立暴击；scaled 已结算伤害不二次判暴击；
- 90 号末尾：原伤先减伤/暴击，再流血50%→剩余直伤的碧落50%；取消旧 60%落剑爆发，3秒6跳、刷新剩余额度。

直接证据：

- `sword-damage-types` 的 3 项旧伤口预算数值；
- `weapon-combat` 仍按旧武器/会心加算和持续不得触发戒指来计算；
- `run` / `run-growth` 仍以旧进阶倍率及旧剑罡派生伤害预算计算。

执行：

- 独立构造无暴击、确定暴击、物理、法术、混合四类小场景，明确装备/被动/转化发生次序；
- 保留“两个分量之和等于实际扣血”“过量伤害限制”“scaled 不重复增强/减伤”“恢复后剩余额度一致”“触发不递归”；
- 用当前 `xianxia-dot-conversion`、`xianxia-attribute-rules`、`sword-burst` 做对照，旧数值仅在有明确新公式后替换。
- 注意伤害类型文档下半部分的 60/40 青萍是历史内容，被更新日期更晚的 90 号覆盖，不可拼接两套公式。

### 4.6 怪物配额与掉落

依据：`79-monster-rank-role-and-equipment.md` 明示 **4772**（4716普通+47精英+9Boss），8/9层第18波新增精英，普通/精英按 rank-role 生成。旧 4770 不再成立。

直接证据：

- `xianxia-tower-run-loot.test.mjs:112` 仍断言4770；
- 多处 `A[kill.archetype].rank` 把模板 rank 当本次投放 rank；
- 基线三项在 floor9/wave4/kills93 卡住；这仍需重现并查真实机制，不应只增循环上限；
- host floor7 普通虎固定假设不再符合当前名单。

执行：

- 正向配额引用经审核的本次 rank-role 投放表，独立验证每层普通/精英/Boss合计、资源不重复计入；kill ledger 使用当前实际投放 rank。
- 用新版真实敌人/攻击状态创建 snapshot；`Invalid tower snapshot` 两项先定位非法字段，不放宽生产 validator。
- `boar_boss shortened dash`、harness sweep/charge、floor9卡住，以及白虎资源路径当前仍标 **未裁决**。

## 5. 装备数值：可确定的旧断言与必须保留的风险

明确更新链：

1. 60/62/63 号替换旧两阶；
2. 71 号把宝器/灵器当前门槛顺延到角色11/21；
3. 80 号加防具攻速/施法和输出取舍；
4. `design/balance/equipment-rebalance-targets-2026-11-02.md` 明确旧 1.15/1.75/2.20/2.80 仅是求解初始曲线，**不再是三槽逐点验收值**；
5. `docs/superpowers/specs/2026-11-03-equipment-integer-budgets-design.md` 顶部仍是历史“提案”，但末尾“第二版实施结果”明确87件已接入。新的三槽标准、50组47过/3未过、6倍全组合上限仍未证明；末尾新增青锋剑。

源码：`TowerEquipmentFixed.js` 单一固定目录，凡器素问基础双攻16、力量/智力3、神识2；青锋是额外凡器中品，角色2级可用；防具以整数体力代替常规hpBonus；`TowerEquipmentBases.js` 读取 FIXED_EQUIPMENT。

可执行的旧断言修复：

- `every fixed weapon uses reviewed base attack` 仍等凡器6，实际16；旧表必然过时，应换成独立审核过的整数区间/身份表检查。
- `armor-offense` 仍按 fa下品力量3，实际18；80号本身又被整数第二版覆盖，不能仅修到80号数值。
- 固定目录多出青锋后，`35*26`、25/35身份数、每个开放阶每个品质均可 roll 等假设要改为当前合法身份矩阵；青锋仅购买，不加入炼制/机缘池。
- 用当前 `createFixedWeapon/createFixedEquipment` 建测试装备。保留精确身份/品质/词条防伪，不能为了旧 `rollWeapon('xuan',...)` fixture 重新支持废弃生产参数。
- `element affixes start at bao and match element` 的旧限定已被剑气/剑阵实施文件“全元素覆盖”更改。
- `每件ring必有固定crit与CDR`、所有极品通用、master必比graduate强且≤2% 已不再能跨所有新身份套用，需要逐身份设计轴与同档取舍验证。

**必须保留的风险 / 未裁决：**

- `xianxia-equipment-eight-tier-budget` 的 6x 测试虽然标题变过，内部还是旧双槽加算、会心和旧 attack 基准；它不能证明新三槽6x安全。
- 不能把这个断言删掉后称“装备预算通过”。应明确替换成独立的新全效果检查；若未能证明，记作未解决预算风险，不扩大6到更高、不去生产裁剪。
- 新标准靶场50组已有3组未达±10%，规范报告自己就是 CONCERNS。T02 应与数值治理分开，不能因目标是全绿而修改生产数值或宽容差。
- `xianxia-equipment-output-scheduling` 180秒旧2.2目标也必须按新三槽标准重做合法 fixture 和基线，不能直接改 expected 为测得的1.9749。

## 6. 第一批建议实际提交范围

**批次 A：fixture-only**

- `tests/helpers/` 新增精确 VM module loader 或集中依赖清单；
- 修改 host/inventory/forge/effects 的依赖与 Cocos boundary；
- icons selector 与 material-feedback 初始化；
- 不改生产文件、不改数值 expected。
- 运行这6个文件；保存新失败名称集合，明确已解锁的隐藏断言。

**批次 B：current-state fixture + schema**

- 使用 currentCampaignSchema，Profile另建 current schema helper；
- 非边界场景用合法 levelXP 和固定身份工厂；
- 每个负测都先通过正向控制证明路径可达；
- 先跑 current schema、readonly/corrupt、write-fail、stale、duplicate/replay 相关用例。

**批次 C：按明文覆盖迁移技能/境界/周期回复/DOT/配额断言**

- 每个删除/改写用例记录：旧测试名、旧规则、新规则文档、替代测试名；
- 不使用 blanket skip、放宽 reason、`assert.ok(!result.ok)` 替换精确错误、全局调大循环或 epsilon；
- 分组通过后一次全量对照，没有新增失败名字才继续。

**批次 D：未裁决项**

- 装备新预算、商店点眷经济来源、当前资源 atlas/HUD断言、floor9卡住、攻击快照；
- 逐项给出裁决依据，生产缺陷如果确实存在，应保留失败和复現并单独报根因，不能在T02偷改生产。

## 7. 本轮实际验证边界

- 读取完整基线，统计563/291/272；
- 三组测试仅用 Node v22.22.2 `registerHooks` 在进程内改写源进行诊断，未保存修改；
- 完整传递依赖内存探针：host 36/182、inventory77/111、effects28/28；
- 未循环跑整仓、未build、未commit、未改生产或原始证据；
- 最后观察工作树有父任务新建的 `docs/technical-review/IMPLEMENTATION_PLAN.md`，本代理未改它。

## 主代理补充找到的现行依据

- `docs/xianxia/economy/2026-11-03-resource-roles.md` 明确记录用户确认后的新档1000点眷、3/6/9层首通各1000、正式机缘100/1000点眷、免费试玩十连停用，普通商品/丹药/分解改用灵石。此前报告中这些“待找依据”项已找到对应文档；具体测试仍需逐项迁移。
- `docs/xianxia/reports/settings-menu-v3-2026-10-30/README.md` 明确“使用主存档一份进度，不再加载或切换旧体验档；旧体验档记录未删除”。可据此迁移旧双档Host断言；其其他操作数量和阶段细节还要服从后续版本，不能整段照搬为当前事实。

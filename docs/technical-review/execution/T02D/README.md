# T02D — 装备目录、预算和存档测试

## 结果

仅修改 brief 指定的 19 个测试文件；没有修改生产逻辑、固定装备数值、技能、怪物、美术或其他代理的文件，没有提交代码。没有运行全量测试。

- 修改前：168 项，116 通过，52 失败，0 skip/todo/cancelled。
- 最终：169 项，167 通过，2 失败，0 skip/todo/cancelled。增加的 1 项独立验证周天剑阵 17 级开放和 21 级训练上限 6，原案例没有 skip。
- `git diff --check -- <19 files>` 通过。
- 两项失败保留为预算/设计验收缺口，不能称为生产代码缺陷已证实，也不能把 T02D 或全仓宣称全绿。

## 规则依据与修改

主依据：`docs/superpowers/specs/2026-11-03-equipment-integer-budgets-design.md` 第二版及末尾青锋补充；`docs/xianxia/economy/2026-11-03-resource-roles.md`；`docs/xianxia/sect-tower-v1/71-ten-layer-realms.md`；`91-skill-gates-and-caption-2026-11-03.md` 最新覆盖；`90-current-critical-hit-rules.md`；`reports/equipment-integer-v2-2026-11-03/fixed-catalog.md`。

1. **固定目录与新图标。** 87 个原身份加青锋剑为 88（36 武器、52 防具/戒指）；青锋仅商店，使商店身份 4、配方数 40。普通凡器仍只开放下品，青锋作为独立中品武器不会给防具/戒指开放中品。原 proposed-new 标签早于已交付图片，改为核对声明的资源路径确实有文件，不再强迫已补图装备显示空图标。
2. **整数基础与角色分工。** 用第二版明确的独立范围表验证攻击、护甲、力量/智力总额、体力。凡器铁剑/素问/青锋双攻精确为 5/16/24；不是按当前函数输出来改 expected。防具固定体力取代 hpBonus、常规 CDR；只有物防。爆发戒暴击和暴伤、节奏戒 CDR 互斥。武器不再普遍附加微量暴击。流派词条及元素占用同一增伤预算；照胆/太衡保留技能 +1 及减让后的独立预算。
3. **固定特效与展示。** 附伤和流血互斥；流血、等级 +1、专属戒、护盾/脱战回复按当前特殊效果分组验证。蚀骨剑意原训练 4 + 太衡等级 1 的剑痕增伤为 60%，照玄戒另加 12 个百分点，受测试保护的比例为 1.72；仍验证没有剑痕来源时戒指不凭空授予剑痕。断言没有改为读取当前实际伤害作为 expected。
4. **经济。** 凡器购买 24 灵石、0 点眷；明确覆盖 0/23 灵石不足和精确 24 灵石、0 点眷成功。分解范例按当前标准获取价 40% 向下取整：凡器下品 9、法器中品 96、法器上品 288、法器极品 832 灵石。点眷完全不变。原失败原子性、过期写保护、容量、重复收据和重复分解保护保留；负向 fixtures 加强为 Store 完整保留原状态、无迁移，独立成功控制原有测试保持。
5. **当前存档。** 旧 schema 50/43 输入保留不动；迁移输出改用 currentCampaignSchema，仍检查其他游戏 key、失败原始字节、过期写、一次重置、重载不再写。灵器直接装备门槛改为 1/20/21 级及 21 级独立边界。
6. **回复与战斗历史。** 旧 armor pending/triggerCount/floorCap 不再是当前结构。改为真实小额受击、180 tick 的实际回复、healedTotal 历史以及下一 tick 不得重置/伪增。小额损失让 standalone 合法上限内仍留有余量，确保“伪增”会真正走到 Campaign 的历史校验，不能由结构拒绝掩盖。保留同时间/后续时间 rollback、重复 checkpoint、读档、重复 finish 防护。
7. **会心退役。** Ring 的保存旧计数可稳定保留，但当前武器/戒指不会继续累计会心。真实战斗改验证 nextCastId 的实际施法凭据进展、凭据过期后不许回滚，及第零/一个 tick 不能伪造四次施法；额外直接验证旧 effectiveCasts/focus 伪造被严格结构验证拒绝。换装、进出关、保存失败和重载仍保留。
8. **冷却和营地。** 天锋戒 15% CDR；御剑 1 级基础每 1 秒生成一剑，因此 0.85 秒生成、相应真实起手和投射物释放时刻；10% 功法增伤与 CDR 分开验证。澄霄法袍体力 52 提供 520 气血；营地按每 3 秒 `(1/60 + .002)` 比例回复，60 秒为 20 次，不沿用 1%/分钟。换装不回血、丹药、快照和实际怪物固定属性原性质保留。

旧“两槽所有技能、所有等级同一目标 ±3%”“大师全优不超过 2%”被第二版明确取代：固定属性随等级稀释、角色之间允许侧重、三槽标准输出按新的目标表 ±10%。没有把原条件直接放宽；替换为第二版独立范围和角色分工，同时新增/保留真实三槽标准输出门禁。独立防具 EHP 的第二版解锁/阶段末物理及法术范围通过。

## 保留失败一：6 倍上界尚不能证明

完整名称：

`conservative three-slot coefficient screening can certify the6x ceiling without claiming full-combat proof`

之前两槽公式遗漏三槽主属性、实际攻击、普通增伤乘算、速度及特效，只能作为部分系数检查。保留这些部分系数回归并明确名称范围，另把主门禁改为三槽保守普通效果包络，覆盖 36×26 武器/戒指组合和每件防具、合法装备等级，保留 6.00 阈值。

最高筛查值：**8.40291387189434**，Lv11，`eq_sword_kunwu` + `eq_armor_yuheng` + `eq_ring_weiming`，magic 通道、native crit 0。

此为过度估计：将 DOT 加成应用于全部伤害、合并最有利的施法速度/冷却等，不是实测 DPS，不证明真实伤害超出 6 倍；也不包括足以证明所有技能等级 +1、被动/形态交互的严格包络。测试失败意味着这项筛查无法提供 6 倍认证，须进一步收紧证明或实测，不能宣称全组合安全。没有用 8.5/9.0 等新阈值消掉失败。

最小复现：`node --test --test-name-pattern='conservative three-slot' tests/xianxia-equipment-eight-tier-budget.test.mjs`。

## 保留失败二：原 50 组标准在现行技能门槛下不全部合法，且合法组有三项超目标

完整名称：

`all50 authored three-slot standard cases are legal and satisfy their approved180s DPS target within10percent`

测试中完整保留 §8 的 50 个 tier/quality/route 案例；先用明确的当前门槛和实际 Campaign 当前状态校验，拒绝非法 fixture 后不会送入 Run。其余运行真实 `TowerRun.advance(1/60)`：三槽、正常自动普攻、正常灵力和 CD、半径 24 不动无限血靶距玩家 100、180 秒丢弃前 30 秒、种子 101/211/307，未注入灵力或重置施法时钟。

- 21 组非法标准：凡器阵法 1；法器阵法/混合 8；宝器阵法/混合 8；灵器阵法 4。
- 当前独立边界：周天剑阵 sj_wanjian **16 级上限 0、17 级上限 3、21 级上限 6**。旧标准在 Lv1/4/11 使用该技能，或 Lv21 训练到 9，已与 91 号新规则冲突。
- 29 组合法实测：26 达标，3 组超出原定 ±10%。

|标准构筑|实际相对初始三件套|目标|相对目标偏差|
|---|---:|---:|---:|
|法器上品，Lv4 剑气|2.9719411442496892|2.70|+10.071894231469969%|
|灵器极品，Lv21 御剑|4.318171455905692|5.00|-13.636570881886156%|
|灵器极品，Lv21 混合|4.462533508113844|5.00|-10.74932983772312%|

这些是受控实验，不是真人难度、自然成长或胜率。详见 `task-2d-runtime-final.json` 的全部 50 行与逐种子明细。缺失的 21 组需要设计决定新标准构筑/开放阶段，不能擅自换技能或把覆盖缩为已通过的 26 组。旧报告 47/50 的结论不能作为当前技能门槛的验收。

最小复现：`EQUIPMENT_SCHEDULING_REPORT=/tmp/equipment-runtime.json node --test tests/xianxia-equipment-output-scheduling.test.mjs`。

## 证据

所有文件位于 `.superpowers/sdd/IMPLEMENTATION_PLAN/`：

- `task-2d-before.tap`：完整基线。
- `task-2d-pass1.tap` / `pass2.tap` / `pass3.tap`：中间修复输出，保留，不覆写。
- `task-2d-scheduling.tap` / `task-2d-runtime.json`：首次当前标准全 50 案例实验。
- `task-2d-final.tap`：最终 19 文件完整输出。
- `task-2d-runtime-final.json`：最终受控实验所有结果。
- `task-2d-review.patch`：仅这 19 个测试文件的完整补丁。
- `task-2d-files.sha256.json`：复审源文件哈希。
- `task-2d-failures.json`：两个完整失败名称与 50 案例详情。
- `task-2d-evidence.sha256.json`：上述证据 SHA256。

## 精确修改文件

- `tests/xianxia-armor-offense.test.mjs`
- `tests/xianxia-equipment-bases.test.mjs`
- `tests/xianxia-equipment-eight-tier-budget.test.mjs`
- `tests/xianxia-equipment-eight-tiers.test.mjs`
- `tests/xianxia-equipment-identities.test.mjs`
- `tests/xianxia-equipment-output-scheduling.test.mjs`
- `tests/xianxia-fixed-equipment.test.mjs`
- `tests/xianxia-forging.test.mjs`
- `tests/xianxia-ring-universal-budget.test.mjs`
- `tests/xianxia-tower-balance-optimization.test.mjs`
- `tests/xianxia-tower-doc52-tier-gate.test.mjs`
- `tests/xianxia-tower-equipment-budget.test.mjs`
- `tests/xianxia-tower-equipment-campaign.test.mjs`
- `tests/xianxia-tower-equipment-doc52.test.mjs`
- `tests/xianxia-tower-equipment-history.test.mjs`
- `tests/xianxia-tower-equipment.test.mjs`
- `tests/xianxia-tower-v21-integration.test.mjs`
- `tests/xianxia-tower-weapon-campaign.test.mjs`
- `tests/xianxia-tower-weapons.test.mjs`


## 独立复审

t02d_review：测试恢复改动规格和质量通过，19文件与证据哈希匹配；预算验收仍未通过，两项失败原样保留。6倍保守上界不是实际伤害；50组覆盖没有缩减。归档gz为无损压缩，evidence.json为解压后的哈希。

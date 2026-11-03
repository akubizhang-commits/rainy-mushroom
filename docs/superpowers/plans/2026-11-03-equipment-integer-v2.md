# 装备整数数值第二版 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** 接入用户已批准的固定装备数值第二版，并验证真实调度、自然成长及存档事务。
**Architecture:** 生产固定目录保存逐件基础值与词条，设计范围用于离线生成和校验；工厂、战斗、UI读同一目录。保留原ID及随机抽取身份规则，不增加随机属性。
**Tech Stack:** JavaScript、node:test、Cocos共享TypeScript与横屏Web构建。
**Spec:** `docs/superpowers/specs/2026-11-03-equipment-integer-budgets-design.md` 第二版，用户2026-11-03批准实施。

## Global Constraints

- 只改本项目装备及必要联调；保留现有未提交工作、全部素材，不提交混杂工作。
- 同名装备固定；整数基础属性；1力量/智力=1对应攻击，1体力=10气血。
- 新档读写、失败原子性、重复领奖、换装不补满；不兼容旧档仅重置本模式。
- 当前四阶，后四阶不开放；横屏，复用素材。
- 新旧战斗条件与种子一致；静态、靶场、自然路线、真人结果不得混称。

## Review Focus

- 特效文案与实际护盾/持续伤害是否仍硬编码旧数值。
- 属性工厂校验是否拒绝伪造/被共享对象修改；基础属性只加一次。
- 高神识、技能+1、混搭及暴击折点是否超预算。
- 自然配装策略是否仍用旧HP百分比而忽略体力，造成假性失衡。
- 存档schema变更与资源事务失败、空槽、读档恢复。

### Task 1: 固定数值与工厂

Files: 新增 `js/xianxia/TowerEquipmentRanges.js`、`TowerEquipmentFixed.js`、`scripts/generate-equipment-integer.mjs`；修改 `TowerEquipmentBases.js`、`TowerWeaponBases.js`、`TowerWeapons.js`、`TowerEquipment.js`；测试 `tests/xianxia-equipment-integer.test.mjs`。
Interfaces: `FIXED_EQUIPMENT[id] = {base,affixes}`；固定目录与角色等级无关，工厂返回独立副本；`EQUIPMENT_RANGES` 对应批准表。

- [x] 保存before快照与旧测试/自然路线基线。
- [x] RED：全部基础整数、无武器/戒指体力、示例归燕双攻32主属性9/9、同名一致、伪造词条被拒绝。
- [x] 实现范围表、确定性离线生成器及静态目录；生产工厂接入。
- [x] GREEN：运行新测试与既有基础/固定实例/武器测试，区分旧数值断言与真实回归。

### Task 2: 真实效果、存档与展示

Files: `TowerArmorEffects.js`、`TowerEquipmentIdentity.js`、`TowerCampaign.js`、装备摘要；`scripts/lib/tower-natural-equipment.mjs`；相应测试。

- [x] RED：护盾取词条值、特效文案反映目录；存档与换装原子性沿用真实store测试。
- [x] 护盾全链路去12%硬编码；清理零词条展示；schema57→58。
- [x] 自然配装按实际三槽属性/双防计分，修正旧百分比HP评分。
- [x] GREEN：存档、回复、伤害通道、技能+1、自然策略相关测试。

### Task 3: 静态与真实战斗联调

Files: 新增 `scripts/audit-equipment-integer.mjs`、`scripts/verify-equipment-integer-runtime.mjs`；结果 `reports/equipment-integer-v2-2026-11-03/`。

- [x] 输出全部逐件新旧对照与区间检查，检查合法等级、品质成长、双防EHP。
- [x] 真实靶场：批准的标准构筑、初始三件套分母、旧/新版本、180秒末150秒、3种子；补单体/稀疏/密集与长短战。
- [x] 审计全合法混搭及技能+1边界；记录保守估算与实际结果。
- [x] 三条自然路线各3种子，真实有限资源交易；新旧一致策略；重复结算/恢复校验。
- [x] 按证据调整固定取值或必要技能/怪物；同步方案，复测最终版本。

### Task 4: 回归、构建、UI与交付

- [x] 全测试对照before，修复本轮新回归，旧失败逐项报告。
- [x] Cocos同步与构建；检查844×390、1280×720横屏装备详情和角色属性。
- [x] 新鲜上下文最终代码审查，修复重要问题并回归；保存完整结果报告。
- [x] 更新方案状态和任务记录，向用户报告实际强度、已通过检查及限制。

## Execution Ledger

- Ruling: 用户已批准方案并明确要求实施与实战验证，直接连续执行，不再询问实施方式。
- Ruling: 当前生产代码与大量历史删除/未跟踪文件尚未提交，从HEAD另建worktree会遗漏当前游戏。使用当前工作目录并保存独立before快照；不提交或清理用户已有修改。
- 基准schema读取为57，实施版本58。所有报告使用独立目录，不覆盖旧报告。

- Task 1/2: 87身份已接入。新整数测试先RED 4项，再GREEN；审查补换装护盾RED→GREEN，整数/身份相关16项通过。
- Ruling: 自然配装脚本已按真实三槽属性与EHP计分，未发现旧HP%评分问题，不做无必要改写。
- Ruling: 御剑术训练4/7需要被动前置；标准无被动夹具改为训练3，新旧一致，点数和等级均校验。
- Ruling: 旧3倍两槽上限不再作为新三槽证明；旧审计工具改读固定目录，报告保守上限风险，不把静态估算当DPS。
- Task 3: 最终标准50组均值中47组满足±10%；3组边缘偏差待最终报告逐项列明，不把阈值放宽后冒充全通过。
- Task 4: Cocos旧输出MD5缓存缺失polyfill，保留失败目录后从空输出重建通过；UI两尺寸20项通过并检查截图。
- Review: 新鲜审查发现TowerRun换装护盾残留12%裁剪；修复为读取14%词条，新增回归测试验证不削减/补满护盾。

- Task 3: 标准150个样本、扩展104个样本、新旧各693个技能/稀有边界样本完成；新增阶段末150项，最大实测5.38176倍。12项防具EHP通过，24项受击压力结果保留。全混搭6倍证明仍未完成，按CONCERNS交代而非宣称通过。
- Task 4: 全量1970项，1551通过/419失败，相比before无新增失败名称、5项旧失败消除。冻结最终快照的相关回归37/37通过。
- Ruling: 共享工作区TowerCampaign交易逻辑在自然采样期间并行改动，已排除指纹不稳定的旧样本，改用after/不可变快照重跑9条路线。其他任务的修改不回滚、不归因于本任务。
- Task 4: 最新Cocos构建通过；共享输出又有并行重建导致UI访问404，因此复制成功产物到独立ui-build后复核20项通过。

- Final: 冻结版本9/9自然路线完成，每条首次九层通关均第9次尝试，后期复刷完成，0失败，全部sourceStable=true；首通战斗时间比before缩短4.2%–6.8%。全部计划内实验与报告完成。
- Final verdict: 实现已完成，验证结论CONCERNS；3组标准均值与允许边界最大相差0.00481倍，有限样本未证明全混搭6倍上限。保留这些结论，不把“采样完成”说成“全部平衡目标通过”。
- Report: reports/equipment-integer-v2-2026-11-03/README.md；逐件值fixed-catalog.md，审查code-review.md，全部原始JSON/日志同目录。

# 八阶装备 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 完成当前金丹范围的凡／法／宝／灵四阶，将八阶颜色、门槛和特殊标签元数据统一，保持35%装备总输出预算。

**Architecture:** 新增纯数据等级模块，装备定义按身份固定大阶、允许四品质。Campaign、库存和Cocos使用同一等级配置；保留现有事务与战斗机制，更新存档版本。

**Tech Stack:** 引擎无关ES modules、Node tests、Cocos Creator TypeScript、现有浏览器验证。

**Spec:** `docs/xianxia/sect-tower-v1/60-equipment-tier-requirements.md`；数值决定见62号评审。

## Global Constraints

- 横屏、当前最高27级；未来法宝／灵宝／仙器／神器仅预留。
- 无旧档兼容要求，仅重置对应模式的不兼容存档；合法档失败原子性与重复结算仍须保证。
- 初始铁剑＋5，初始三件不可分解；新四阶装备总输出相对同修为同技能铁剑不超过35%。
- 品质47/35/15/3%、软概率、100＋100单抽与900＋900十连保持不变。
- 本命养成与古宝掉落后续独立实现，不能假装已开放；不购买或重绘素材。

## Review Focus

- 直接设置配装、存档恢复能否绕过门槛：事务边界测试。
- 凡器普通实例与初始凡器是否混淆，导致不可分解或重复初始ID：目录及分解测试。
- 品质与身份分离后是否允许空池／伪造阶位：生成器与严格校验测试。
- 固定攻击、冷却、暴击、会心叠加是否超35%：独立公式与真实伤害测试。
- 窄横屏四阶选择、未来阶预览、颜色与详情是否统一：UI和浏览器测试。

### Task 1：共享等级与装备目录

Files: 新增`js/xianxia/TowerEquipmentTiers.js`；修改`TowerWeapons.js`、`TowerEquipment.js`；新增`tests/xianxia-equipment-eight-tiers.test.mjs`。
Interfaces: `EQUIPMENT_TIERS`, `OPEN_EQUIPMENT_TIERS`, `equipmentTier(id)`, `canUseEquipmentTier(id,level)`, `equipmentTierRequirement(id)`, `isStarterEquipment(item)`。

- [x] 写初始凡器、四阶四品质合法池、越权阶位拒绝的失败测试并运行。
- [x] 实现八阶与标签配置、74身份分配、品质1–4、初始品质0和数值评审表。
- [x] 运行新测试，更新已有装备数值测试至新合同，不保留黄／玄为隐式别名。

### Task 2：Campaign与库存合同

Files: `TowerCampaign.js`、`TowerRun.js`、`TowerInventory.js`及对应测试。
- [x] 写1/4/10/19门槛前后、保存失败、直接配装、初始分解保护与存档版本测试。
- [x] 替换分散两阶条件，共享等级校验；当前schema递增；保留原子事务。
- [x] 更新相关旧测试fixture与断言，跑业务回归。

### Task 3：Cocos展示

Files: `TowerInventoryPanel.ts`、`TowerMenu.ts`、`TowerView.ts`、`TowerCharacterArt.ts`。
- [x] 更新UI合同测试的依赖注入和新阶位断言，确认旧代码不满足。
- [x] 四个当前阶位按钮＋四个未来阶位预览；名字、颜色、等级条件共用配置；品质只变边框，不变色相。
- [x] 同步shared，构建web-mobile，浏览器检查两种横屏尺寸及真实炼制／装备。

### Task 4：最终复核

- [x] 运行全量测试与图标检查，逐项记录相对基线的失败变化。
- [x] 独立代码评审，修复必要问题；更新60/61/62状态与交付说明。

## Execution ledger

- 基线：全量1948项，1806通过、142失败；日志`/tmp/equipment-eight-tier-baseline.log`。既有失败多数在旧UI宿主桩、角色渲染和同步校验，本轮须区分新增失败与旧问题。
- Ruling: 在现有工作区修改并先备份相关源码至`/tmp/equipment-tier-before`。当前仙侠实现大量未跟踪文件，HEAD工作树不能代表用户刚批准的基线；不通过提交全部用户改动来制造新工作树。
- 用户已明确“review没问题就开发”，数值评审后直接执行，不追加批准回合。

- 收口：核心90/90、六组战斗、两种横屏炼制/详情/穿戴通过；全量1979项中1818通过、161失败，未达到全量绿灯。逐项对照及并行编辑影响见63号，勾选代表已执行并记录，不表示全量通过。

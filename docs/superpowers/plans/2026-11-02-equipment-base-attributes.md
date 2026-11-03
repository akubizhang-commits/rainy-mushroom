# 装备基础属性 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 武器固有双攻、防具固有物防、戒指固有法防；三部位按身份搭配力量、智力、神识和体力，统一战斗、详情与角色面板。

**Architecture:** 新增纯数据模块 TowerEquipmentBases，基础属性由固定身份推导，不混入效果数组。现有生成器与严格实例校验保留；三槽主属性集中相加一次，减伤从整套配装读取。

**Tech Stack:** 原生 JavaScript、node:test、Cocos TypeScript生成共享模块。

**Spec:** 本聊天用户确认：双攻不是第三项；主属性允许单项、双项、三项搭配，体力转气血；法防从防具迁移戒指。

## Global Constraints

- 横屏；复用全部身份、图标；不触及付费素材。
- 1力量=1物攻，1智力=1法攻，神识沿用现有施法速度／灵力规则。
- 实施取值：1体力=10气血，固定加在境界气血上，再应用防具气血百分比；体力仅装备贡献，未添加出生或升级体力。
- 基础属性不占普通／特殊效果；保留当前攻速、施法速度、回复、增伤；附加伤害独立归特殊效果。
- 使用固定分配预算：防具沿用现有3–44主属性点总量，武器／戒指较小预算；神识使用相同点预算，平衡检查单独记录施法速度收益。
- 不兼容旧档只重置本模式；保存失败、重复交易不能损失或重复获得资源。
- 用户已授权开发；直接在本轮执行，无额外确认；不提交混杂的已有工作。

## Review Focus

- 空槽或卸下武器不能留下主属性；隐式兜底铁剑不能提供新属性。
- 神识减少时灵力要钳制，体力减少时气血要钳制，不能换装免费补满。
- 混合伤害分别计算两防再平均，不能全伤同时叠两次减伤。
- 初始道袍／戒指各有1点对应防御；合法快照恢复一致，伪造属性拒绝。
- 详情基础／普通／特殊三组不可重复；无效果时隐藏空组。

### Task 1: 固定基础数据和分类

Files: 新增 js/xianxia/TowerEquipmentBases.js；修改 TowerWeapons.js、TowerEquipment.js；新增 tests/xianxia-equipment-bases.test.mjs。

- [x] 测试全部身份的防御分工、双攻、基础属性组合、无重复效果、实例校验，先观察失败。
- [x] 实现 equipmentBaseAttributes(definition)、equipmentPrimaryBonuses(loadout)、基础属性文案，原力量智力从防具affixes迁出。
- [x] 武器／防具／戒指summary统一baseAttributes/baseLines/ordinaryLines/specialLines。
- [x] 运行定向测试。

### Task 2: 战斗与存档

Files: TowerCharacterStats.js、TowerRun.js、TowerCampaign.js。

- [x] 测试三槽主属性累加、体力10倍、法防真实命中、混搭／空槽／存档恢复。
- [x] 将减伤入口改为equipmentDamageMultiplier(loadout,type)；角色与战斗共用同一来源。
- [x] schema由50升到51；更新受本需求影响的现有回归断言。
- [x] 验证换装、恢复、保存失败和重复交易。

### Task 3: 展示与平衡验收

Files: TowerInventory.js、TowerInventoryPanel.ts、TowerMenu.ts；新增审计脚本／报告。

- [x] 三类装备详情明确基础属性、普通效果、特殊效果；角色面板显示体力。
- [x] 对全部身份和阶档做数值、单调性、同档差异及改动前后比较，记录缺少目标的项，不把静态推算称作实战DPS。
- [x] 跑相关测试、全量测试（记录既有失败）、同步并构建Cocos，浏览器检查两种横屏。
- [x] 独立审查本轮差异并处理必要发现；保存报告与验证证据。

## Execution Ledger

- 已保存生产源码基线于 reports/equipment-base-attributes-2026-11-02/before/js/xianxia。
- balance-check输入：生产源码、旧平衡报告、现行属性规则 FOUND；design/registry/entities.yaml、design/gdd、automation配置辅助文件 ABSENT。以用户已确认规则判断结构正确性；新增属性数值没有用户指定区间，标记未定标。

- 完成：固定基础数据、效果分类、角色主属性、体力换算、防御拆槽与schema51。
- 定向62项通过；全量1905项中1503通过／402失败，当前独有失败0；详见remaining-failures.json。
- 独立审查发现空戒指结算写undefined计数：已RED复现、修复并验证三种空槽组合的checkpoint／结算／回滚。
- 体力面板保留两位小数；首轮最小值UI夹具直接改store未刷新menu而读到旧数值，已修正夹具的正式render步骤。
- 靶场75组对照、1629个合法等级组合完成；新增绝对数值无目标，报告明确NOT ASSESSED。
- 最终Cocos构建成功；最终横屏验证结果见ui-final.log。未提交、发布或合并。

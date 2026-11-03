# Fixed Equipment Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 接入已确认的84件固定身份装备、同品质随机炼器和心愿保底、极品材料，并保留事务安全。
**Architecture:** 共享独立名册作为数据源；装备模块负责固定属性及严格校验；炼器模块负责池与报价；Campaign持久化随机、保底与收据；Cocos界面使用相同数据。
**Tech Stack:** JavaScript ES modules、Node test、Cocos TypeScript。
**Spec:** `docs/superpowers/specs/2026-11-01-equipment-fixed-identity-design.md`

## Global Constraints

- 横屏；旧存档可仅重置本模式。保留所有美术源件，不生成付费静态图。
- 84件非初始＋3件初始，一名一阶一品，凡器仅初始和下品。
- 每阶武器3/3/3/2、防具与戒指2/2/2/2；极品全向。
- 失败原子性、重复请求与批量顺序保底不可省略。
- 当前工作区含大量既有未提交内容，在当前目录精确修改，不覆盖或整体提交它们。

## Review Focus

- 保存失败重试不能换结果、扣材料或推进保底（任务2）。
- 旧抽奖／购买不能绕过极品材料（任务2）。
- 重复checkpoint不重复给稀有材料或累积Boss保底（任务3）。
- 旧技能族、进化技能、混合伤害、冷却离散性导致词条错用（任务1、5）。
- UI小横屏能选极品并明确显示真实随机结果（任务4）。

### Task 1: 固定装备名册与属性

**Files:** 新建`js/xianxia/TowerEquipmentRoster.js`；修改`TowerWeapons.js`、`TowerEquipment.js`、`TowerEquipmentSources.js`、`TowerEquipmentLore.js`、`TowerLibrary.js`；测试`tests/xianxia-fixed-equipment.test.mjs`。
**Interfaces:** 导出固定名册；`createFixedWeapon(definitionId,instanceId)`、`createFixedEquipment(definitionId,instanceId)`产出原实例结构。既有roll函数仅在合法池中随机身份；验证拒绝修改固定词条。
- [x] 编写并运行红测：87个ID与设计完全相符，各池完整，所有实例合法，极品全技能适配。
- [x] 实现固定属性与一名一品校验，保留summary/modifiers调用接口。
- [x] 运行测试并检查跨品质输出和两种极品差距；更新实测数据。

### Task 2: 炼器池与持久化心愿

**Files:** `TowerForging.js`、`TowerCampaign.js`；测试`tests/xianxia-fixed-forging.test.mjs`。
**Interfaces:** 配方ID为`category:tier:qN`；每配方提供`definitionIds`。`setForgeWish`动作接受`id,targetId`；`craftGear/buyGear`原收据接口保留。`forgeWishes[id]={targetId,misses}`、`forgeRng`持久化。
- [x] 测试三炉保底、两选一、换心愿、批量、保存失败、重复请求和容量拒绝。
- [x] 实现凡器确定配方／仅凡器购买；正式品质池、成本1/4/12/32，极品专材2份。
- [x] schema加一；禁用旧drawForge/drawWeapon/drawEquipment交易；所有新状态严格验证。
- [x] 检查分解套利，含最大小游戏返费。

### Task 3: Boss稀有材料

**Files:** `TowerForgeMaterials.js`、`TowerMaterialLoot.js`、`TowerCampaign.js`；测试并入固定炼器测试。
**Interfaces:** `rareForgeDrops(snapshot,start,pity)`返回`{drops,pity}`；仅处理新增合法Boss击杀。`forgeBossPity={fa:0,bao:0,ling:0}`持久化，每阶0—4。
- [x] 红测：25%独立判定、第五次必得、不同阶隔离、训练不产出。
- [x] 增加三种材料，checkpoint内应用并持久化；run记录本轮稀有产出供结算。
- [x] 验证checkpoint分批/整批一致、断点重载、失败与重复不领奖。

### Task 4: 界面与共享代码

**Files:** `cocos-pilot/assets/scripts/TowerMenu.ts`及共享生成文件。
- [x] 品质四档，配方按部位/阶/品聚合，列出候选固定属性与心愿。
- [x] 撤下旧抽奖入口；显示实际获得名字，缺材料与来源可见。
- [x] 图鉴只展示唯一品质；新素材用明确文字占位。
- [x] 同步共享代码并运行Cocos检查与横屏浏览器验证。

### Task 5: Balance-check与回归

**Files:** `scripts/verify-fixed-equipment-balance.mjs`、`reports/fixed-equipment-2026-11-01/`。
- [x] 检查每个合法实例、池、词条与品质顺序；采样材料和保底分布，分别记录单炉/目标/全套。
- [x] 运行相关测试与完整回归；将旧设计专属断言更新为新规则，不删除仍相关的事务安全断言。
- [x] 新实现完成后独立代码审阅、修复并复测；报告实测与未测范围。

## 执行记录

- 用户已明确授权开发接入，直接执行，无需再次审批计划。
- 未定绝对成本首轮沿用现有品阶基础炼费（凡器另降为5灵石＋3贡献），正式材料主份倍率1/4/12/32；后续按实测调整并记录。

## 验证边界

- 任务5中的完整回归已运行，但未全绿；直接相关测试迁移及剩余失败见本轮验收报告，不表示所有历史断言已迁移。
- 凡器贡献成本改为3，避免分解返2贡献与返费结合套利。
- 默认网页构建已接回并通过实际鼠标交互；微信构建成功但整个项目资源包超限，尚不能发布。
- 正式品阶自然材料推进、三部位共享材料竞争与真机体验仍待长程实测。
- 最终证据：`reports/fixed-equipment-2026-11-01/README.md`。

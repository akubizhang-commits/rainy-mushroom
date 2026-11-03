# 怪物机制实施计划

> 执行：按功能边界并行，主线程整合、回归与交付。

**Goal:** 实现已批准64号怪物设计，适配自动攻击、横屏走位、确定性存档。
**Architecture:** 独立MonsterMechanics模块管理有界阶段/召唤/地面技，TowerRun接入伤害、移动、索敌和死亡；Cocos独立绘制模块表达同一几何；固定配装用于校准。
**Tech Stack:** JavaScript fixed-step simulation、Node test、Cocos TypeScript。
**Spec:** docs/xianxia/sect-tower-v1/64-monster-mechanics-and-skill-library.md

## Global Constraints
- 精英20–40秒，Boss建议100–140秒，小怪保持割草；不按玩家实时装备追平怪物属性。
- 必解机制使用移动与自动攻击；控制有保护期，回血/召唤有上限。
- 不变更正式波次奖励，临时怪无经济掉落，Boss死亡清理附属物。
- 当前正常存读档、失败原子性、重复领奖不退化。保留所有素材。

## Review Focus
- 临时实体伪造与正式击杀账本串联；暂停重载重置技能次数。
- 自动索敌无法打到必解目标；屏外开始攻击。
- 安全门不可达、控制接大招形成必死连击。
- 多阈值越过时重复阶段或死亡锁血。
- 机制回血/分身额外工作量导致实际TTK远超目标。

## Tasks
- [x] 1. 新模块js/xianxia/TowerMonsterMechanics.js：数据技能库、阶段调度、临时实体、场地区域、伤害/移动修正和快照校验。tests/xianxia-monster-mechanics.test.mjs先红后绿。
- [x] 2. TowerRun.js：每tick接入机制，临时实体不进正式账本，目标优先、状态控制、死亡清理、验证；真实Run存读档回归。
- [x] 3. cocos-pilot/assets/scripts/TowerMonsterMechanicsView.ts和TowerView.ts：同几何预警、机制实体、阶段状态；类型检查与横屏验证。
- [x] 4. 固定合法配装的校准脚本和报告；先量测现有TTK，再调整固定楼层HP/伤害并说明统计范围；不伪造真人验证。
- [x] 5. 专项和全套测试、Cocos同步构建、独立审阅、修复发现，报告未验证的真机边界。

## Execution ledger
- 用户已明确批准64号并要求开发，不再请求重复方案审批。
- 工作区存在大量既有未提交内容；保留原位，不把其他任务内容纳入提交，不从HEAD新建缺少当前项目文件的工作树。
- 并行边界：机制模块、视图模块、校准脚本分别独占；TowerRun集成由主线程独占。

## 交付边界

五项开发任务已完成。最终数值实测87.3%的已击杀精英在20–40秒、成功Boss15/16在100–140秒，但整体27场仅16胜，不视为全部玩法验收。完整失败记录、真机与自然配装未验收项详见开发报告。

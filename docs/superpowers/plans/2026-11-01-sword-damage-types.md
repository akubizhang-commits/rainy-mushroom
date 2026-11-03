# 剑修伤害类型实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 落实用户已确认的御剑纯物理、剑气与剑阵各半混合、青萍继承来源比例方案。

**Architecture:** 保留同一攻击力和现有伤害预算；类型决定原始分量，装备分别增强对应分量。青萍储存物理预算与总预算，法术由差额确定，避免二次增伤或二次减伤。怪物现有通用减伤同时作用于两部分，不新增抗性数值。

**Tech Stack:** JavaScript ESM、Node test、Cocos Creator。

**Spec:** 本聊天中用户确认的逐技能分类表；既有进阶契约见 `docs/xianxia/sect-tower-v1/75-skill-inheritance.md`。

## Global Constraints

- 御剑术、万剑归宗纯物理；剑气斩、纵横剑气、长虹贯日、天地一剑、剑影分光、四类剑阵、剑开天门为50%物理＋50%法术。
- 青萍按每次有效命中的实际比例累计；保留60%接触伤害、40%持续伤害及刷新规则。
- 不调整总系数、冷却、命中次数、暴击和装备独立附伤规则；不改素材。
- 使用“法术”，不使用“魔法”。辅助被动不产生独立伤害。
- 工作区已有大量未提交变更，只编辑本任务文件并保留事前副本，不整体提交。

## Review Focus

- 混合装备不能两份全额加算；单类型增强只作用于对应部分。
- 进阶与实际运行时来源别名必须一致。
- 多种来源合并青萍后不能丢失比例，过量伤害只按实际扣血生成预算。
- 青萍暂停、接触前后存档不能重复结算；非法分量应拒绝载入。
- 剑开天门保留独立预算，不因类型调整重复触发暴击或剑痕。

### Task 1：分类、分量和青萍继承

**Files:** `TowerGrowth.js`、`TowerDamage.js`（新增）、`TowerRun.js`、`TowerQingping.js`、`TowerCampaign.js`；测试 `sword-damage-types.test.mjs`。

**Interfaces:** `splitDamage(amount,type)` 返回 `{physical,magic}`；命中事件新增 `damageParts`。青萍接收 `addQingping(run,enemy,amount,physicalAmount)`，储存 `qingping.physicalAmount` / `woundPhysicalBudget`。

- [x] 写集成测试：物理/混合及进阶命中分量、装备单类型收益、青萍混合累计与过量、暂停恢复、非法存档、剑开天门不重复触发。
- [x] 运行新测试，确认因缺少分量与分类失败。
- [x] 实现类型、逐分量增伤、青萍预算传递与校验；按开发约定升级本模式存档版本。
- [x] 运行相关战斗、装备、青萍、存档回归。

### Task 2：展示与交付

**Files:** `TowerSkillPresentation.js`、现有分类测试、规则文档；生成 Cocos shared。

- [x] 更新展示测试，确认新标签与继承说明失败。
- [x] 统一法术用语、混合比例说明、周天阵法描述及青萍继承说明。
- [x] 运行 `npm test`，记录既有或并发失败；运行 `npm run cocos:build`。
- [x] 检查实际页面与代码差异，记录交付和验证结果。

## 实施记录

- 已检查当前工作区与技能运行链；原始输入副本保存在 `reports/sword-damage-types-2026-11-01/before/`。
- 不新增怪物双抗系统，沿用现有通用减伤；本次实现分量与类型的真实传递，为以后双抗提供明确输入。
- 独立审查完成；修复纯物理小数命中产生负法术分量、进而导致青萍存档无法恢复的问题，回归已RED→GREEN。
- 专项51项通过；全量仍有342项失败，记录于交付报告；未提交共享工作区。
- 同期独立法术攻击基数接口接入，保留他人修改并通过联动测试；基础50%比例不等于装备加成后的实际占比。

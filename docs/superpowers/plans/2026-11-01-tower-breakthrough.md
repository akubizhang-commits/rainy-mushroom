# 塔内波间突破 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 实现已确认的清波后原地突破交互，保留波次及可靠奖励账本。
**Architecture:** Run记录安全节点与跨境界成功事件，Campaign独占突破事务；View使用权威快照呈现波间面板。原有物品和概率不变。
**Tech Stack:** JavaScript、Node test、Cocos TypeScript。
**Spec:** docs/superpowers/specs/2026-11-01-tower-breakthrough-continuity-design.md

## Global Constraints
- 横屏；不重置本次挑战/奖励历史；只在安全节点突破。
- 使用真实库存与概率；存储失败全部回滚；旧档允许本模式重置。
- 共享工作区已有大量其他修改，仅修改本任务相关内容，不打包提交他人修改。

## Review Focus
- 无道具及连续失败仍可继续（事务及界面测试）。
- 旧快照覆盖成功状态、重复请求（事务测试）。
- 下一波未出怪与战斗普通暂停区分（Run测试）。
- 第20波和死亡不弹突破（Run测试）。
- 冷却、装备状态、修为跨两个境界保持（账本测试）。

### Task 1: 战斗状态与修为账本
Files: js/xianxia/TowerRun.js, js/xianxia/TowerBreakthrough.js, tests/tower-breakthrough.test.mjs
Interfaces: breakthroughXp(snapshot), validateBreakthrough(snapshot), Run.requestBreakthrough(), Run.commitBreakthrough(event).
- [x] 写安全节点、分段修为与恢复失败测试，运行确认RED。
- [x] 新模块校验突破事件；Run注册节点、自动暂停、忽略标记，更新属性。
- [x] 运行新测试及既有Run测试确认GREEN。

### Task 2: 持久化事务
Files: js/xianxia/TowerCampaign.js, tests/tower-breakthrough.test.mjs
Interfaces: act({type:'breakthrough',attemptId,sequence,id})，返回snapshot与结果。
- [x] 写成功/失败/重复/存储失败/伪造事件测试，确认RED。
- [x] 升级schema，校验既存事件前缀，原子消费道具与更新RNG和Run。
- [x] 验证失败回滚、重载一致与下一波奖励。

### Task 3: 横屏交互
Files: cocos-pilot/assets/scripts/TowerView.ts
- [x] 接入满修为提示、清波暂停、选择物品和成功/失败面板、技能返回节点及稍后队列。
- [x] 同步共享代码，构建并实机/浏览器检查交互。

### Task 4: 回归与报告
Files: reports/floor4-breakthrough-continuity-2026-11-01/, design/balance/, docs/xianxia/sect-tower-v1/59-balance-optimization.md
- [x] 全套测试与成长对比；分别记录既有失败及本任务失败。
- [x] 运行独立最终代码审阅，修正问题，保存结果。

## Execution ledger
- 2026-11-01：用户已确认方案并要求继续，直接本会话实施。共享工作区以当前新装备/技能版本为基线，避免新worktree遗漏未提交内容；不提交其他工作。

- 2026-11-01：独立审阅发现同波伪造安全节点，已按RED→GREEN补测试及时间/节点不可回退校验；结算晋升修为独立展示。
- 2026-11-01：13项新增核心/界面测试通过；完整1656项1323通过、333失败，与补齐非本任务TowerFlight模块后的修改前基线失败名称一致。Cocos构建及两种尺寸真实界面验证通过。

- 2026-11-01完成：22条新档238场战斗全通，47次突破含6次正常失败；4组同入场三策略对照均完成。最终报告：design/balance/balance-check-wave-breakthrough-2026-11-01.md。

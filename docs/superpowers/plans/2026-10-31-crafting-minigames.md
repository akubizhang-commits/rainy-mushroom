# 炼制小游戏 Implementation Plan

> 2026-11-01：用户试玩后决定移除两种小游戏，运行时代码与入口已撤下。本文仅作历史记录，素材制作暂停。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox syntax for tracking.

**Goal:** 在现有宗门内接入可操作、可试练的炼丹／炼器小游戏及安全返费。

**Architecture:** 固定tick纯逻辑负责操作与重放，Campaign负责两阶段制作结算，宿主独占写入后才初始化存档。Cocos独立视图复用纯逻辑，现有配方详情提供入口。

**Tech Stack:** JavaScript ES modules、Node test、Cocos Creator 3.8.8 TypeScript、浏览器宿主锁。

**Spec:** `docs/superpowers/specs/2026-10-31-crafting-minigames-design.md`

## Global Constraints

- 仅横屏；844×390／1280×720验证；原成品保底，亲手每次1件。
- 不调用Scenario、Meowa或其他付费生成；静态素材缺口输出prompt，临时程序表现明确待美术替换。
- 原材料、原品质、属性、掉落和抽奖随机域不改；修为丹门槛与超额确认沿用。
- 精炼60分10%返费，天工85分20%，每币种向下取整，廉价丹可返0。
- 开炉即生成正常成品与会话；完成另存返费；中止／重启无工艺奖。
- 当前工作区含大量尚未提交的实际游戏模块；基于现有文件开发，不回滚或提交无关改动。

## Review Focus

- 第二窗口不得初始化重置存档、强制恢复别人的会话或覆盖首次写入。
- 长帧、后台和pointer取消不能留下长按或补算失误。
- 保存失败重试不重扣、不重发；旧回执淘汰仍不可重放。
- 单炉修为丹超额提示必须独立于快捷99炉数量。
- 灵纹死支路经过阵眼不能算挑战成功，所有随机变体必须有双解。

## Task 1: 可重放玩法逻辑

**Files:** create `js/xianxia/TowerHandcraft.js`, `tests/xianxia-handcraft.test.mjs`.

**Interfaces:** `createHandcraft({mode,recipeId,seed})`返回可推进的session；`session.advance(dt)`、`session.input(type,value?)`、`session.snapshot()`、`session.events`；`replayHandcraft(config,events)`返回`{ok,score,grade,rate,...}`，不信任界面score。mode为`alchemy|forge`，recipeId绑定现有配方。

- [x] 先写无输入完成0—100分、非法重放拒绝、共鸣/温养、五次塑形/修整、阵眼路径/提示、同有效输入不同帧率同分的测试。
- [x] 运行`node --test tests/xianxia-handcraft.test.mjs`，确认新接口缺失后实现。
- [x] 按设计4—6节实现全部数值与有限模板；导出拼图求解工具供测试；界面需要的阶段、区间、当前动作、通路均在snapshot中。
- [x] 测试通过，记录接口示例供后续界面使用。

## Task 2: Campaign事务与写所有权

**Files:** modify `js/xianxia/TowerCampaign.js`, `cocos-pilot/assets/scripts/TowerView.ts`; create `js/xianxia/TowerWriteOwnership.js`, `tests/xianxia-handcraft-campaign.test.mjs`, `tests/xianxia-write-ownership.test.mjs`.

**Interfaces:** `beginHandcraft {mode,id,requestId,sequence,confirmed}` → `{ok,session}`；`finishHandcraft {sessionId,events}` → `{ok,score,grade,refund,...}`；`abandonHandcraft {sessionId}` → base-only receipt。state字段`handcraftSession/handcraftSequence/handcraftReceipts/handcraftBest`。

- [x] 先测 begin原子性、完成失败重试、放弃、非法事件、重复完成、锁住其他写命令、 reload后有效存档。
- [x] 一次副本调用已有单件制作逻辑并绑定会话；评分复用Task1，增加持久序列与有限回执。
- [x] 先测两个owner竞争、后台不释放、销毁后接管；协调器采用宿主生命周期独占，失败关闭。浏览器宿主在获取所有权前只能通过禁止setItem的只读storage构造Store。
- [x] 原小游戏宿主缺少跨窗口锁时保留现有快捷功能，亲手正式入口关闭并提示；原生单运行上下文需验证后才开放。
- [x] 运行以上测试及原alchemy/forging回归。不能用假的同步get/set锁宣称跨窗安全。

## Task 3: 横屏可操作界面

**Files:** create `cocos-pilot/assets/scripts/TowerHandcraftView.ts`; modify `TowerMenu.ts`, `TowerView.ts`（后者根代理集成）。

**Interfaces:** 独立视图构造接收parent,width,height,config,practice,onFinish(events),onAbandon,onClose；拥有`update(dt),pause(),destroy()`。Menu通过action type `openHandcraft`（UI路由不写Store），参数mode/id/practice；View打开预览成本、确认并调用begin，试练无需资源。

- [x] 接入试练、单件成本/最大返费/最佳成绩、单件超额库存确认、快捷批量保留。
- [x] 两阶段炼丹、三部位塑形、旋转灵纹/提示/基础完成/封灵；按钮不小于48逻辑像素；双指、空格、失焦暂停。
- [x] 最后结算保存失败保留结果，可重试；放弃无奖励；结果页实际返费、再炼、返回。
- [x] 程序素材仅作为可玩版本，不付费生成；提供静态图契约和prompt。
- [x] `npm run cocos:sync`及`npm run cocos:build`；在实际build浏览器操作与截图，验证两个横屏尺寸。

## Task 4: 审阅与交付

**Files:** create `design/crafting-minigames-2026-10-31/art-prompts.md`, `reports/crafting-minigames-2026-10-31/README.md`.

- [x] 检查现有素材库、给用户每张需要制作的静态素材prompt与尺寸/透明/锚点契约。
- [x] 跑`npm test`，记录基线已有失败与本次失败；新增失败修正。
- [x] 独立代码审阅后修正重要问题。
- [x] 报告代码验证、浏览器体验、未取得的真人/移动硬件证据及美术待办，不宣称美术已验收。

## 执行记录

- 用户已明确授权开发，本计划后直接执行。
- Ruling：现有未提交游戏源码不在HEAD内，继续在当前工作区开发并保留基线副本；不创建遗漏现有游戏代码的空worktree，也不清理其他改动。
- 接口检查：Task1重放供Task2使用；Task1快照供Task3使用；Task2操作供Task3由TowerView提交；TowerView仅根代理修改，避免并发冲突。

- 完成情况与限制见 `reports/crafting-minigames-2026-10-31/README.md`。移动真机、微信正式写锁和用户美术验收尚未完成，不包含在浏览器可玩版验收内。

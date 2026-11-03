# 技能评审落地 Implementation Plan

> **For agentic workers:** Implement with parallel, file-owned tasks; use meaningful RED→GREEN tests for combat and presentation behavior. User approved the review and implementation in this thread.

**Goal:** 落实现行剑修技能的名称、描述、升级形态和战斗表现，并提供下一份可直接使用的特效制作 prompt。

**Architecture:** 新增纯数据模块 `TowerSkillForms.js`，由战斗、说明与渲染共用；保留成长、伤害、冷却和学习成本表。多段技能拆分原整招伤害，避免段数增加直接乘倍。新高品质序列帧制作前用与真实判定一致的程序表现。

**Tech Stack:** JavaScript领域逻辑、Cocos Creator TypeScript表现、Node测试与真实WebGL浏览器验证。

**Spec:** `design/xianxia-skill-review-2026-10-30/REVIEW.md`

## Global Constraints

- 当前用户已授权执行，无需再次要求设计批准。
- 游戏仅支持横屏；检查1280×720与844×390。
- 保留所有技能ID和存档字段；本次不增加前置、不开放未来技能、不调整价格与冷却。
- 原伤害曲线不变；新段数分享原整招总额，伤害预算比较采用相同目标、装备、等级、完整命中。
- 工作区含大量未提交且未跟踪的现行代码，本次在原目录工作，保留所有无关改动。新worktree不会包含这些现行文件，因此不从旧HEAD另起实现。
- 生产文件修改前备份到 `/tmp/xianxia-skill-dev-baseline/`，供精确差异审查。
- 最初仅交付prompt；用户随后明确要求开始制作，追加两次Scenario生成共20 CU。正式视频素材保持单次招式，重复施法由游戏调度；新素材先交审核。
- 旧修仙生存模式的规则保持原样；共享名字只在不会误述旧机制的位置同步。

## Review Focus

- 多段技能完整命中不能额外复制整招伤害；每轮共享武器触发上下文。
- 移动、暂停、存读档中途不能补发已发生段数、改变已锁定区域或重复领奖。
- 环剑剑体扫碰与画面姿态一致，无我内外圈同敌共享间隔。
- 四象菱形只覆盖真实内部；阵眼、装饰剑、命中段数分开。
- 未学习预览、实际快照、下一等级展示均不得修改存档或读取错误等级。

## Task 1: 形态与战斗

Files: `js/xianxia/TowerSkillForms.js`、`js/xianxia/TowerRun.js`、`tests/xianxia-tower-skill-forms.test.mjs`。

API: `skillForm(id, level=1, parentLevel=1)`。进化ID的level为进化等级，parentLevel为母技能等级。返回形状、命中节拍数、剑数、阵眼数、范围、间隔、总时长与目标上限。`hits=null`表示持续环剑的共享受击间隔；被动为0。`orbitSwordPose(form,time,index)`返回局部剑柄、剑尖与方向，供战斗和画面共用。

- [x] 编写并观察失败：剑气1/2/3、一线1/2/3、剑影1/2/3/4的实际独立命中事件与总伤害守恒。
- [x] 实现分段释放与统一几何字段，保留施法上下文。
- [x] 编写并观察失败：环剑真实扫碰、内侧空隙、无我内圈与共享间隔。
- [x] 实现环剑与无我；两仪6/7、四象7/9的共享脉冲和菱形判定。
- [x] 编写并观察失败：归宗先刺后终剑、普通御剑让位、结束不补发积压剑轮。
- [x] 实现归宗与天地一剑更宽长的真实形态。
- [x] 运行战斗、装备、武器、暂停恢复相关测试。

## Task 2: 名称、说明与升级详情

Files: `TowerContent.js`、`TowerSkillPresentation.js`、`TowerMenu.ts`、`TowerSkillTreeCatalog.ts`及对应测试。

Consumes Task 1 `skillForm()`，不得独立复制段数成长表。

- [x] 改名：环剑诀、剑意余震、摄灵诀。保留ID。
- [x] 现行说明匹配实际机制；未来九项仅更新预览说明。
- [x] 用失败测试约束当前形态、下级变化、活动快照优先和读取不变性。
- [x] 展示真实段数、范围、锁向、目标规则和无变化等级，不隐藏重要结构字段。
- [x] 处理进化的母技能等级、整招与每段伤害语义。
- [x] 将剑意余震导航归入共用；不改变实际收益来源。
- [x] 验证小横屏详情滚动与按钮。

## Task 3: 战斗表现

Files: `TowerSkillEffects.ts`、`TowerView.ts`、`TowerCharacterArt.ts`及表现验证。

Consumes Task 1 forms/poses and actual effect/zone events.

- [x] 绘制真实环剑、两仪/四象区域和按事件同步的锋面。
- [x] 将锁妖塔剑气斩改为准确扇形月刃，不继续使用有闭环语义的素材表示扇形；原素材保留。
- [x] 区分普通线斩、天地重斩、剑影与归宗。
- [x] 被动以真实触发反馈代替常驻多圈。
- [x] 主动技能触发角色出招，避免同时多个技能反复重置动作。
- [x] 缓存色值、复用图形节点，暂停与退出清理一致。
- [x] 测试/真实浏览器核对1280×720与844×390。

## Task 4: 整合、交付与下一份 prompt

- [x] 保存全量修改前基线：1757项，1710通过，47失败。日志 `/tmp/xianxia-skill-development-before.log`。
- [x] 验证同步新共享模块与Cocos资源meta。
- [x] 跑全量测试，按失败名称比较基线，修复新增回归。
- [x] Cocos构建及真实浏览器截图；记录测得性能与未测设备限制。
- [x] 对实际差异做独立审查并处理高优先级问题。
- [x] 输出“剑气斩·基础单挥”prompt、负面约束和验收条件。
- [x] 更新实现记录，区分本轮程序表现与尚待制作的正式动画素材。

## Ledger

- 开始：用户批准35项评审，执行范围为当前已开放技能；远期能力仍未实装。
- 基线：完整失败名称另存本轮验证报告，避免把原有47项失败当成本次回归。
- 实现方式：三项文件所有权独立任务并行，主线程负责整合验证与素材契约。
- 最终：1808项测试、1761通过、47个原有失败，新增0；Cocos构建成功，1280×720及844×390真实浏览器验证通过。证据见 `design/xianxia-skill-review-2026-10-30/verification/README.md`。程序表现已接入，后续正式帧动画单独审核。
- 用户中途要求按`NEXT_VFX_PROMPT.md`制作：两次原始生成的中段仍闭环，保留失败证据；取有效刃光制作后期控制的49帧审核版并上传Scenario，未替换游戏程序特效。记录见`design/xianxia-sword-arc-v2-2026-10-30/README.md`。

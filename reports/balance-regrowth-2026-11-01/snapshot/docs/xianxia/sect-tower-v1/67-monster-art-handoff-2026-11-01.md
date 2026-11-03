# 怪物美术会话交接

2026-11-01。用户因上下文过长决定归档本会话，后续在新会话继续。本次归档前仅整理交接，不继续生成、修改游戏玩法或安排自动任务。

## 新会话从这里开始

1. 读取AGENTS.md、65-monster-art-production-standard.md、66-monster-art-gap-audit.md和本文件。
2. 先检查工作区现状与各物种production.json，避免覆盖其他会话的新改动。此工作区有大量既有未提交修改，不进行全量清理、回退或无差别提交。
3. 当前下一项为妖蝠扑翼动画试片，方案已在design/xianxia-bat-actions-2026-11-01/animation-plan.md。先查已有视频和Scenario额度，再决定提交；通过移动循环验收后，继续声波攻击、受击、死亡。
4. 已验收母图无需重复向用户索取或重画。用户若反馈游戏内显示问题，先调整接入参数并验证，再判断是否真有素材缺陷。

## 已完成与验收边界

- 妖猪：移动、拱击、冲锋、狂暴发动、受击、死亡已制作并接入；原生256px动作帧，Boss常态按原体型2倍，狂暴额外1.2倍。用户已认可体型及清晰度。
- 妖狼：移动、撕咬、长嚎、受击、死亡视频和256px动作图集已制作接入；保留全部原视频与生成记录。不要重新购买同一套动作，继续前先查看现有production.json及用户新反馈。
- 妖蛛、妖鳄、犀牛、牦牛、妖蝠、妖隼：本会话新母图均通过静态验收，512px透明运行图已接入。原稿、旧版本、去绿幕参考均保留。这六种仍是静态身体，尚未制作对应完整动画，不能把静态移动/缩放称为角色动画完成。
- 其他已有物种母图按66号清单复用。盘点范围是当前14个怪物族；特殊精英/Boss变体可能由其他会话增加，不能由“族级母图齐全”推断每个新增变体都已验收。
- 六种母图的新游戏显示尚待用户最终体验反馈。此会话没有收到用户对整批接入效果的最终确认。

## 文件索引（均相对项目根）

| 内容 | 路径 |
| --- | --- |
| 六种静态接入、旧运行图备份、导出脚本、检查记录 | design/xianxia-approved-monsters-2026-11-01/ |
| 真实游戏预览页 | design/xianxia-approved-monsters-2026-11-01/play.html |
| 妖蛛母图 | design/xianxia-spider-actions-2026-11-01/review-02/ |
| 妖鳄母图 | design/xianxia-crocodile-actions-2026-11-01/review-02/ |
| 犀牛母图 | design/xianxia-rhino-actions-2026-11-01/review-01/ |
| 牦牛母图 | design/xianxia-yak-actions-2026-11-01/review-01/ |
| 妖蝠母图与待制作动画方案 | design/xianxia-bat-actions-2026-11-01/ |
| 妖隼母图 | design/xianxia-falcon-actions-2026-11-01/review-01/ |
| 妖猪动作、源视频、接入与验证 | design/xianxia-boar-actions-2026-10-31/ |
| 妖狼动作、源视频、接入与验证 | design/xianxia-wolf-actions-2026-10-31/ |
| 静态运行资源 | cocos-pilot/assets/resources/tower-monsters/ |
| 动作运行资源 | cocos-pilot/assets/resources/tower-monsters-motion/ |

本会话预览地址为http://127.0.0.1:8876/design/xianxia-approved-monsters-2026-11-01/play.html。新会话需核实本地服务器和构建是否仍有效，不假定服务常驻。

## 接入实现与检查

- TowerMonsterArt.ts接受256/512px方形静态图，启用bat、spider、rhino、yak；蛛和鳄正面母图不镜像。六种新Boss按基础2倍；bat/falcon额外1.25倍翼展系数，Boss画布275px，普通怪仍随自身半径。
- TowerMonsterMechanicsView.ts对已有非妖猪狂暴状态施加红色调与额外1.2倍；妖猪继续使用既有红色动作图集。未给物种新增狂暴技能。
- Cocos动态合图可将512px帧装入2048px纹理；验证实际SpriteFrame矩形，不把图集尺寸当源帧尺寸。
- 六种静态怪死亡仍由游戏原逻辑移除；倒地动画尚不存在。
- 最新web-mobile构建通过。browser.json记录1280/844横屏14组通过；fight.json记录6种真实战斗与鳄王实际M02触发，共7组通过。相关自动测试44项通过。
- 测试文件：tests/xianxia-tower-monster-animation.test.mjs、tests/tower-monster-mechanics-view.test.mjs、tests/xianxia-monster-mechanics.test.mjs、tests/tower-shadow-body-impact.test.mjs。
- 运行检查脚本：design/xianxia-approved-monsters-2026-11-01/verify.cjs、verify-fight.cjs。脚本使用本机Playwright及Chromium绝对路径，新环境需调整。
- 尚未完成微信真机内存/性能验收、六种完整动画验收；飞行怪躯干可读性、翼展裁剪、脚底/悬停锚点仍应随实际动画复核。
- 工作期间发现另有蜘蛛特殊变体spider-lady/spider-queen相关修改，已保留；不归本会话的六种母图验收结果覆盖。

## 后续动作队列

以下是基于本会话核对配置的计划，执行前重新读取真实攻击/机制代码：

1. 妖蝠：先原地扑翼循环，再声波远程攻击（不是撕咬）、受击、死亡。首段先验证翼根/翼指/翼膜及循环接缝，再批量制作。
2. 其他已验收但未动画化物种：用户可调整优先级，不按关卡顺序要求重画母图。
   - 妖蛛：移动、近身攻击/施法、蛛网/毒区施法、产卵、受击、死亡，按角色实际技能分别映射。
   - 妖鳄：移动、普通横扫、回旋尾扫、毒技能施法、狂暴发动、受击、死亡。
   - 犀牛：移动、普通横扫、冲锋起手/循环/收势、重踏、受击、死亡；不新增狂暴。
   - 牦牛：移动、重击、施法/号令、受击、死亡；机制特效独立制作，是否共用施法姿态需验证。
   - 妖隼：扑翼、羽毛远程攻击姿态、受击、死亡。母图prompt里提到的“俯冲”只是早期美术描述，不应据此新增俯冲玩法。
3. 妖猪/妖狼已有动作的进一步优化，仅针对实测问题推进；保留已验收版本与原始素材。

## 用户已确定的标准

- 静态素材不使用Scenario付费额度。需要新静态图时提供prompt，由用户生成后审核。
- 动态制作可使用Scenario额度；先核实模型和报价，优先复用已有素材。不删除付费原视频、原图或不满意版本。
- Boss常态以已验收妖猪2倍体型为基准；原生动作帧至少256px，并按最终物理显示大小检查。禁止128px缩小图再放大冒充高清。
- 有狂暴机制才做狂暴：发动完成后变红并额外放大20%，所有动作持续保持，时间结束或死亡立即恢复Boss常态。当前加速型15秒，明显增强威胁型10秒，不能为了美术擅自改伤害。
- 合理透视遮挡、非绿幕和留白不够不自动判废；先本地整理或试片。物品图标98%规则不适用于怪物。
- 真实游戏里分别看普通怪/Boss/狂暴，检查标签、裁剪、脚底、暂停、死亡；静态审核与完整动画验收分开。

## Scenario状态：仅为2026-11-01查询快照

使用既有团队team_Ur9UBLcjfvXmu2iaNKV7cFVh、项目proj_k6xCHLGuh1JrUQ7Vzo8vsZYV。

查询时团队为free，当前期间消费50 CU，已有历史错误确认每日计划上限50。consumption_limit_get的个人/项目unlimited仅表示没有额外限额，不代表团队额度无限。期间结束时间返回2026-11-02T00:00:00Z，即北京时间11月2日08:00。新会话必须重新查询，不沿用这个快照推断届时余额。

妖蝠参考尚未上传，无asset ID、无生成job ID，本轮静态接入新增CU为0。没有后台生成任务、定时任务或自动重试。下一次有额度时重新发现模型、读schema、报价，再生成首段试片。

已读取本地scenario-game-assets和scenario技能，以及Scenario skill_get返回的scenario-sprite-animation技能；后者可由新会话再次通过skill_get读取，缺少本地脚本不等于需要重买母图。

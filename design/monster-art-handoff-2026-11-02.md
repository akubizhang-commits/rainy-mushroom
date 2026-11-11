## 第二批技能动作已接入（2026-11-11，Scenario 50 CU）
牛魔王 M19、犀王 M20 冲锋前的架势、狼妖精英 M05、虎妖和隼妖精英 M07，按技能阶段播放。M20 没有 windup，布阵的 2 秒连续播放架势。虎妖自带的碎石和地裂已在本地去掉。定向测试 102/102，实机 22 组通过。已知问题：隼妖右翼被画面裁边，牛魔王角尖被上沿裁掉几像素。详见 design/xianxia-boss-skills-2026-11-11/README.md。
## 熊王 M09 掀浪已接入；明日 5 条技能请求已备好（2026-11-09 晚，Meowa 15 积分）
熊王 M09 用 Meowa 生成，去掉了自带的土块和裂缝，12 帧接入，熊王三个技能都有动作了。定向测试 102/102，实机 8 组通过；全量测试 2398/2399，唯一失败是装备图鉴美术缺口，和怪物无关。明日请求在 design/xianxia-boss-skills-2026-11-10-prep/（牛魔王 M19、犀王 M20 架势、狼妖精英 M05、虎妖和隼妖精英 M07，共 50 CU）。详见 design/xianxia-boss-skills-2026-11-09b/README.md。
## 熊王、犀王、牛魔王第一批技能动作已接入（2026-11-09，Scenario 40 CU）
熊王 M07 重踏、M04 岩甲蛰伏，犀王 M07 重踏，牛魔王 M15 环形震波，各 16 帧，按技能阶段播放；M07/M15 没有 active 阶段，recovery 从冲击帧开始。其余技能仍是立绘。没有改玩法。定向测试 102/102 通过，构建成功，实机 24 组通过。图集最大 3840×4000，真机内存待验证。今日 Scenario 50/50 CU，Meowa 20 积分未动。详见 design/xianxia-boss-skills-2026-11-09/README.md。
## 震岳犀王冲锋已接入（2026-11-09，Scenario 10 CU）
犀王冲锋只通过 M06 裂岩冲锋（和开始冲锋后的 M20）出现，按技能阶段播放 20 帧冲锋片段，没有改玩法。定向测试 102/102 通过，构建成功，实机 8 组通过（M06 和 sweep 各 4 组）。普攻缺口已全部补齐。今日 Scenario 已用 10/50 CU，Meowa 20 积分未动。详见 design/xianxia-rhino-charge-2026-11-09/README.md。
## 赤鬃猪妖冲锋已接入（2026-11-08，Meowa 15 积分）
charge 普攻播放 20 帧冲锋片段，bite 和 M06 不变。定向测试 102/102 通过，构建成功，实机 8 组通过（bite 和 charge 各 4 组）。图集变为 3840×3360（约 49 MiB），微信真机内存待验证。今日 Scenario 50/50 CU，Meowa 余额 5。详见 design/xianxia-boar-humanoid-charge-meowa/README.md。
## 犀王横扫、牛魔王重击已接入（2026-11-08，Scenario 20 CU）
犀王 sweep、牛魔王 slam 各 20 帧，只在对应普攻时播放；犀王冲锋和两族技能仍保持立绘。定向测试 102/102 通过，构建成功，实机 8 组通过。今日 Scenario 已用 50/50 CU。详见 design/xianxia-boss-attacks-2026-11-08/README.md。
## 蟒王/蛇女、蛛姬、摄魂蝠妖行走已接入（2026-11-08，Scenario 30 CU）
三族只在位移时播放 16 帧行走，普攻和技能仍保持立绘。定向测试 102/102 通过，构建成功，实机 36 组通过（9 个原型 × 左右 × 双横屏）。A 表（完全静态形态）的行走缺口已全部补齐。今日 Scenario 已用 30/50 CU，Meowa 20 积分未动。详见 design/xianxia-walks-2026-11-07/README-11-08.md。
## 明日三条行走请求已备好（2026-11-07 晚，0 CU）
蟒王/蛇女、蛛姬、蝠妖的行走：母图已整理到绿底，被包住的透明空洞已补，三张都已上传，dry run 都是 10 CU，请求在 design/xianxia-walks-2026-11-08-prep/。北京时间 08:00 后查 usage 再提交，并发上限 2。全量测试 2382/2386，新增的 1 项失败在塔入口奖励显示，和怪物美术无关。
## 赤鬃猪妖獠牙拱击已接入（2026-11-07，Meowa 15 积分）
Scenario 今日已用完，这条改用 Meowa V2（HD 480p、首尾帧同图、高帧率）。20 帧 bite 只在普攻 bite 时播放，charge 冲锋和 M06 仍保持立绘。定向测试 99/99 通过，构建成功，boar_normal_r4 实机 4 组通过。已知问题：前摇身体缩得偏多，生效帧偏正面。Meowa 余额 5，Scenario 50/50 CU。详见 design/xianxia-boar-humanoid-bite-meowa/README.md。
## 伏潭鳄王、镇魇白虎行走已接入（2026-11-07，Scenario 30 CU）
两族只在位移时播放 16 帧行走，sweep 和技能仍保持立绘。白虎 v1 因参考图头发有透明空洞，银发被染成黄绿色，未接入但保留；补洞后重新生成的 v2 已接入。定向测试 99/99 通过，构建成功，实机 16 组通过（第 4 层鳄王、第 5 层两只精英、第 9 层白虎）。已知问题：白虎身体偏正面。今日 Scenario 50/50 CU 已用完。详见 design/xianxia-walks-2026-11-07/README.md。
## 妖蛇咬击、熊妖拍地已接入（2026-11-07，Scenario 20 CU）
两条都按昨晚备好的请求提交。定向测试 97/97 通过，实机 24 组通过（含第 6 层熊王）。已知问题：熊妖举拳时裁掉 1px，844 宽屏幕上熊王举拳会压到 Boss 血条。详见 design/xianxia-attacks-2026-11-07/README.md。缺口表进度见 design/monster-motion-gap-audit-2026-11-06.md 末尾。

## 熊妖程序形变被否决，改回 Scenario（2026-11-06 晚，0 CU）

熊妖整体后仰再前压的预览，用户判定远未达到预期，不接入。结论：程序形变只用于妖蝠、妖隼这类小型飞行怪的扑咬，地面形态都走视频。熊妖普攻请求已备好：`design/xianxia-bear-humanoid-slam-scenario/request.json`（沿用行走参考图，dry run 10 CU）。明早额度恢复后先提交妖蛇 bite 和熊妖普攻两条。

## 低阶妖隼 bite 已用程序形变接入；妖蛇程序形变被否决（2026-11-06 晚，0 CU）

妖隼按妖蝠做法接入，97/97 定向测试、构建、实机 8 项通过，妖蝠实机 28 项重跑通过。妖蛇的颈部形变在后颈和身体处撕裂、截断，用户否决；妖蛇 bite 改回 Scenario，请求已备好（`design/xianxia-snake-bite-scenario/request.json`），明早额度恢复后提交。详见 `design/xianxia-low-bite-procedural/README.md`。

## 低阶妖蝠 bite 已用程序形变接入（2026-11-06 晚，0 CU）

用户验收了零费用的程序形变 B 版（飞行帧 + 整体前扑 + 前扑残影，不做张口），已接入。97/97 定向测试、构建、正式投放 3 个普通原型和 1 个精英 × 左右 × 双横屏 28 项实机通过。详见 `design/xianxia-bat-bite-procedural/README.md`。原先为妖蝠准备的 Scenario 请求不再提交，明天的额度可以留给妖蛇及后续项目。免费方案调研报告：`design/monster-motion-free-options-2026-11-06.md`；Google Flow 试制材料在 `design/xianxia-bat-bite-googleflow/`，等用户操作。

## 妖蝠、妖蛇 bite 已备好，等额度（2026-11-06 晚，0 CU）

开工检查：Scenario 今日 50/50 CU 已用完，北京时间 11-07 08:00 重置；Meowa 余额 0，今日 10 积分已领并用掉，下次北京时间 11-07 00:00。没有提交任何生成任务。
- 妖蝠 bite：复用飞行母图，左侧留白到 368px 后上传 `asset_KzTT52a3t8YmFNy7hL3yKHkr`，主体是飞行参考的 0.8 倍，接入时用固定 displayScale 补回。请求和 prompt 见 `design/xianxia-bat-bite-scenario/request.json`。
- 妖蛇 bite：行走 v2 参考整体右移 120px 后上传 `asset_zH9DimfALdCi84zTenwg28ii`，比例不变。请求见 `design/xianxia-snake-bite-scenario/request.json`。
- 两条 dry run 都报价 10 CU。额度恢复后先查 usage，再并行提交这两条（并发上限 2）。

## 高阶熊妖行走已接入；妖蛇v1未通过（2026-11-06，Meowa 20积分）

按用户确认的顺序推进：①熊妖行走 → ②低阶妖蛇行走 → ③高阶隼/狼/虎单次普攻 → ④赤鬃猪妖行走 → ⑤死亡动作后排。缺口盘点以 tower-monsters-motion/*.json 的 clips 和 TowerContent 正式投放为准。

- ①已完成。Meowa V2 一次10积分，16帧480px，1920²图集。仅实际位移时播放，静止/攻击/机制回退立绘。95项专项测试通过；双横屏32组（普通/精英/第6层Boss）通过。全仓2378/2381，3项失败在改前代码下同样失败。详见 design/xianxia-bear-humanoid-walk-meowa/README.md。旧 Scenario request 未提交。
- ②已接入（Scenario，10 CU）。v2 给参考图右侧留白，尾巴没有出画；按用户要求先接入，后续再优化。共 8 组实测通过，详见 design/xianxia-snake-walk-meowa/README.md。v1（Meowa）未通过，原记录：复用512母图，本地去纸底，没有重画。第7–13帧尾巴出画被裁，不接入。重试需加右侧padding并约束尾巴摆幅，见 design/xianxia-snake-walk-meowa/README.md。
- Meowa余额0。Kiro已接入Scenario MCP：team_Ur9UBLcjfvXmu2iaNKV7cFVh / proj_k6xCHLGuh1JrUQ7Vzo8vsZYV，free套餐每日50 CU。③已完成：狼/虎/隼高阶单次普攻已接入（30 CU），已知问题是爪尖贴边少量裁切、虎妖身体扭转，见 design/xianxia-humanoid-attacks-2026-11-06/README.md。④已完成：赤鬃猪妖行走已接入（10 CU），已知问题是朝向摆动、蹄子在少数帧贴底，见 design/xianxia-boar-humanoid-walk-scenario/README.md。今日 Scenario 已用 50/50 CU。核查结论：低阶熊、虎、鳄的撕咬普攻早已复用 slam/sweep，并已实机通过，原缺口表写错了，见 design/xianxia-low-beast-bite-check-2026-11-06/README.md。下一步以 design/monster-motion-gap-audit-2026-11-06.md 为准：这份是对照代码复核后的缺口表和顺序，开工前先读。真机未验。

## 怪物动画与技能任务线批量收尾（2026-11-05，0额度）

本地剩余检查已完成：修复连续普通敌弹阻塞Boss技能的问题，新增构建入口缺失检查，并更新过时怪物测试夹具。当前全仓2341/2341通过；隔离Cocos包双横屏146组、6次跨层及退出缓存检查、157帧像素核对通过。9层Boss每项配置技能在90秒窗口均启动；该测试启用assist，不能当正常受伤/控制环境验收。独立复核无阻断。917构建文件/151源码文件验收后无漂移，未发布、未替换共享默认包。

报告：reports/monster-batch-closeout-2026-11-05/README.md。此前本任务线“下一项”暂停恢复、控制边界、普通攻击时机、自然选招、混合波次与资源释放均已完成，不再重复排队。仍未完成：高阶熊行走（额度）、蛇姬转头（关键帧）、M08转向（用户延期）、微信真机性能/内存。M13/M14/M21/M24未正式投放，不能称所有动画均完成。全仓结果含并行任务修复，勿将其他任务改动归于本轮。

## 连续蛛网控制免疫边界验收完成（2026-11-05，0额度）

M10精英/蛛后×双横屏×5时间点，共20组浏览器通过，48项相关单测通过，独立复核通过。解除禁锢后的免疫早期、中段和到期前一帧再次中网均扣血但不重新禁锢、不刷新控制计时；到期帧及后一帧重新禁锢0.7秒，持续输入在到期后恢复。报告 reports/monster-web-immunity-2026-11-05/README.md。

无生产修改，固定旧构建、人工复制首网区域安排二次命中；结论限1/60秒步长的M10控制免疫，不代表自然冷却/完整预警/其他控制类型。未真机、未全仓、未发布。下一项：控制状态下暂停/恢复、退出重进的时钟冻结与状态清理。

## M10 蛛网与普通怪同场控制核验完成（2026-11-05，0额度）

正式第3层精英蜘蛛/蛛后与两只普通妖狼，双横屏12组通过，52项相关单测通过；持续输入下禁锢0.7秒、到期恢复、狼咬与蛛网同帧只计更强一次伤害、提前受伤后蛛网不追加伤害或控制均通过。独立复核后补强“后续无延迟控制/免疫”断言，12组重跑通过。无生产修改，复用图集压紧固定构建；人工安排攻击时机，不代表完整自然围攻或当前共享工作区所有变更已验收。报告 reports/monster-web-mixed-control-2026-11-05/README.md。

下一项：连续中网时控制免疫期内/期满后的边界；本轮仅核对免疫截止字段，未验证整段3秒再次中网行为。未真机、未全仓、未发布。

## M10及保留M13/M14机制时机核验完成（2026-11-05，0额度）

正式部署核对：M10在第1/3/5/8层蜘蛛精英与第3层蛛后，共7个原型/楼层组合；M13/M14只有实现和素材，未配置正式负载。本轮第3层精英/蛛后M10真实配置单技能隔离12组通过，M13/M14仅内存夹具隔离12组通过；合计双横屏24组、相关单测57项通过。每落点实际预警fill、生效前保留、扣血与非透明落点特效对齐、移动躲避、死亡后继续advance无后续伤害和残留均通过。M14旧落点有0.2秒危险窗口，下一预警出现不能立即回踏；首轮前摇可被warningSafe延长，未修改游戏规则。无生产修改、未跑全仓/真机。报告 reports/monster-mechanic-timing-2026-11-05/README.md。下一项优先M10与普通怪同场、禁锢解除后移动恢复；不自动把M13/M14投放正式关卡。

## 怪物普通攻击时机第一批联调完成（2026-11-05，0额度）

8种现行普通攻击×双横屏16组真实Cocos核验通过，99项相关单测通过。本轮无生产修改。咬击/重击/横扫首次active同帧实际扣血；冲撞和羽弹接触后扣血。记录实际预警fill、对应时钟/阶段、恢复期消失；活跃阶段暂停比较节点/帧/颜色，死亡只验渲染清理。测试通过真实spec定点发起，不覆盖自然选招冷却、死亡后伤害或完整弹道计算。精英蜘蛛web已被M10取代，纠正夹具后改普通蜘蛛咬击，未修改玩法。报告 reports/monster-attack-timing-2026-11-05/README.md。下一项单独验收M10蛛网、M13落雷、M14落石的真实机制时间线，不能宣称所有怪物技能均通过。

## 四张怪物动作图集无损重排完成（2026-11-05，0额度）

妖狼/妖蝠/低阶隼/犀牛图集整格重排，共157帧RGBA逐字节一致，原生清晰度、动画顺序/速度、阶段、脚底/缩放不变，生产渲染逻辑未修改。旧PNG/JSON完整保留于design/monster-atlas-packing-2026-11-05/originals。四图RGBA尺寸估算合计减少6.89MiB；真实Cocos第7层178.83→175.70MiB，第6层152.25→150.49，第8层130.31→128.31。47项专项、32组混合波次、缓存生命周期、独立审查通过；不等于进程RSS/GPU实测，手机未验、未跑全仓。报告 reports/monster-atlas-packing-2026-11-05/README.md。下一项可检查技能预警、命中特效与实际伤害时机；额度不足时继续本地联调，不反复提交生成。

## 怪物动作原图公共缓存释放完成（2026-11-05，0额度）

继上一轮纹理销毁，本轮释放TowerAssetQueue里怪物动作图集及元数据的独占引用，取消旧异步加载和重试。共享头像、技能特效仍保留。真实Cocos路线6→7→8→9→6→9退出后，动作队列25项→0项，动作ImageAsset引用2→0，重新进入正常；原图RGBA尺寸估算323.20MiB→0不等于进程RSS/GPU实测。47项专项、32组双横屏混合波次通过，独立审查无阻塞问题；完成时4个相关生产文件与构建记录哈希一致。未跑全仓、真机未验。报告 reports/monster-source-cache-2026-11-05/README.md。下项可评估第7层单层约178.83MiB峰值，暂不改图片清晰度或帧率；熊妖仍等额度，不重复提交生成。

## 怪物动画纹理生命周期修复完成（2026-11-05，0额度）

TowerView换层或战斗结束时销毁旧怪物渲染器，同层暂停和界面重建复用纹理。真实Cocos路线6→7→8→9→6→9通过，第9层持有动画纹理RGBA估算从累计323.20降为42.19MiB，退出后渲染器纹理为0；公共队列图片引用仍在，不等于全部CPU/GPU内存清零。44项专项、32组双横屏混合波次通过，独立审查无阻塞问题。浏览器结论对应保存的构建快照；共享TowerView后续并行修改未复验。未跑全仓、真机未验。报告 reports/monster-texture-lifecycle-2026-11-05/README.md。后续可继续评估公共图片缓存和第7层单层峰值，熊妖仍等额度，不重复提交生成。

## 已接入动画混合波次联调完成（2026-11-05，0额度）

核对近期已验收的虎/犀/牛/高阶狼虎隼动画均已接入，图集哈希一致。第6–9层5/10/15/20波×双横屏32组正式编排冒烟通过，最多31只同场；可见图像、暂停、死亡单次清理与存档不变通过。修复TowerView中tiger-humanoid精英脚底标记多减半身造成的约50px偏低；旧构建复现，修复后75次实际Graphics坐标检查通过。42项专项通过，独立审查确认。未重新跑全仓，真机未验，绘制调用耗时不能当FPS。报告 reports/monster-mixed-wave-review-2026-11-05/README.md。熊妖动画仍等额度，蟒王等关键帧，M08暂缓。

## 高阶熊妖行走待动态额度恢复（2026-11-05）

已核对第6/8层正式投放124次，包含第6层撼地熊王；复用已验收母图，绿幕参考已上传，生成参数保存于 design/xianxia-bear-humanoid-walk-scenario/request.json。Meowa余额0；Scenario报价10 CU，但提交返回429 PlanLimitReachedError，团队free套餐今日50/50，未创建任务、未生成视频、未接入运行时。不得反复提交或换模型绕过额度。恢复额度后先复核，再从本任务继续；报告README内有普通/精英/Boss验收清单。

## 高阶青翎隼妖行走已接入（2026-11-05）

第7/9层8个正式原型共445次投放，复用背翼母图。Meowa余额0后Scenario一次10 CU，16帧原生480px/2.083秒；独立falcon-humanoid图集1920²/14.06MiB。实际位移播放、停止/攻击/机制回退，低阶飞行独立。42项专项、Cocos构建及双向双横屏32组通过，独立审查无实质问题。远程怪测试起点从210改420后正确验证移动，未修改玩法。全仓1998通过/280失败，无新增失败名，未全仓通过。参考/原片124帧/最终图集已归档，无后台任务，真机未验。详见 design/xianxia-falcon-humanoid-walk-scenario/README.md。下一项按正式缺口检查高阶熊妖等已有母图，并重新核对动态额度；妖猿未投放、蟒王等关键帧、M08暂缓。

## 高阶金睛虎妖行走已接入（2026-11-05）

第7/9层正式投放302只，复用母图，Meowa余额0后Scenario一次10 CU制作。16帧原生480px/1.25秒，独立tiger-humanoid图集1920²/14.06MiB；实际位移播放，停止/攻击/机制回退。41项专项、Cocos构建、五原型双向双横屏20组通过，独立审查无实质问题。全仓1972通过/301失败，相对狼妖上轮无新增失败名；未全仓通过。原片124帧及最终图集归档，无后台任务，真机未验。详见 design/xianxia-tiger-humanoid-walk-scenario/README.md。下一项按正式出场缺口补高阶隼妖等；妖猿未投放，蟒王等关键帧，M08暂缓。

## 高阶苍鬃狼妖行走已接入（2026-11-05）

已核对第8/9层正式投放共371只，复用母图，Meowa余额0后Scenario一次10 CU制作。16帧480px/1.833秒，独立wolf-humanoid图集1920²/14.06MiB；实际位移播放，停止/攻击/M05回退，低阶wolf不变。40项专项、Cocos构建、普通/精英双向双横屏16组通过，独立审查无重要问题。全仓1948通过/324失败，较上轮4个新失败名：3项非渲染玩法测试独立重现，1项当前源码已变化待复核，不能声称无新增失败。原片124帧和最终图集归档，无后台任务，真机未验。详见 design/xianxia-wolf-humanoid-walk-scenario/README.md。后续按正式投放缺口选高阶隼/虎等，不做未投放妖猿；蟒王等关键帧、M08暂缓。

## 低阶斑纹妖虎普通挥爪已接入（2026-11-05）

已核对第7层正式出场 tiger_normal_r3。复用母图，Meowa余额0后Scenario一次10 CU生成；21帧480px按10/3/8映射原1/.18/.9秒，旧15帧行走像素保持，合并图集2880²/31.64MiB。帧级固定倍率/脚底校准保持动作切换体型，高阶虎妖/白虎与机制仍用原表现。39项专项、Cocos构建、3正式形态双向双横屏12组通过，独立审查无重要问题；全仓1924通过/344失败，无新增失败名，未全仓通过。动态合图测试误判已修正并保留记录。源片124帧及过程完整保存，最终图集归档Scenario，无后台任务，真机未验。报告 design/xianxia-tiger-sweep-scenario/README.md。后续只按正式投放动作缺口排期；妖猿/蝎/蜈蚣未投放，蟒王等关键帧，M08暂缓。

## 苍罡牛魔王行走已接入（Scenario）

Meowa余额0后按用户授权改用Scenario，复用直立母图，一次10 CU生成480px原视频。本地去绿、脚底平移与循环截取后接入16帧480px/1.75秒；仅实际位移播放，停止/攻击/M19/M15/M05回退原表现，Boss220px，rhino独立。38项专项、Cocos构建及双向双横屏8组通过；独立审查无重要问题。扩展回归1902通过/364失败，无新增失败名，未全仓通过。原片124帧与候选全保留，最终图集已回存Scenario集合，无后台任务，真机未验。完整报告 design/xianxia-yak-walk-scenario/README.md。下一项先核对正式投放怪物的动作缺口；妖猿当前未投放，不制作其行走；蟒王等关键帧、M08继续暂缓。

# 怪物美术新会话交接 · 2026-11-02

## 续做：震岳犀王行走已接入

直立母图复用，源640px/16帧，本地去绿修补肩颈孔洞，15帧480px循环接入；停止/攻击/机制仍用原表现，220pxBoss与牛魔王保持。37项专项、构建、双横屏8组通过。耗10积分，Meowa余额0，无后台任务；原片/修补前后帧保留。详见 `xianxia-rhino-walk-meowa/README.md`。下一项候选牛魔王行走，先复核动态额度；蟒王等关键帧，M08继续暂缓。

## 续做：低阶妖虎行走已接入

原母图复用，Meowa源640px/16帧，本地整理15帧480px循环。仅tiger低阶移动，静止/攻击/机制回退；高阶形态不变。25项专项、构建及双向双横屏24组通过。耗10积分，余额10，无后台任务；原片和重复末帧保留。完整记录 `xianxia-tiger-walk-meowa/README.md`。蟒王等待关键帧，M08继续暂缓，不把本次算作全部动作完成。

## 蟒王摆首两版试制未通过

复用已验收蛇女母图，通过Meowa生成两版960px/32帧。V1转头时丢失发髻/头饰且尾尖移动；V2保住形象但220px离线预览下摆首与嘴部开合不足。均未接入，原片/透明候选/逐帧检查保留于design/xianxia-snake-lady-breath-meowa。净消耗50积分，余额20，无后台任务。下一步改用明确转头关键帧约束，先验关键帧，避免继续相同方式试错。

## 低阶妖熊普通拍地已接入

Meowa V2动作本地清理后接入，24帧480px，按原1s/0.18s/0.9s分段，原21帧行走保留。仅低阶bear，精英/Boss人形熊保持。25项定向测试、Web构建与五原型双向双横屏20组完整阶段通过，独立审查无重要问题；全仓1752通过/502失败，与上轮失败名称一致。图集单份RGBA42.19MiB，微信真机内存未验。本轮新增生成费用0，原片/失败版本保留。记录：design/xianxia-bear-slam-meowa-v2/README.md。

## 标签／血条避让与实景复查已完成（2026-11-04）

标签与血条整体避让角色、机关、碎裂素材及顶部界面，机关/技能优先，远移标签添加引线，死亡/到期清理。21 项定向测试、Web 构建、M04 双向双横屏 12 阶段及 M16、M03、虫卵孵化、普通横扫回归通过，共保留 68 图；895 文件固定副本验收前后哈希一致。0 CU，无新图。全仓 1751 通过/502 失败，未全套通过。详见 design/xianxia-monster-label-layout-2026-11-04/README.md。高阶本体动作和微信真机仍未完成，M08 回旋继续暂缓；后续按现有母图/动作清单补缺。

## 鳄／蜈蚣普通横扫已接入（2026-11-04）

复用 heavy-sweep.png，鳄灰绿／蜈蚣土褐，按原射程缩放，仅普通 sweep 命中阶段显示，原判定与低阶鳄 480px 动画保持。82 项相关测试、Web 构建、九形态品阶×双向×双横屏 36 组及 M08 隔离两组通过，0 CU。M08 验收脚本最初误等本体 active，已改为真实伤害区 active，失败记录保留，游戏逻辑未动。全仓 npm test 1747 通过/502 失败，未全套通过。见 design/xianxia-monster-physical-sweep-2026-11-04/README.md。下一项统一遮挡／标签／清晰度检查，优先密集召唤兽与结晶／碎晶标签；M08 回旋动作仍暂缓、微信真机未验收。

## 熊王本体晶甲已接入（2026-11-04）

正式 bear_boss 的 M04 复用 crystal.png 为肩胸前臂添加两组半透明晶甲，绑定当前批次两颗结晶；首颗破碎保留一组及原 80% 减伤，末颗才清空，原机制保持。53 项相关测试、Web 构建、双向双横屏 4 场景/12 图通过，0 CU。全仓 npm test 为 1735 通过/509 失败，完整失败清单保留，未改无关玩法。首版偏白截图/代码保留，最终记录 design/xianxia-monster-body-armor-2026-11-04/README.md。下一项鳄/蜈蚣普通横扫试复用，随后统一标签/遮挡/清晰度；M08 回旋继续暂缓，微信真机未验。

## M16 口部妖息衔接已验收（2026-11-04）

蟒王实际 snake-lady 立绘嘴部已连接至原伤害区域，复用现有毒息纹理，保留判定与时序。接续已有实现后补齐验证：48 项相关测试、双向×双横屏×三阶段 12 组通过，含预警、相机、暂停、死亡/到期清理。沿用已有成功构建的稳定副本，891 文件验收前后哈希一致；相机验收脚本首轮失败及修正重跑均保留。0 CU，未补角色摆首动画、未验微信真机。见 design/xianxia-monster-breath-mouth-2026-11-04/README.md。下一项熊王本体护甲反馈，其后鳄/蜈蚣普通横扫与遮挡标签检查；M08 回旋继续暂缓。

## 普通拍地复用素材已接入（2026-11-04）

bear/ape/yak普通slam现已在原命中阶段复用尘环与碎岩，原圆形伤害/时序保持。26项相关测试、Web构建、7原型×双横屏14组验收通过，检查暂停/死亡/后摇清理，0 CU。见design/xianxia-monster-ordinary-slam-2026-11-04/README.md。仅普通拍地表现，未新增抬掌角色动画；下一步M16喷息口部连接，其余本体护甲/横扫/标签仍待处理，M08回旋继续暂缓。

## M03汲灵联系已接入（2026-11-04）

用户紫色光带去绿后1024×192已接入灵核到施法者的细连线及模拟时间明暗脉动，回血原逻辑保持，击破/结束立即断开。21项相关测试、Web构建、正式M03双横屏回血/中断通过，0 CU。见design/xianxia-monster-spirit-flow-2026-11-04/README.md。暂不新增静态图prompt：普通slam、M16喷息连接、本体护甲和其余横扫先复用/调整已有素材，M08回旋仍暂缓；不是宣称所有表现完成。

## M04结晶碎裂已接入（2026-11-04）

用户碎裂结晶去品红后512×512透明图已接入每颗结晶的死亡事件；第一颗碎裂仍保留护甲，最后一颗才解除，原机制不变。49项测试、Web构建、正式M04双横屏顺序/暂停/消退/清理通过。0 CU。见design/xianxia-monster-crystal-break-2026-11-04/README.md。下一张可选增强为M03汲灵细流，prompt见design/xianxia-monster-spirit-flow-2026-11-04/static-prompt.md；原灵核无需重画，基础流动仍可程序复用。M08回旋继续暂缓。

## M22孵化残囊已接入（2026-11-04）

用户《暗紫裂口异形卵荚.png》去绿后512×512透明图已接入实际成功孵化事件，原位保留1.2秒并淡出；击破/主人死亡/未产生幼体不显示。46项测试、Web构建、M22双横屏击破与孵化区分/脚底/暂停/消退通过。0 CU。见design/xianxia-monster-egg-hatched-2026-11-04/README.md。下一张可选增强为已有M04护甲结晶的碎裂状态，prompt见design/xianxia-monster-crystal-break-2026-11-04/static-prompt.md。M08回旋仍暂缓，M03联系与普通slam等继续优先复用。

## 犀王普通横扫冲击弧已接入（2026-11-04）

用户《霓虹洋红背景上的风刃幻影.png》去品红后导出768×288透明图，仅rhino普通sweep使用。21项相关测试、Web构建、犀王左右×双横屏4组实景通过，已看图确认方向、范围与透明边缘。当前仅有rhino_boss正式原型，不声称普通/精英投放验收。首份共享构建副本资源404已记录，最终一致副本通过。0 CU。记录：design/xianxia-monster-heavy-sweep-2026-11-04/README.md。下一张为复用已有M22妖卵母图的孵化残囊编辑，prompt：design/xianxia-monster-egg-hatched-2026-11-04/static-prompt.md；M08回旋仍暂缓。

## 虎类普通横扫爪痕接入（2026-11-04）

用户新爪痕图已保留原稿并去品红，768×512透明图接入虎类普通sweep。实景发现并修正原普通扇形预警背向绘制问题，判定不变。20项渲染/方向测试、Web构建、普通/精英/Boss×左右×双横屏12组通过；扩展战斗回归26通过5失败单独保留，未宣称全套通过。0 CU。详见design/xianxia-monster-claw-swipe-2026-11-04/README.md。下一张犀类普通横扫厚重冲击弧prompt：design/xianxia-monster-heavy-sweep-2026-11-04/static-prompt.md。M08角色回旋仍暂缓。

## 最新入口（交接前已核对当前工程）

以下为最新状态；正文中早期“下一张”“本会话终点”均为历史记录，请勿按旧顺序重复制作。

- 2026-11-04最新：用户《震撼横向碎石爆裂特效.png》已去品红并接入M09，独立1024×384透明图，原机制保持。68项测试、Web构建、稳定副本双横屏6阶段通过；共享构建资源404及第一副本失败记录保留，未声称修复构建链路。0 CU，原图和旧尘浪均保留。见design/xianxia-monster-earth-wave-rubble-2026-11-04/README.md。下一张用户素材：虎类普通横扫三道爪痕，prompt见design/xianxia-monster-claw-swipe-2026-11-04/static-prompt.md；M08回旋仍暂缓。

- 2026-11-04重新review修正：此前“19项有素材、待补0”仅代表渲染接入覆盖，不代表技能表现完整。M09土浪、M08尾扫仍为尘纹过渡；普通slam/sweep未自动接入M07/M08特效，另有M03回血联系、M04护甲解除、M22裂卵反馈可补。M16优先调整喷息连接而非重画。先复用；M08动作仍暂缓。完整分级审查见design/xianxia-monster-skill-material-review-2026-11-04/README.md。本轮未改运行代码、未生成素材、未做新全量实战。

- 2026-11-04最新：M24濒死绝唱复用M19两处晶环接入技能库，65项测试、Web构建、双横屏10%阈值/圈内外扣血/单次使用/暂停/清理通过，0 CU。当前19项专用素材、5项角色状态，24项技能的专用表现待补清单收口；不是全角色动画或真机验收。M24仍未配正式Boss。后续按真实角色动作缺口补验，M08回旋继续暂缓；前轮首层别名数值失败未处理。见design/xianxia-monster-last-song-2026-11-04/README.md和coverage.json。

- 2026-11-04最新：M21镇妖破甲阵复用M19晶环接入技能库，地面层与累计蓄能/引妖提示；63项测试、Web构建、双横屏夹具的90步蓄能/离圈保留/引怪触发原6秒20%易伤/暂停/清理通过，0 CU。首轮标签遮挡人物已下移，旧截图保留。当前专用素材18项、角色状态5项、专用表现待补M24；下一项M24复用地印并独立验低血量触发。M21未配正式Boss，微信真机未验收。见design/xianxia-monster-armor-trap-2026-11-04/README.md。

- 2026-11-04最新：M09撼岳掀浪复用M15土石尘浪接入，原胶囊预警/伤害/收招保持，熊王本体不冲锋。66项相关测试、Web构建、双横屏预警/生效/暂停/清理通过，0 CU。当前专用素材17项、角色状态5项、专用表现待补M21/M24；下一项技能库M21先审计地印复用与站圈/引怪语义。并非熊王拍地逐帧动画完成；前轮首层别名测试失败未处理，微信真机未验收。见design/xianxia-monster-earth-wave-2026-11-04/README.md。

- 2026-11-04最新复核：M08回旋尾扫已复用M15尘浪，原216度实心扇形判定/提示保持；Web构建及双横屏预警/生效/暂停/清理通过，0 CU。91项扩展回归90通过，首层妖猪别名数值一致性1项失败（未改平衡表）。构建及浏览器各首次失败、重试通过，未确定启动根因。专用素材16项、角色状态5项、专用表现待补3项（M09/M21/M24），下一项M09。M08角色回旋动画仍按用户要求暂缓，不等同动作验收。详见design/xianxia-monster-tail-sweep-2026-11-04/README.md。

- 2026-11-04最新：M12地面毒区复用M11瘴气接入，72项测试、构建及双横屏三落点/预警时序/逐个到期/暂停/清理通过，0 CU。见design/xianxia-monster-poison-ground-2026-11-04/README.md；首次浏览器启动瞬时失败及重跑通过均记录。当前专用素材15项、角色状态5项、待补4项（M08/M09/M21/M24）。下一项M08先审计复用。

- 2026-11-04 Scenario复查：用户要求妖熊拍地改用Scenario；同一团队仍为Free，今日消耗50 CU，与先前额度拦截状态一致。本轮未提交生成、无新费用。拍地材料保留，后续先复核额度；成员/项目unlimited不代表套餐无限。详见妖熊slam-production.json的scenarioCheck。

- 2026-11-04 最新：用户确认的低阶妖熊行走已接入bear-v1（21帧480px、12fps、2400×2400，RGBA21.97MiB）。68项测试、构建、双横屏实际引擎检查通过；当前低阶普通熊无狂暴，精英/Boss的bear-humanoid保持。下一项普通拍地已复用上传母图备好prompt，但百炼从延迟5/30刷新为“按量付费”，未提交、未授权付费，无后台任务。见 `design/xianxia-bear-actions-2026-11-04/README.md` 与 `slam-production.json`；不要重复生成已完成行走，M08继续暂缓。

- 2026-11-04 用户最新制作优先级：先跳过低阶妖鳄M08回旋尾扫，记录以后补；优先制作成功率高的动作，提高产出。先查真实动作缺口和已有合格素材，优先复用/重剪，其次选择固定视角、小幅局部动作、轮廓稳定的候选；大幅旋转、长尾展开、复杂倒地等暂后排。此排序是制作判断，不保证模型成功率；每条仍需验收，不能为产出降低标准。不要把研究M08骨骼方案当作当前下一项。

- 2026-11-04 暂缓待补：低阶妖鳄M08回旋尾扫，百炼免费两版均因尾部越界拒绝，第二版增加留白仍拉长尾巴、末姿未回位。两版源片、提示词、帧检查及重启条件均保留，见 `design/xianxia-crocodile-actions-2026-11-04/tail-review.md` 和 `tail-production.json`。未接入，无后台任务，当前不再追加生成。已接入行走和普通横扫保持。

- 2026-11-04 当前动作入口：低阶妖鳄普通横扫第二版已由助手验收接入，24帧480px，前摇/生效/收招按真实攻击计时播放。与行走合并为2880×3840图集，42.19MiB；67项测试、构建与双横屏实景通过。M08、高阶人形、死亡保持原表现。制作详情 `design/xianxia-crocodile-actions-2026-11-04/sweep-production.json`。当前无待审横扫，不要重复生成；后续按最新成功率优先规则筛选其他真实动作缺口，M08暂缓。

- 2026-11-04 当前动作入口：低阶妖鳄已通过百炼免费试制并接入行走，24帧480px、12fps；AI标记与绿幕阴影已本地清理，原片保留。67项相关测试、Cocos构建、1280/844双横屏实景通过。攻击/技能/死亡仍为原表现，高阶人形不变。详见 `design/xianxia-crocodile-actions-2026-11-04/README.md`。不要继续提交下面旧记录里的Scenario重试。后续先核对尚缺动作与素材，避免重画。

- 2026-11-04 动作最新：用户已确认妖隼扑翼并接入低阶falcon，11帧原生384px（固定裁框、无放大）、1536×1536图集、RGBA9MiB；80项测试、构建和双横屏引擎检查通过。高阶falcon-humanoid不变，其他动作保留原表现。见 `design/xianxia-falcon-actions-2026-11-04/README.md`。下一只低阶妖鳄已复用侧向素材试制，10CU首版因尾尖裁切/接缝不合格而拒绝；修订参数已备妥，但提交被团队free额度50/50拦截，无新任务。额度恢复后续作 `design/xianxia-crocodile-actions-2026-11-04/production.json` 的retry，不重画母图、不接入不合格首版、不绕过限额。无后台任务。


- 2026-11-04 怪物动作最新：用户确认的低阶妖蝠扑翼已接入，原生480px、13帧、1920×1920图集（RGBA14.0625MiB）。66项测试、Cocos构建及双横屏真实引擎检查通过，含普通/精英/低阶Boss尺寸、攻击静态回退、暂停和真实击杀清理；高阶bat-humanoid不变，其他动作未补。见 `design/xianxia-bat-actions-2026-11-04/README.md`。下一只低阶妖隼复用旧母图，首版翼尖裁切未通过；留白修订版11帧0.917秒候选无裁切，待用户观感确认，尚未接入。两版共20CU、源片全部保留，无后台任务，见 `design/xianxia-falcon-actions-2026-11-04/README.md` 和 review.html。不要重做已验收母图或再次生成当前候选。


- 2026-11-03最新审计：24项技能为14项专用素材、5项角色/动作/状态承载、5项专用表现待补（M08/M09/M12/M21/M24），不能统称全量美术验收通过。完整表见design/xianxia-monster-coverage-2026-11-03/README.md。下一项优先正式第四层M12地面毒区复用M11瘴气；已有poison飞弹不等于M12。暂不要求新母图。

- 2026-11-03最新：M17风刃封侧已复用sword-line-v1首帧接入，67项测试、构建及双横屏6组通过，0 CU；仍未配置正式怪物，仅夹具验证。见design/xianxia-monster-windblade-2026-11-03/README.md。下一步整理完整技能表现覆盖表，再确定真实母图缺口。

- 2026-11-03最新：M07裂地重踏复用M15尘浪，原整圆判定与红色范围提示保留。68项测试、构建、正式第六层熊Boss双横屏6组通过，0 CU。见design/xianxia-monster-stomp-2026-11-03/README.md。下一步审计M17是否可复用sword-line-v1青蓝长条；尚未接入，不要求新母图。

- 2026-11-03最新：M18狱锁柱直接复用M20石塔接入，75项测试、构建、双横屏6组及击破锁柱/锁链同步解除、暂停、死亡/到期通过。0 CU，M18仍仅技能库/夹具验证，不改变正式技能表。见design/xianxia-monster-lock-2026-11-03/README.md。下一步重新审计剩余风刃/土石素材缺口及复用范围。

- 2026-11-03最新：M04护甲结晶已复用凝灵晶母版接入正式第六层熊Boss；74项测试、构建、双横屏真实双结晶召出/首颗保甲/末颗破甲/暂停/清理通过，0 CU。见design/xianxia-monster-crystal-2026-11-03/README.md。下一步先检查M18锁柱复用既有机关柱，不要求新母图。

- 2026-11-03最新：M03汲灵回生已复用core_ling透明母版，0 CU；第五层蛇Boss真实召出、回血、击破中断/暴露、暂停、死亡/到期与双横屏通过，72项测试及构建成功。见design/xianxia-monster-core-2026-11-03/README.md。下一步先审计已有M04矿晶，无需新增灵核母图。

- 2026-11-03最新：M18锁链母图已本地去绿、按270度固定环带接入技能库，71项测试、构建及双横屏起中末段/击破锁柱解除/暂停/死亡/到期通过。M18未配置正式怪物，仅夹具验证，见design/xianxia-monster-chain-2026-11-03/README.md。下一步暂停新增出图要求，先复用已有M03灵核core_ling/master.png；M04矿晶、锁柱、风刃/土石类先审计复用，确有新缺口再给prompt。

- 2026-11-03最新：M14落石母图已本地去绿并接入技能库，预警末0.35秒下落、原伤害时点触地淡出，三轮原逻辑、双横屏18组、72项测试及构建通过。M14未配置正式怪物，仅夹具挂载验证。记录design/xianxia-monster-falling-rock-2026-11-03/README.md。下一用户母图M18狱锁禁锢C形锁链，prompt见design/xianxia-monster-chain-2026-11-03/static-prompt.md；同样未配置正式怪物，不擅改技能表。

- 2026-11-03最新：M19安全地印母图去品红并接入，第8/9层真实Boss、双横屏预警/生效/暂停/死亡/到期、69项测试与构建通过。见design/xianxia-monster-safe-seal-2026-11-03/README.md。下一用户母图技能库M14落石，prompt见design/xianxia-monster-falling-rock-2026-11-03/static-prompt.md；M14当前未配置正式怪物，不擅自添加，仅补素材。

- 2026-11-03最新：M20破阵机关柱用户母图已去绿并接入，第七层真实召柱/冲锋撞柱/破甲/清理、双横屏、68项测试及Cocos构建通过。见design/xianxia-monster-pillar-2026-11-03/README.md。下一用户母图M19六门避劫安全门地印，prompt见design/xianxia-monster-safe-seal-2026-11-03/static-prompt.md，尚未生成或接入。

- 2026-11-03最新：M15环形震波用户母图已本地去绿、展开并接入第八层牛魔王，按原半径35→200、宽45与90°安全缺口扩散。69项测试、构建及双横屏真实施法检查通过；首轮切片显示失败及修正版均保留。见design/xianxia-monster-shockwave-2026-11-03/README.md。下一用户母图M20破阵机关柱，prompt见design/xianxia-monster-pillar-2026-11-03/static-prompt.md，尚未生成或接入。

- 2026-11-03最新：M16摆首妖息母图验收接入，512×768透明图，局部整理为90度扇形，按真实伤害区方向扫动。69项测试、构建、双横屏真实第五层蟒王检查通过。见design/xianxia-monster-breath-2026-11-03/README.md。下一用户制图：第八层M15环形震波（保留90度安全缺口），prompt见design/xianxia-monster-shockwave-2026-11-03/static-prompt.md。

- 2026-11-03：M13落雷母图验收并接入技能美术，384×1024透明图，锚点对齐目标，原0.2秒窗口淡出。67项测试、构建、双横屏检查通过。注意M13未配置到当前正式怪物，本次仅夹具挂载验证，不改变阵容或技能表。见design/xianxia-monster-lightning-2026-11-03/README.md。下一用户制图：第五层已配置M16摆首妖息，prompt见design/xianxia-monster-breath-2026-11-03/static-prompt.md。

- 2026-11-03：M22噬灵妖卵母图验收接入，512×512透明图，角色深度层、脚底锚定、名称血条保留。65项测试、构建、双横屏真实产卵/击破/孵化验证通过。见design/xianxia-monster-egg-2026-11-03/README.md。M03灵核优先复用design/forging-materials/intake/core_ling/master.png。下一用户制图：M13落雷雷柱，prompt见design/xianxia-monster-lightning-2026-11-03/static-prompt.md。

- 2026-11-03：M11寒瘴泥沼母图验收接入，512×512透明图、独立地面层在人物下方，预警保留，生效后以泥沼替换红填充并保留细边界。74项测试、Cocos构建、双横屏真实M11及暂停/死亡/到期检查通过。见design/xianxia-monster-miasma-2026-11-03/README.md。下一张M22噬灵妖卵母图，prompt见design/xianxia-monster-egg-2026-11-03/static-prompt.md。

- 2026-11-03：蛇/蝎毒液弹体验收接入，512×256 RGBA、显示48×24，按实际弹道转向，不新增中毒/毒池机制。71项测试、Cocos构建和双横屏蛇/蝎双向真实发射/暂停/清理通过。见design/xianxia-monster-poison-2026-11-03/README.md。下一张为M11寒瘴泥沼地面母图，prompt见design/xianxia-monster-miasma-2026-11-03/static-prompt.md。

- 2026-11-03：妖蝠音波母图验收并接入hostile sonic，512×512透明图，按真实弹道朝向，52×52显示，原机制不变。70项测试、Cocos构建、双横屏真实发射/暂停/清理检查通过。见design/xianxia-monster-sonic-2026-11-03/README.md。下一母图为蛇/蝎共用毒液弹体，使用品红底，prompt见design/xianxia-monster-poison-2026-11-03/static-prompt.md。

- 2026-11-03：妖隼飞羽母图已接入hostile feather弹体，512×160，按实际速度朝向；M10蛛网红圈及红底按用户要求移除，判定不变。69项测试、构建与双横屏检查通过。见design/xianxia-monster-feather-2026-11-03/README.md。下一张母图为妖蝠音波，prompt见design/xianxia-monster-sonic-2026-11-03/static-prompt.md。

- 2026-11-03：用户蛛网母图已验收并接入M10飞行/展开/淡出表现，512px透明纹理，原技能判定不变，无新增Scenario费用。记录见design/xianxia-spider-web-2026-11-03/README.md。下一母图为妖隼飞羽弹体，prompt见design/xianxia-monster-feather-2026-11-03/static-prompt.md。蜘蛛死亡倒伏仍待补。

- 最新接入与续作（2026-11-04）：用户已确认蜘蛛death-v2，现已接入完整低阶move/bite/cast/hit/death；111帧256px、图集2048×3584（RGBA28MiB）。65项测试、构建、1280×720与844×390真实击杀/暂停/朝向/尸体清理通过。此前“死亡待确认/未接入”均为历史。下一只低阶妖蝠已复用验收母图生成扑翼试片，10CU；13帧1.083秒候选接缝比0.246，无边缘裁切，等待用户观感确认。见 `design/xianxia-bat-actions-2026-11-04/README.md`、production.json、loop-review.json与review.html。妖蝠尚未接入，高阶bat-humanoid不受影响；无后台生成任务，不重复生成母图或已完成试片。

- 动画最新进度（2026-11-03）：用户确认“效果不错，接入吧”，低阶野兽蜘蛛行走/单次攻击/M10施法/受击已接入spider-v1（75帧、256px、2048×2560图集、RGBA20MiB按需加载）。59项测试、Cocos构建、1280×720与844×390编译后实景动作/暂停/真实蛛网/真实击杀检查通过。本次接入新增0CU，五条生成累计50CU。死亡试片仍未形成倒伏，不接入，沿用原有死亡移除；修正版曾被套餐50/50拒绝，无job、无扣费，不绕过限额重试。源片、失败版、准确帧映射与检查见 `design/xianxia-spider-actions-2026-11-02/README.md`、production.json、export/cuts.json、integration/browser.json；integration/play.html为游戏内预览。仅影响1–3阶art_family=spider，不改高阶spider-lady或战斗数值。下一缺口是合格死亡动作，复用已上传母图；真机内存尚未验收。

- 五阶百足蜈王半人形母图已验收并静态接入，详见 `design/xianxia-centipede-humanoid-2026-11-02/README.md`。原图《三维视角甲壳巨兽概念图.png》已保留；资源 `centipede-humanoid` 为512px。
- `centipede_elite`（四阶赤节妖蜈）、`centipede_boss`（五阶百足蜈王）、`centipede_normal_r4`（四阶铁背蜈妖）共用该形态，低阶爬行蜈蚣保持。实际运行源表145个原型、27种美术资源现已无 `legacy-stage-placeholder`，运行图无缺失，暂不安排下一张母图或重复重画prompt。后续优先复用已验收母图补专属动作。
- 注意：`build-tower-content.py` 从 `rank-attributes.json` 生成运行原型，不能只更新 `beast-catalog.json`。本次两表已同步，6组横屏静态实景、58项测试和构建通过；专属动作与微信真机未完成。
- 本轮鳄、狼、隼、猿、蝠、猪已完成半人形静态接入；最新工程还已完成四阶裂石蝎王。各自 `design/xianxia-<family>-humanoid-2026-11-02/README.md` 为验收记录；对应资源为 `<family>-humanoid`。
- 静态接入不代表专属动作完成。既有低阶妖猪、妖狼动作保留，高阶不能套用其四足动画。不要擅自改阵容、技能、数值、奖励、碰撞。
- 原型表中的狼王、隼王、猿王、蝎王等不一定是当前固定关底。验证脚本里的第6层参数仅是展示夹具，不代表已投放该层。以最新源表与运行表为准。
- 新增加载界面后，截图前须等待 `!window.__towerTest.host.host.assetLoading?.blocked`；不能将加载界面截图当作实机角色验收。模板参考最新 `scripts/verify-scorpion-humanoid.cjs` 或 `scripts/verify-boar-humanoid.cjs`，普通怪可能没有 `mechanic` 字段。
- Cocos共享构建目录可能被其他会话使用，构建前检查，避免同时构建互相覆盖。保留其他会话的工作区修改。
- 本次交接没有启动新的素材生成或构建后台任务。继续遵循静态图由用户生成、助手给prompt并验收的约定，不使用Scenario付费静态生成。


## 目标与协作方式
用户逐张自行出图，助手给prompt、验收、本地抠图整理，再接入真实游戏。静态素材禁止使用Scenario付费额度；动态制作可按用户授权使用额度。必须读取根AGENTS.md与 docs/xianxia/sect-tower-v1/65-monster-art-production-standard.md。不要因自然遮挡、灰底、留白不足就要求重画。保留原图、旧版及所有付费生成历史。

## 当前生效规则
1–3阶野兽原型；4–6阶半人形（兽首直立；蜘蛛女性上身+蛛身，蛇女性上身+蛇尾）；7–9阶化形（人类头脸、四肢和手足，保留角/耳/纹/尾/翼等物种特征）。形态看品阶，不看普通/精英/Boss。仅改美术，不擅改数值、技能、碰撞、奖励或阶位。并非每种动物都要7–9阶。

## 已完成静态素材
- 六阶赤绡蛛姬：design/xianxia-spider-lady-2026-11-01/；spider-lady资源。九阶赤绡蛛后在同目录queen-review-01，是独立储备资源spider-queen，不代表已投放塔内。
- 六阶震岳犀王、苍鬃牛魔王：design/xianxia-humanoid-bosses-2026-11-01/，分别第7/8层Boss。
- 七阶镇魇白虎化形版：design/xianxia-white-tiger-human-2026-11-01/；第9层Boss。原图多余人耳用相邻银发遮盖，原图和局部修改脚本保留。较早的虎首版是半化形，不是当前七阶要求。
- 五阶赤鳞蟒王：design/xianxia-snake-lady-2026-11-01/；第5层Boss，snake-lady独立资源。
- 最新完成五阶撼地熊王：design/xianxia-bear-humanoid-2026-11-02/；第6层Boss，bear-humanoid。母图《披甲熊族战士.png》，去灰底并水平翻转为左朝向。按现行形态元数据同步4–6阶熊族；低阶保留bear。58项相关测试与两种横屏Boss静态实机检查通过，详情见该目录README及game-review/report.json。

上述均不等于专属动作动画完成。普通/精英复用形态的完整实景需后续继续验证；不要把静态缩放或位移说成动画。熊王没有追加狂暴。

## 下一步
建议下一张四阶伏潭鳄王的鳄首直立版，但先检查现有素材库/近期其他会话是否已补，避免重复出图。优先按真实缺口安排，不按楼层重画。现有虎首半人形图、蛛姬图可用于对应形态复用；四阶铁掌熊类现在可复用已完成bear-humanoid。后续隼、猿、蜈蚣、蝠等半化形缺口需重新根据当前源表审计。

## 重要：工程已在其他会话演进
旧 design/balance/balance-check-tower-roster-2026-11-01.md 只是历史快照，不要照其数据重新改表。当前已有具名精英、rank_role数值和form_stage/ art_family元数据，源文件 docs/xianxia/sect-tower-v1/data/rank-attributes.json、beast-catalog.json、tower-design.json；运行表js/xianxia/TowerContent.js。实际阵容和素材映射以当前文件为准。

TowerMonsterArt.ts现在从ARCHETYPES.art_family读取映射，不要恢复旧的ID硬编码三元表达式。bodySize/bodyScale已统一普通/精英/Boss规则。新增形态需：源表元数据、scripts/apply-tower-rank-role.py中的metadata逻辑（只编辑，勿为接图而运行整个重写阵容脚本）、渲染资源白名单、体型基准和锚点、标记落点。python3 scripts/build-tower-content.py 生成运行表；--check验证。谨慎保留其他会话变更，工作区有大量既有修改，不能全量回滚或全量提交。

## 工具与验证
Python含Pillow/numpy：/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3。
本地去灰底可参考各交付目录prepare.py；要逐张检查灰底连通域误伤内部材质、孔洞、发丝与边缘。输出保留原分辨率透明版、1024参考、至少256运行图。
Cocos构建：node scripts/cocos/build.mjs web-mobile（通常需要sandbox escalation，日志重定向/tmp）。
实机场景模板 scripts/verify-bear-humanoid.cjs、verify-snake-lady.cjs、verify-white-tiger-human.cjs，localhost/headless浏览器需要sandbox escalation。脚本用smoke内存存档，绝不改用户真实存档。白虎模板含狂暴检查。
相关测试：node --test tests/xianxia-tower-monster-animation.test.mjs tests/tower-monster-mechanics-view.test.mjs tests/xianxia-monster-mechanics.test.mjs tests/xianxia-tower-unique-bosses.test.mjs。

## 本会话终点
用户准备开新会话，已要求留交接。熊王当前工作已完成静态接入，没有生成新图或新动画中的后台任务。下一会话可从“复核四阶伏潭鳄王缺口并提供母图prompt”继续。

## 后续完成 · 2026-11-02 伏潭鳄王
四阶鳄首直立母图已验收并静态接入，详见design/xianxia-crocodile-humanoid-2026-11-02/README.md。stage=2鳄族共用crocodile-humanoid，低阶继续使用四足crocodile。两种横屏Boss常态/狂暴及普通精英展示通过，58项相关测试通过。尚未制作专属动作；上文“下一张伏潭鳄王”的缺口已补，不要重复要求出图。

## 后续完成 · 2026-11-02 狼族半人形
六阶苍鬃狼王母图已验收并接入4–6阶狼族，资源wolf-humanoid，详情见design/xianxia-wolf-humanoid-2026-11-02/README.md。低阶四足狼及动作保留。两种横屏展示夹具、暂停、死亡、58项相关测试与构建通过。苍鬃狼王当前不是固定关底，不改投放；未制作半人形专属动作。

## 后续完成 · 2026-11-02 隼族半人形
隼首直立版已通过静态验收，4–6阶映射falcon-humanoid，512纹理，保留1.25隼族显示系数。两种横屏普通/精英/Boss展示、暂停、死亡检查通过；不改固定关底投放，专属动作待制作。详见design/xianxia-falcon-humanoid-2026-11-02/README.md。下一张建议六阶撼岩猿王，prompt已保存design/xianxia-ape-humanoid-2026-11-02/static-prompt.md，未生成新图。

## 后续完成 · 2026-11-02 猿族半人形
猿王《石甲兽人战士.png》已验收并接入4–6阶猿族，资源ape-humanoid，低阶ape不变。两种横屏展示、暂停、死亡、58项测试和构建通过。原型展示不代表新增固定关底；专属动作待制作。详见design/xianxia-ape-humanoid-2026-11-02/README.md。下一张4–5阶摄魂蝠妖prompt已保存design/xianxia-bat-humanoid-2026-11-02/static-prompt.md，未生成。

## 后续完成 · 2026-11-02 蝠族半人形
4–5阶摄魂蝠妖已接入bat-humanoid，512纹理，低阶及三阶蝠王不变。两种横屏普通/精英展示、暂停、死亡检查、58项测试和构建通过。详见design/xianxia-bat-humanoid-2026-11-02/README.md。专属动画未制作。下一张四阶赤鬃猪妖prompt见design/xianxia-boar-humanoid-2026-11-02/static-prompt.md；其后仍有蝎、蜈半人形缺口，按最新源表复核。

## 后续完成 · 2026-11-02 猪族半人形
四阶赤鬃猪妖母图已验收并接入boar-humanoid，低阶与四足动作保持。两种横屏普通怪显示、暂停、死亡、58项测试与构建通过。详见design/xianxia-boar-humanoid-2026-11-02/README.md。下一张四阶裂石蝎王prompt见design/xianxia-scorpion-humanoid-2026-11-02/static-prompt.md；剩余蜈族形态缺口尚待制作。

## 后续完成 · 2026-11-02 蝎族半人形
四阶裂石蝎王已验收并接入scorpion-humanoid，低阶scorpion保留。两种横屏展示、暂停、死亡、58项测试与构建通过；专属动作待制作，不改关底投放。详见design/xianxia-scorpion-humanoid-2026-11-02/README.md。当前源表旧形态占位仅剩蜈族三项，下一张五阶百足蜈王prompt见design/xianxia-centipede-humanoid-2026-11-02/static-prompt.md。

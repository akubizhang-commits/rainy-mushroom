# 仙侠技能特效素材库

用户于 2026-10-30 明确要求：**后续先查素材库，未经明确要求不删旧素材。此前不满意的动画也全部保留，供其他技能复用。** 每次生成有费用；“未适配当前技能”只描述当时的审核结论，不代表素材没有价值。

制作下一份特效时，先检查本索引及现有 Scenario 资产。可直接使用、重剪，或从现有关键帧制作时优先复用。确需新生成时，记录已有素材不适配的原因和报价，再按用户明确的新制作要求执行。原片、审核片、图集、序列帧保持原路径；复用输出写入新版本路径并记录来源。未经用户明确要求，不删除、移动或覆盖旧素材。

既有资产已完成盘点；一线天 v2 与天地一剑审核版均使用旧原片做本地后期，没有发起新的模型生成。完整路径、SHA-256、文件字节数、已知 Scenario ID、状态与证据均在[manifest.json](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-vfx-asset-library/manifest.json)及其引用的目录索引中。未知 ID 或费用使用 `null`，不推测为零。

## 可直接回看的动画与图集

| 素材 | 当前状态 | 当时未采用或替换的原因 | 可复用方向 |
|---|---|---|---|
| [早期 Scenario 剑气斩原片](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-sword-arc-2026-10-30/source/scenario-approved.mp4) | 旧 Survivor 的现用源素材 | 中段接近闭环，不符合现行 Tower 的前方 90° 月刃契约 | 环形爆发、旋转剑气、剑阵脉冲候选；开口片段可继续选用 |
| [剑气斩 v2：文字生成原片](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-sword-arc-v2-2026-10-30/source/scenario-v1.mp4) | 备选可复用 | 旋转闭环，未作为本版剑气斩原样接入 | 环形冲击或回旋效果候选；刃光、细丝与消散片段 |
| [剑气斩 v2：首尾帧约束原片](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-sword-arc-v2-2026-10-30/source/scenario-v2.mp4) | 备选可复用；第 0 帧已实际复用 | 首帧正确，中段仍闭环 | 第 0 帧用于开口月刃；中段供其他有圆形范围的技能选片 |
| [剑气斩 v2：批准修订审核片](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-sword-arc-v2-2026-10-30/review/sword-qi-corrected-preview.mp4) | 当前 Tower 批准母版 | 已通过本轮用户审核 | 当前近身弧斩；后续同类月刃的质感与收势参考 |
| [旧 Survivor 图集](/Users/zhangnu/WeChatProjects/rainy-mushroom/cocos-pilot/assets/resources/tower-skill-fx/sword-arc.png) | 当前 Survivor 使用 | 旧布局、闭环片段不适配新 Tower 契约 | 保留 legacy 运行时；其他效果在新文件中派生 |
| [当前 Tower v2 图集](/Users/zhangnu/WeChatProjects/rainy-mushroom/cocos-pilot/assets/resources/tower-skill-fx/sword-arc-v2.png) | 当前 Tower 使用 | 16 帧、单击 0.25 秒；按实际半径映射 | 当前剑气斩；同类轮廓可独立派生 |
| [天地一剑正式图集](/Users/zhangnu/WeChatProjects/rainy-mushroom/cocos-pilot/assets/resources/tower-skill-fx/sword-tiandi-v1.png) | 已按用户批准接入 Tower | 16帧、0.75秒视觉窗口，每目标单次命中；图集与第三版审核源字节一致 | 当前天地一剑宽锋重斩；其他技能按范围另行派生 |
| [程序风刃 v3 录像](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-windblade-v3/windblade.webm) | 历史备选 | 多层风刃后来被单残月方案替代 | 风系扇扫、多层风刃的动势参考 |
| [程序残月 v4 录像](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-crescent-v4/crescent.webm) | 历史备选 | 后续增加柔光层次；没有将它记为全盘否定 | 单月刃轮廓、快速显形与收势参考 |
| [程序残月柔光 v5 录像](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-crescent-v5/crescent.webm) | 历史备选 | 当时用户认可细残月并要求增加层次；后来更换素材路线 | 刃口流光、内缘消散及减少闪烁的方案参考 |
| [一线天：历史 Scenario 审核原片](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-vfx-asset-library/source/yixiantian-2026-10-30-asset_EiryPFybxa4us2A1dp29At74.mp4) | 已从既有资产找回；备选可复用 | 起点爆发较大、白锋长时间驻留，首尾仍亮；尚未按新窄线单贯契约验收 | 优先拆出直线白芯、沿轴青焰重剪；发射闪光、枪芒拖尾或宽锋爆发可供其他技能选用 |

这些复用方向是选片建议，尚未代表某个新技能已经验收。程序录像包含受控放大与重复播放，只适合回看动势；它们不是新的 Scenario 原片，也不是可以直接接入的透明图集。接触表和游戏截图同样不会被标为动画图集。

## 一线天 v2 · 旧素材派生

2026-10-30 按新 prompt 复用旧一线天第12至35帧的白芯与青焰，移除起点大爆发和箭头，逐列归正后重新编排亮点、细丝及消隐。第二版通过几何和独立视觉复核，以下保留当时的审核记录。用户随后要求延长消散并直接接入，现已完成，最新接入状态见下节。此次没有新增生成费用。

| 文件 | 状态与用途 |
|---|---|
| [第二版单次贯穿审核片](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-yixiantian-v2-2026-10-30/attempt-02/yixiantian-single-preview.mp4) | 2秒、24fps、48帧；单次亮锋后消隐，1秒后为空黑 |
| [第二版一／二／三贯合成节奏片](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-yixiantian-v2-2026-10-30/attempt-02/yixiantian-cadence-stone.mp4) | 青石背景、实际宽度28与长度360/450/510，间隔0.16秒；明确为合成预览，非游戏运行录像 |
| [第二版主击透明图](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-yixiantian-v2-2026-10-30/attempt-02/impact-rgba.png) | 起点与终点固定的细长单贯参考 |
| [第二版透明候选图集](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-yixiantian-v2-2026-10-30/attempt-02/yixiantian-candidate-atlas.png) | 4096×512、16格；此为原审核候选，后续已按原字节复制接入，不能把16帧当作16次打击 |
| [第一版单次贯穿](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-yixiantian-v2-2026-10-30/attempt-01/yixiantian-single-preview.mp4) | 起点偏硬切的早期版本；保留供局部选片，第一版节奏片生成阶段因字体缺失未完成 |
| [第一版候选图集](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-yixiantian-v2-2026-10-30/attempt-01/yixiantian-candidate-atlas.png) | 同样完整保留，不替换第二版 |

两次尝试均保留48张透明帧、48张黑底帧、24张原片选帧及加工脚本快照。第二版另保留240张合成中间帧，使用[目录哈希索引](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-yixiantian-v2-2026-10-30/attempt-02/cadence-frame-index.json)记录，不重复复制。四份第二版主要成品已追加到原“一线天 · 动画审核 · 2026-10-30”集合；原视频仍在，当时集合共5件；加入下述延尾主审片后现为6件。[Scenario归档凭据](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-yixiantian-v2-2026-10-30/attempt-02/scenario-provenance.json)记录实际资产ID、源关系、上传验证与本地哈希。

## 一线天 v2 · 延长消散并接入

用户于2026-10-30授权延长消散后直接接入。当前版本的视觉寿命从0.25秒延至0.33秒，前0.05秒的亮锋速度保持不变，后续0.20秒消散素材用0.28秒播放。战斗效果仍为0.25秒，命中次数和0.16秒连贯间隔不变。透明图集直接复制原版，像素与SHA-256完全一致；本轮模型任务0、新增生成费用0。

| 文件 | 状态与用途 |
|---|---|
| [延长消散主审片](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-yixiantian-v2-2026-10-30/attempt-03-long-tail/yixiantian-long-tail-preview.mp4) | 2秒24fps放慢审片；已追加原Scenario集合，资产 `asset_3E8evfN44tNDBckzfBeJiZe3` |
| [0.25秒/0.33秒消散比较片](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-yixiantian-v2-2026-10-30/attempt-03-long-tail/yixiantian-tail-comparison.mp4) | 4秒60fps本地合成对比，非游戏实录；自动审批拒绝附属比较片外传，因此仅本地保留，未重试上传 |
| [已接入图集](/Users/zhangnu/WeChatProjects/rainy-mushroom/cocos-pilot/assets/resources/tower-skill-fx/sword-line-v1.png) | 4096×512、16格；复用既有 `asset_4YzyrST5PiMgbQpz3NwiVZgk`，没有重复上传或改写旧资产元数据 |
| [新播放契约](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-yixiantian-v2-2026-10-30/attempt-03-long-tail/runtime-contract.json) | 记录锚点、范围映射及0.33秒播放曲线 |
| [本轮归档凭据](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-yixiantian-v2-2026-10-30/attempt-03-long-tail/scenario-provenance.json) | 上传结果、来源、哈希、费用与保留记录；原集合共6件 |

本轮新增48张完整透明帧和8张验证静帧，并保留加工脚本快照。首次导出因整数帧精度断言中断的 `attempt-03-long-tail-incomplete-01` 也完整保留现存内容：1张帧、脚本和契约，明确记作1/48帧的不完整尝试。

[Cocos实景验证](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-yixiantian-v2-2026-10-30/integration/browser.json)覆盖16个真实引擎夹具、两种横屏及资源404回退，最终独立复跑均通过；中途并发导致的夹具等待超时另存为测试过程记录，不计为生产缺陷。[测试对照](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-yixiantian-v2-2026-10-30/integration/tests.json)为1833项中1792项通过、41项失败，失败名称与基线相同，新增9项通过。

[用户三贯预览](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-yixiantian-v2-2026-10-30/integration/runtime-three-hit-preview.mp4)为原实时录像1.8至5.2秒的正常速度选段，3.4秒展示两轮Lv10三贯，已避开开头加载占位画面。最终[真实引擎实时录像](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-yixiantian-v2-2026-10-30/integration/runtime-demo-realtime.mp4)由生产 `update(dt)` 驱动，原始WebM同时保留；`diagnostic-frame-step.webm` 是逐帧调试录像，不能当作实时表现。40张实景截图、4份录像和6份验证文档已写入[本地QA目录索引](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-yixiantian-v2-2026-10-30/integration/local-media-index.json)，均未上传Scenario。

## 一线天人物动作修复 · 本地验证归档

用户指出上一版实录中的挥剑反复抽动。本轮定位到第二、第三贯通知重复启动身体动作，导致第9帧倒退到第8帧；现已修复为首贯启动一次完整挥剑，后两贯继续独立播放剑气，身体自然收势。原人物图集、剑气图集、0.33秒消散窗口及战斗规则均保留。

- [修复后原速实录](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-yixiantian-action-fix-2026-10-30/after/character-fixed-realtime.mp4)：1280×720、约4.77秒，生产更新循环驱动；原始WebM同时保留。
- [同轮三贯前后姿势对比](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-yixiantian-action-fix-2026-10-30/after/before-after-character-poses.png)与[修复说明](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-yixiantian-action-fix-2026-10-30/README.md)：保留原问题诊断、修复前后时间轴及红绿测试日志。
- [本地QA目录索引](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-yixiantian-action-fix-2026-10-30/local-media-index.json)：113张诊断/验证图片、2份录像、11份文档。修复后时间轴PASS；1837项测试中1796通过、41项原失败，新增4项通过，失败名称未变。

此前770个媒体文件及旧目录索引的哈希均保持不变。上节录像作为动作修复前的历史版本继续保留；本轮仅本地追加，模型调用0、生成费用0CU、云端上传0。

## 天地一剑 · 宽锋重斩审核包

2026-10-30 复用旧一线天原片第12～35帧、横向约320～1020的白芯与青焰，重新编排宽实长刃、流光、收窄和裂光闭合。该轮最终候选为 `attempt-03`：独立美术检查通过，真实Cocos浏览器预演通过18项战斗夹具与2项退出清理，以待审候选交付，后续延尾及正式接入见下文。该轮预演只在浏览器会话临时加载候选，不修改生产源码、资源或构建。

| 文件 | 状态与用途 |
|---|---|
| [单次慢放审核片](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-tiandi-v1-2026-10-30/attempt-03/tiandi-single-preview.mp4) | 2秒、24fps；首帧主击，1.25秒起全黑；黑底视频本身不带alpha |
| [两阶游戏内原速预演](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-tiandi-v1-2026-10-30/rehearsal/attempt-03/tiandi-ranks-realtime-review.mp4) | 两阶各一次蓄势、命中和收势；4.733秒、30fps；原始WebM及单段MP4一并保留 |
| [两阶青石底合成片](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-tiandi-v1-2026-10-30/attempt-03/tiandi-two-ranks-stone.mp4) | 按670×80与770×112比较两阶；合成示意，非游戏录像 |
| [候选透明图集](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-tiandi-v1-2026-10-30/attempt-03/tiandi-candidate-atlas.png) | 4096×768，4×4共16帧；候选视觉窗口0.5秒，每次仍只结算一击 |
| [同尺度轮廓对比](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-tiandi-v1-2026-10-30/attempt-03/lineage-board.png) | 剑气斩月刃、一线天窄锋、天地一剑两阶宽锋并列 |
| [完整本地包索引](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-tiandi-v1-2026-10-30/local-media-index.json) | 414张图片、11份视频及23份文档/脚本/日志，448个文件逐一记录哈希 |

`attempt-01` 的硬轮廓、机械切面版和 `attempt-02` 的亮条叠加版完整保留。每版均有48张透明帧、48张黑底帧、24张源选帧及制作脚本快照；预演的服务启动失败和夹具失败记录也保留。此次新增425个媒体文件，原885个媒体及3个旧目录索引的字节和SHA-256全部未变。

本轮模型调用0，新增生成费用0CU。Scenario已创建空集合 `col_F9hrvpPjNqr4dvKcGmG4yFMj`，主审核片上传请求被自动审批拒绝，未取得upload ID、未上传文件、未新增云端资产，也未绕过或重试；成品完整保存在本地。[来源与归档凭据](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-tiandi-v1-2026-10-30/scenario-provenance.json)记录具体状态，不能把该空集合当作已归档的线上成品。

## 天地一剑 · 消散延长审核版

2026-10-30，用户认可上一版效果并希望消散更慢。新增 `attempt-04-long-tail`，沿用第三版透明图集的原始字节，将视觉播放窗口从 **0.50秒延至0.75秒**；最初0.0625秒保持原速，其后0.4375秒素材用0.6875秒播放。0.45秒蓄势、人物挥剑和每目标单次命中保持原样。用户随后批准正式接入，结果见下节；本节保留审核期记录。

| 文件 | 状态与用途 |
|---|---|
| [延长消散慢放审核片](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-tiandi-v1-2026-10-30/attempt-04-long-tail/tiandi-long-tail-preview.mp4) | 2秒、24fps；使用原有2.5倍慢放比例，另存48张RGBA帧 |
| [原速前后对比](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-tiandi-v1-2026-10-30/attempt-04-long-tail/tiandi-tail-comparison.mp4) | 4秒、60fps；同图集、同出手时刻的青石背景合成示意 |
| [两阶游戏原速预演](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-tiandi-v1-2026-10-30/attempt-04-long-tail/rehearsal/attempt-02/tiandi-tail-ranks-realtime-review.mp4) | 有效成品：1280×720、30fps、139帧、4.633秒；保留两段原始WebM |
| [独立美术与时序检查](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-tiandi-v1-2026-10-30/attempt-04-long-tail/independent-review.json) | 源图集哈希不变；前4张慢放帧逐像素一致，可见光总量单调下降，末尾全透明 |
| [Cocos预演检查](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-tiandi-v1-2026-10-30/attempt-04-long-tail/rehearsal/attempt-02/browser.json) | 18项场景夹具及2项清理检查通过；人物采样与原版一致，生产源码和资源未改动 |
| [新增独立包索引](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-tiandi-v1-2026-10-30/attempt-04-long-tail/local-media-index.json) | 77张图片、10份视频和18份文档/脚本/日志，105个文件逐一记录哈希 |

启动失败的记录、首次字幕导出导致的两帧短片及其诊断图均保留，并在[预演说明](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-tiandi-v1-2026-10-30/attempt-04-long-tail/rehearsal/README.md)标明无效，不能用于效果审核。新增87个媒体文件；原1310个媒体、43份已索引文档和4份旧目录索引均验证字节与SHA-256不变。本轮模型调用0、新增生成费用0CU、云端上传0。

## 天地一剑 · 正式接入

2026-10-30，用户明确批准接入消散延长版。正式 `SwordTiandiArt` 使用上述0.75秒时序，资源 `sword-tiandi-v1.png` 原样复制第三版图集，4096×768、4×4共16格，SHA-256仍为 `f5744f08482319e788e7b262d6614284528cc41176cb3ecf22c8d066ae3232e2`。尾光独立于0.25秒战斗效果记录，每目标仍只命中一次，人物动作保持原速。

| 文件 | 状态与用途 |
|---|---|
| [两阶正式游戏原速录像](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-tiandi-v1-2026-10-30/integration/browser-attempt-02/tiandi-production-ranks-realtime.mp4) | 第二轮已验证构建：1280×720、30fps、141帧、4.7秒；实际生产渲染器，未临时注入候选 |
| [正式接入说明](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-tiandi-v1-2026-10-30/integration/README.md) | 播放、几何、代码接线、清理与回退契约 |
| [第二轮浏览器验证](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-tiandi-v1-2026-10-30/integration/browser-attempt-02/browser.json) | 两种横屏、18项场景、2项资源检查、生命周期及真实404回退通过 |
| [测试对照](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-tiandi-v1-2026-10-30/integration/tests.json)与[构建记录](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-tiandi-v1-2026-10-30/integration/build-summary.json) | 正式构建通过；当轮1854项测试中1813通过，41项失败与基线相同，新增9项通过 |
| [接入验证包索引](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-tiandi-v1-2026-10-30/integration/local-media-index.json) | 两轮均保留：48张图片、10份录像、26份文档/脚本/日志，共84个文件逐项记录哈希 |

记录中的测试、录像与哈希对应各自验证时的构建。共享工作区后续出现了其他业务源码和构建更新，本归档不把这些后续版本视为已验证；具体边界保存在[后续变更记录](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-tiandi-v1-2026-10-30/integration/post-validation-workspace-change.json)。第一轮检查、两轮原始WebM、构建启动失败日志与红绿测试记录均保留。

本轮新增1张正式运行时图集和58个验证媒体文件。原1397个媒体、58份不含索引的已索引文档/脚本以及5份旧目录索引全部验证字节与SHA-256不变，旧审核包文件未改写。模型调用0、新增生成费用0CU、云端上传0。

## 剑气斩 · 飞行月牙形态预演

2026-10-30，按用户提出的1／4／7级变化，复用批准的月牙RGBA素材制作三行合成预演：1–3级一次近斩，4–6级单发飞射，7–10级暂拟三发连射。三个阶段使用同一月牙轮廓；飞行1.10秒抵达示意战场边界，结束消散0.36秒。七级三发为制作建议；本包尚未接入游戏，人物、碰撞、伤害和升级界面仍待随新机制验证。

| 文件 | 用途 |
|---|---|
| [三阶段原速预演](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-sword-arc-flight-2026-10-30/attempt-01/sword-arc-flight-form-preview.mp4) | 1440×810、60fps、6.4秒、两轮；占位人物和假人合成示意，非游戏实录 |
| [三行关键姿态图](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-sword-arc-flight-2026-10-30/attempt-01/contact/preview.png) | 各行取不同时间，比较近斩、单发和三发轮廓 |
| [可复用单月牙RGBA](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-sword-arc-flight-2026-10-30/attempt-01/components/body-approved-frame006-rgba.png) | 已批准第006帧的裁切候选，160×512；尚非生产图集 |
| [完整中英文prompt](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-skill-review-2026-10-30/NEXT_VFX_PROMPT_JIANQIZHAN_FLIGHT.md) | 稳定飞行主体、结束规则、单发复用与接入约束 |
| [技能说明同步稿](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-sword-arc-flight-2026-10-30/SKILL_COPY.md) | 当前等级描述及3→4／6→7级提示，待与机制同批接入 |
| [本地包索引](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-sword-arc-flight-2026-10-30/local-media-index.json) | 3张图片、1份视频、13份文档/脚本，共17个文件逐项记录哈希 |

原1456个媒体、84份其他文件及6份旧索引全部重新校验，保持原字节与SHA-256。新输出在独立目录保留，包含制作脚本、源哈希、参数、测量及解码抽帧检查。新增模型调用0、生成费用0CU、上传0。大型十字另作独立技能候选，本轮未制作或接入。

## 可继续加工的来源

- [可用月刃第 0 帧](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-sword-arc-v2-2026-10-30/review/usable-blade-frame.png)：取自首尾帧约束原片，已经复用于批准修订片。
- [开口轮廓参考图](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-sword-arc-v2-2026-10-30/source/open-arc-geometry-guide.png)：本地几何参考，已知 Scenario ID 记录在索引中。
- 修订版保留 49 张透明 RGBA 帧及对应 49 张黑底帧；早期原片另保留 49 张审核提取帧。逐文件哈希均已入库。
- 首版、约束版、修订版的接触表和历史实景截图共 16 张，供后续回看、选帧和比较；原路径不变。
- [修订加工脚本](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-sword-arc-v2-2026-10-30/prepare_review.py)与[运行时导出脚本](/Users/zhangnu/WeChatProjects/rainy-mushroom/scripts/art/prepare_sword_arc_v2.py)保留制作来源。复用时先另定输出路径，避免脚本默认输出覆盖已有审核媒体。

修订审核片使用 Scenario 刃光加本地动作、流光和消散编排。它是已有素材复用的实际例子，没有把局部可用原片当作废弃文件删除。黑底 MP4 没有 alpha；透明序列另存，接入时按目标技能真实范围和单次打击节奏处理。

## 盘点与缺项

现有逐项主索引包含 **13份视频、4张运行时图集、2张候选图集、32张参考/审核静帧、436张序列帧，共487个媒体文件**。另有240张合成中间帧、201张实景/动作诊断图片及16份引擎验证录像按目录索引保留，合计944个媒体文件。天地一剑原审核包通过 `assetPackageIndices` 单独收录425个媒体文件，消散延长版另增87个；飞行月牙形态预演另增4个，**全库合计1460个媒体文件**；文档、脚本和日志另计。此前1456个媒体、84份其他文件和6份旧目录索引全部保持原字节和原SHA-256；新增版本写在独立目录。主索引路径均存在，原10组序列完整，另1组是明确保留的1/48帧中断尝试；天地一剑三版的9组源帧/透明帧/黑底帧及48张延尾RGBA帧均完整，没有移动、删除或覆盖任何原媒体。

一线天原片 `asset_EiryPFybxa4us2A1dp29At74` 已从现有 Scenario 资产下载，1280×704、24fps、73 帧、约 3.04 秒，2,185,704 字节；本地文件与远端原始字节数及元数据一致。剑气斩集合内的 5 项资产（4 视频、1 几何图）均有本地对应，已知的剑气斩与一线天原片无缺项。检索过程及远程元数据保存在[定位记录](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-vfx-asset-library/source/scenario-preservation-provenance-2026-10-30.json)；Scenario 搜索结果不完整时已用资产列表和集合列表补核。旧版空黑末帧 `asset_DuT6gFKtD9StuDQraxLy9LRH` 保留为已知远程参考，未推测其本地文件哈希；它不是缺失的原动画视频。

费用只收录明确记录：剑气斩 v2 两次原片各实际 10 CU，一线天历史任务实际 15 CU（只读 job 元数据确认），合计已知 **35 CU**；其他历史金额未知，不据此声称免费。修订片、关键帧和图集不会重复累计源视频费用。一线天 v2 两次本地派生、延长消散接入版本及归档，以及天地一剑三版本地派生、消散延长版、正式接入和验证均没有新增模型生成费用。

制作依据：[一线天 · 基础单贯 prompt](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-skill-review-2026-10-30/NEXT_VFX_PROMPT_YIXIANTIAN.md)、[天地一剑 · 宽锋重斩 prompt](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-skill-review-2026-10-30/NEXT_VFX_PROMPT_TIANDIYIJIAN.md)。后续制作仍先对照本库选片；“大光柱、爆发、冲击环”类旧稿可能更适合上位技能，但须按各自范围与打击次数单独审核。


<!-- sword-qi-2026-10-30-cocos-integration -->
## 剑气斩飞行月牙与纵横剑气 · 正式接入

2026-10-30，按用户批准的形态接入游戏。剑气斩1–3级近身月牙、4–6级单发飞射、7–10级三发连射；纵横剑气1–3级近身十字、4–6级飞行十字、7–10级放大至1.5倍且每次释放仍为一发。飞行结束后停止位移并消散0.36秒。月牙复制已批准RGBA组件，十字复用既有线刃本地合成；旧预演章节与旧索引保留其归档时的历史状态。

**技能已接入，最新全量测试受并行改动影响未通过。** 当前技能专项131项、131项通过；最新工作区全量1928项中1798项通过、130项失败（相对初轮比较有85个新增失败记录）。初轮无新增失败的对照和最新失败明细均独立保留，不能据初轮或专项结果宣称当前全量通过。浏览器验收针对记录中的固定构建，实际源码变化标记与构建指纹一并保存。


- [正式接入说明](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-sword-qi-integration-2026-10-30/README.md)、[实机验证](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-sword-qi-integration-2026-10-30/qa/browser-attempt-08/browser.json)、[测试对照](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-sword-qi-integration-2026-10-30/verification/tests.json)和[构建记录](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-sword-qi-integration-2026-10-30/verification/build-summary.json)记录已验收范围与具体源码/构建哈希。
- [本轮包索引](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-sword-qi-integration-2026-10-30/local-media-index.json)保存112张图片、58份视频和134份文档、脚本、日志，共304个文件；含全部失败尝试与被Git忽略的日志。另将2张运行时精灵独立列入主索引。
- [保全审计](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-sword-qi-integration-2026-10-30/preservation-check.json)及本轮归档前后复核确认：此前1460个媒体、97份其他已索引文件和7份旧索引的原路径、字节及SHA-256均不变。旧记录全部保留，本轮索引自身的SHA-256由全局manifest记录。

本次追加后全库共 **1632个媒体文件**。新增模型调用0、新增生成费用0CU、云端上传0；历史已知费用仍为35CU，不重复累计旧原片。


<!-- sword-qi-curved-2026-10-30-cocos-revision -->
## 剑气胸口锚点与交叉月牙 · 修订接入

2026-10-30，飞行剑气按正式人物素材胸口抬升64设计单位；悬浮高度按每发释放时刻固定，方向旋转不改变竖直抬升，地面战斗坐标保持原语义。纵横剑气改为两道交叉月牙，弧形刃面交会处只命中一次；名称、等级阶段和攻击次数保持本轮既定设计。

原 `sword-qi-cross-v1.png` 直十字及其旧记录完整保留，作为历史版本供其他技能复用。本次以独立的 `sword-qi-cross-v2.png` 替代纵横剑气当前显示，复用旧月牙本地旋转合成；旧章节与旧条目不回写。

本次专项与最终实景验收通过；工作区全量测试仍有已记录失败，详情保留在验证汇总的 workspaceValidation 中，不能把封包成功解释为全量测试通过。

- [修订说明](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-sword-qi-curved-2026-10-30/README.md)、[验证汇总](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-sword-qi-curved-2026-10-30/verification-summary.json)及[最终实景验收](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-sword-qi-curved-2026-10-30/qa/final-smoke-attempt-02/browser.json)记录验收范围和构建指纹。
- [新包索引](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-sword-qi-curved-2026-10-30/local-media-index.json)收录191张图片、32份视频及192份文档、脚本、日志，共415个文件；失败尝试全部保留。另将1张新cross-v2运行时精灵追加到主索引。
- [保留核验](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-sword-qi-curved-2026-10-30/preservation-before.json)及封包前后复核确认：此前1632个媒体、231份其他文件和8份旧目录索引的原路径、字节数与SHA-256均不变。

本次追加后全库共 **1856个媒体文件**。新增模型调用0、新增生成费用0CU、云端上传0；历史已知费用仍为35CU。


2026-10-30 最新评审：纵横剑气 C 版双月牙同向预演，待用户审核；生产仍保留旧版，剑气斩已核验接入；本轮复用素材费用 0 CU，全部旧版及新候选保留。审核包 `design/xianxia-cross-forward-2026-10-30/local-media-index.json`；剑气斩接入核验 `design/xianxia-cross-forward-2026-10-30/approved-crescent/receipt.json`。


<!-- cross-forward-2026-10-30-v3-integration -->
## 纵横剑气 · 同向双月牙 v3 正式接入

2026-10-30，纵横剑气 C 版同向双月牙已接入 v3；新锚点、命中轮廓与显示同步，验证范围见接入汇总。用户批准的 C 版 PNG 按原字节接入，旧 v1、v2、A/B/C 候选和原片全部保留。

[接入说明](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-cross-forward-integration-2026-10-30/README.md)、[验证汇总](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-cross-forward-integration-2026-10-30/verification-summary.json)和[素材收据](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-cross-forward-integration-2026-10-30/assets/runtime-receipt.json)记录本次范围。此前2380个文件、10份旧索引已重新核验，保持原哈希。

本次包内84个文件（50个媒体），包外另追加1张运行时 PNG 与1份 meta（计其他文件）。全库现有1972个媒体。新增生成费用0 CU、上传0；旧章节保留历史状态。


2026-10-30 最新评审：环剑诀实体飞剑巡游外观预演，待用户审核；原生产技能保持现状；候选 `B`。本轮复用既有本地剑体，模型生成 0 次、生成费用 0 CU、云端上传 0 次；未知历史来源不登记为 Scenario 付费资产。全部旧版与本轮候选保留，审核包 `design/xianxia-orbit-v1-2026-10-30/local-media-index.json`。


<!-- orbit-2026-10-30-v1-integration -->
## 环剑诀 · 青白实体飞剑 v1 正式接入

2026-10-30，环剑诀青白实体飞剑已接入；径向朝外巡游与短淡弧尾，验证范围见接入汇总。批准的 B 版 PNG 按原字节接入；原色 A、青白 B、最初剑体和所有旧特效版本保留。

[接入说明](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-orbit-integration-2026-10-30/README.md)、[验证汇总](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-orbit-integration-2026-10-30/verification-summary.json)和[素材收据](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-orbit-integration-2026-10-30/assets/runtime-preparation.json)记录本次范围。此前2578个文件、12份旧索引已逐一核验，保持原哈希。

本次包内89个文件（46个媒体）；包外另追加1张运行时 PNG 与1份 meta。全库现有2092个媒体。新增生成费用0 CU、上传0；源素材历史Scenario ID与费用未知，旧章节保留其归档时状态。


<!-- liangyi-2026-10-30-v1-review -->
## 两仪剑阵 · 阴阳双剑阵眼审核包

2026-10-30，两仪剑阵固定真圆、阴阳双剑阵眼预演；单眼交替，第10级第7跳合鸣，等待用户审核。固定落点、两处阵眼和实际脉冲由预演编排；旧环只提取表面流纹，不作为旋转斩击。

复用此前10 CU的 `asset_dak8zaRYK5mYw7T5ohuGjAud` 原片及环剑批准剑体。本轮模型生成0次、生成费用0 CU、云端上传0次；剑体未知历史Scenario ID和费用继续为null，不重复累计旧原片费用。

[审核说明](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-liangyi-v1-2026-10-30/README.md)、[验证汇总](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-liangyi-v1-2026-10-30/verification-summary.json)和[美术合同](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-liangyi-v1-2026-10-30/art/contract.json)记录本轮范围。此前2669个文件、13份旧索引重新核验通过，保持原哈希；本轮包内127个文件，其中84个媒体。全部源文件、原色与新候选保留。


<!-- liangyi-2026-10-30-v2-review -->
## 两仪剑阵 · 色彩与打击感 v2 审核包

2026-10-30，两仪剑阵 v2 色彩与落剑打击感修订预演；等待用户审核，v1不满意版本全部封存保留。用户反馈第一版太淡、剑雨缺乏打击感；第一版原图、原视频、合同与索引保持封存。

本版沿用第一版环纹和青白/淡青剑体的原字节，色彩与落剑冲击由新预演编排加强。本轮模型生成0次、生成费用0 CU、云端上传0次；历史10 CU原片不重复计费，剑体未知历史Scenario ID和费用继续记为null。

[审核说明](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-liangyi-v2-2026-10-30/README.md)、[验证汇总](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-liangyi-v2-2026-10-30/verification-summary.json)和[来源记录](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-liangyi-v2-2026-10-30/source/provenance.json)记录本轮范围。此前2796个文件、14份旧索引重新核验通过，保持原哈希；本轮包内85个文件，其中52个媒体。全部旧候选继续保留。


<!-- liangyi-2026-10-30-v3-review -->
## 两仪剑阵 · 范围扩大 v3 审核包

2026-10-30，两仪剑阵 v3 范围扩大预演；半径为v2的1.2倍，等待用户审核，v1/v2全部封存保留。本轮按用户要求加大剑阵范围；v1/v2原图、原视频、合同与索引保持封存。

本版仅复制v2环纹和青白/淡青剑体的原字节及文档快照，预演半径扩大为1.2倍；未接入生产。本轮模型生成0次、生成费用0 CU、云端上传0次；历史10 CU原片不重复计费，剑体未知历史Scenario ID和费用继续记为null。

[审核说明](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-liangyi-v3-2026-10-30/README.md)、[验证汇总](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-liangyi-v3-2026-10-30/verification-summary.json)和[来源记录](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-liangyi-v3-2026-10-30/source/provenance.json)记录本轮范围。此前2881个文件、15份旧索引重新核验通过，保持原哈希；本轮包内74个文件，其中46个媒体。全部旧候选继续保留。


<!-- liangyi-2026-10-30-v3-integration -->
## 两仪剑阵 · 扩大版 v3 正式接入

2026-10-30，两仪剑阵 v3 扩大版已接入；半径为旧版1.2倍，双剑阵眼与落剑效果沿用批准版本。三张批准的 PNG 按原字节接入；v1/v2/v3审核包、原视频和所有旧候选保持封存。

[接入说明](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-liangyi-integration-2026-10-30/README.md)、[验证汇总](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-liangyi-integration-2026-10-30/verification-summary.json)和[素材收据](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-liangyi-integration-2026-10-30/assets/runtime-preparation.json)记录本次范围。此前2955个文件、16份旧索引逐一核验，保持原哈希。

新包索引含110个文件（含1份包外目录meta，其中45个媒体）；另追加3张运行时 PNG 及各自的3份image meta，每个路径只计一次。全库现有2322个媒体。本次新增费用0 CU、上传0；历史环纹10 CU不重复累计，剑体未知历史费用仍为null。旧章节保留归档时状态，已接入状态记录于本节。


<!-- sixiang-2026-10-30-v1-review -->
## 四象剑阵 · 扩大进化范围 v1 审核包

2026-10-30，四象剑阵 v1 扩大进化范围预演；四眼菱形剑阵，等待用户审核，全部两仪版本封存保留。本轮按用户要求制作更大范围的四象进化版；原图、原视频、两仪合同与索引保持封存。

本版复用两仪v3环纹和青白/淡青剑体原字节，新增四眼菱形范围与节拍编排；未接入生产。本轮模型生成0次、生成费用0 CU、云端上传0次；历史10 CU原片不重复计费，剑体未知历史Scenario ID和费用继续记为null。

[审核说明](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-sixiang-v1-2026-10-30/README.md)、[验证汇总](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-sixiang-v1-2026-10-30/verification-summary.json)和[来源记录](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-sixiang-v1-2026-10-30/source/provenance.json)记录本轮范围。此前3071个文件、17份旧索引重新核验通过，保持原哈希；本轮包内97个文件，其中53个媒体。全部旧候选继续保留。


<!-- sixiang-2026-10-30-v1-integration -->
## 四象剑阵 · 扩大进化版正式接入

2026-10-30，四象剑阵扩大进化版已接入；四眼菱形范围与7/9击沿用批准预演，共用既有三张纹理。旧四象审核包保持原有reviewOnly状态，正式接入结果另记于本节。

[接入说明](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-sixiang-integration-2026-10-30/README.md)、[验证汇总](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-sixiang-integration-2026-10-30/verification-summary.json)和[来源记录](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-sixiang-integration-2026-10-30/source/provenance.json)记录本次范围。生产代码及meta的定稿副本保存在[包内快照](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-sixiang-integration-2026-10-30/source/runtime-final/receipt.json)；生产路径本身不作为永久不可变素材入库。

此前3168个文件、18份旧索引逐一核验，保持原哈希。本轮只追加新包97个文件，其中43个媒体；共用的3张runtime PNG与3份image meta已在旧库中，不再重复计数。

模型调用0、生成费用0 CU、云端上传0。历史环纹原片10 CU不重复累计；剑体未知原始Scenario ID与费用仍记为null，全部源片、候选与审核版本继续保留。


## 无我剑境 · 两阶同屏预演 v1

用户已确认制作方向，动画待美术审核，尚未接入生产。一阶8剑、二阶12剑；复用既有剑体与环纹，展示随身内圈流纹及局部命中示意。这是10秒本地合成预演，不是游戏实录；0.6秒命中按示意编排。

[预演与当前技能进度](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-wuwo-v1-2026-10-30/README.md)；[完整索引](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-wuwo-v1-2026-10-30/local-media-index.json)。旧库3265个文件及19份索引再次核验通过。本轮新增20个文件，其中8个媒体；模型调用0、费用0 CU、上传0。全部旧版本保持原字节。

### 无我剑境 v1 用户审核结果：不通过

用户反馈与环剑诀过于相似，对当前预演不满意，并要求先核对无我剑境技能描述。v1不接入，原视频、静帧、脚本、来源记录与包索引全部封存保留。当前机制是环剑诀进化：新增内圈近身覆盖、扩大巡游范围、二阶增至12剑，内外圈共享每敌0.6秒命中间隔。后续重做需突出“进入剑境即可受到内圈剑意攻击”的可见反馈；新的美术方向或机制变更尚未获用户确认。本条覆盖前节“待审核”的当前状态，不回写旧审核包。

# 噬灵妖卵M22 · 2026-11-03

用户《紫雾蛛网异卵.png》通过验收，蛛丝包覆、闭合卵囊和紫色内光可辨。原图完整保留，使用本地去绿幕，未使用Scenario或新生成动画。

source-original.png为原图，extracted-alpha.png为原尺寸透明版，egg.png为512×512运行纹理；prepare.py可重现处理，preparation.json记录源哈希与边界，review.png为三种背景检查。

TowerEggArt按现有temporary.kind=egg实体显示，位于怪物深度层，按世界脚底Y排序；主体高度max(56,2×radius)，脚底锚定原世界位置。TowerMonsterMechanicsView保留名称和血条，纹理成功时隐藏旧圆形裂纹占位。失败时原占位继续显示。移除、击破、孵化到期、施法者死亡和退出时释放对应显示节点。健康值、攻击、产卵数量、8秒孵化及奖励规则均未改变。

65项相关测试通过，Cocos构建与双横屏检查通过。game-review/report.json记录真实M22产卵、脚底与深度、暂停、击破一枚不孵化、另一枚存活孵化成2只幼体；scripts/verify-monster-egg.cjs可重现。为隔离自动攻击，孵化段仅在验收夹具提高待孵化卵血量；初始显示与击破段使用原血量。最初脚底断言漏减镜头，以及未隔离自动攻击的孵化断言已修正，未改游戏机制。未制作破壳逐帧动画，微信真机尚未验证。

下一步：M03汲灵核优先复用design/forging-materials/intake/core_ling/master.png，无须重画。下一张需要用户出图的母图为M13落雷点名的独立雷柱，见../xianxia-monster-lightning-2026-11-03/static-prompt.md。

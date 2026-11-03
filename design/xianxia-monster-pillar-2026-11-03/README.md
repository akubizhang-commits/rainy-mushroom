# M20破阵机关柱 · 2026-11-03

用户《幽光水晶石塔祭坛.png》验收通过并接入。原图1254×1254，完整琥珀晶核、灰石护架和底座；造型较prompt修长但缩小后仍可辨认，不要求重画。本地去绿、清除溢色并保留石架内孔；透明母版extracted-alpha.png、原图source-original.png、prepare.py与源哈希preparation.json保留。运行图512×512，主体198×480，等比居中。本次无Scenario生成、上传或费用。

TowerPillarArt只替换temporary.kind=pillar的几何占位，使用角色深度层与实际脚底排序。可见高度max(100,radius*3)，不改变碰撞；本次实景高度100。名称和血条按柱顶避让HUD，小屏下柱名向远离本体的一侧错开60，避免挤到真身标识。保留原连线、冲锋预警、生命、自动索敌、撞柱破甲及奖励；场景障碍柱不变。资源约1MiB RGBA按需加载，共享纹理；暂停不变，召唤物消失、死亡、到期或本体死亡立即清理。不制作或宣称碎裂逐帧动画。

68项相关测试通过，Cocos Web构建通过。scripts/verify-monster-pillar.cjs使用第七层实际rhino_boss技能表触发M20，真实生成一根柱；移动玩家到柱后引导真实冲锋，检查撞柱后pillar移除、armor=0与M23破绽。另检查512纹理/脚底/深度/暂停/本体死亡/到期，1280×720与844×390均通过，见game-review/report.json。最终两种横屏截图已目视检查；首轮标签较近的截图保留在game-review-before-label-spacing。未验收微信真机性能。

下一用户母图：M19六门避劫的安全门地印，../xianxia-monster-safe-seal-2026-11-03/static-prompt.md。现有两处半径55安全区保留，母图只补地面提示。不增加传送功能，不改安全判定；尚未生成或接入。灵核与矿晶仍优先复用已有母图。

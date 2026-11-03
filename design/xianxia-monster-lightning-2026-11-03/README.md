# M13落雷点名 · 2026-11-03

用户《绿幕中心的霹雳闪电.png》通过母图验收。1024×1536原图保留为source-original.png；本地去绿幕、去混色与低强度背景杂色，输出extracted-alpha.png和384×1024运行图lightning.png。prepare.py可重现，preparation.json记录哈希和尺寸，review.png为三背景检查。费用0CU，无Scenario生成或上传。

TowerLightningArt在现有M13区域激活时显示雷柱，在原0.2秒生效窗口中淡出，不提前造成视觉命中。运行画布高300世界单位，等比宽112.5，锚点为纹理像素(173,970)，即UITransform(173/384,54/1024)，使下端亮点对齐原目标。保留原范围预警、标签和伤害；取消、到期、死亡及退出清理，不新增频闪或内部逐帧动画。

重要范围：M13已有逻辑，但当前正式BOSS_MECHANIC_LOADOUTS和ELITE_SKILLS没有配置M13。因此这是技能美术接入和储备，未给正式怪物擅加技能。游戏验证只在夹具内为测试Boss挂载M13。

67项相关测试、Cocos构建、1280×720与844×390游戏检查通过；game-review/report.json为PASS，覆盖激活、淡出、暂停、到期和施法者死亡。脚本scripts/verify-monster-lightning.cjs。桌面验收不代表微信真机验收。

下一张用户母图：第五层已配置的M16摆首妖息（连续90度扇形气流），见../xianxia-monster-breath-2026-11-03/static-prompt.md。现有毒液是独立液滴、泥沼是圆形地表，不能直接替代喷息主体。M03灵核仍优先复用既有锻造灵核原图。

# M16摆首妖息 · 2026-11-03

用户《霓虹粉背景下的绿色能量烟雾.png》通过本地整理验收。原图为较窄喷息，去品红后以极坐标重映射到实际90度圆扇形，保留雾丝与层次，避免视觉伸出有效半径。原图source-original.png、原尺寸透明extracted-alpha.png和脚本prepare.py均保留。preparation.json记录源哈希及几何，review.png为三背景检查。新增Scenario费用0。

运行资源tower-monsters-motion/breath.png为512×768，喷口锚点(16,384)、半径480像素。TowerBreathArt按z.radius等比缩放，锚定原技能区域原点，按实际z.faceX/z.faceY转向；这属于战斗平面表现，不为贴嘴擅移碰撞范围。生效后显示，末尾0.25秒淡出，保持3秒扫动、90度扇形和原伤害不变。显示成功后去掉该技能红色填充，保留细边界；预警及加载失败沿用原几何。

69项相关测试、Cocos构建及1280×720/844×390实景检查通过，game-review/report.json为PASS。scripts/verify-monster-breath.cjs使用第五层实际snake_boss技能表，真实推进模拟时钟检查起段、中段、末段朝向一致、暂停、施法者死亡和到期清理。无新增技能或阵容修改。未制作内部流动逐帧动画；微信真机尚未验收。

下一用户母图：第八层已有M15环形震波，270度圆弧波带和90度安全缺口，见../xianxia-monster-shockwave-2026-11-03/static-prompt.md。已有灵核原图仍优先复用，不重画。

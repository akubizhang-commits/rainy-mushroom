# M15环形震波 · 2026-11-03

用户《绿色背景上的尘土岩石冲击波.png》通过本地整理验收并接入第八层苍鬃牛魔王既有M15。原图1280×1280、尘浪与碎石可用；本地去绿底、去溢色，按中心(640,640)、半径310–580、角度±128°展开后适配270°圆形波带。原图source-original.png、原尺寸透明extracted-alpha.png、脚本prepare.py与preparation.json均保留。无Scenario调用、上传或费用。

运行纹理1152×256，约1.125MiB RGBA，72个切片共享同一纹理与材质；只在M15出现时加载。TowerShockwaveArt根据模拟区间radius/innerRadius更新波带，保留原35→200半径、45宽度、90°安全缺口、1秒扩散和原伤害。切片按真实方向旋转，独立图形模板裁到原环形判定，位于地面层；末0.15秒淡出。预警与加载失败保留原几何；已加载生效后取消红色填充，保留细范围线。节点随暂停冻结、取消/死亡/到期清理。不改变阵容、技能配置、碰撞、数值或奖励。这是母图的几何扩散表现，未制作内部流动逐帧动画。

69项相关测试与Cocos Web构建通过。scripts/verify-monster-shockwave.cjs使用第八层真实yak_boss技能表触发M15，检查起段/中段/末段、实际半径和宽度、方向、纹理尺寸、暂停、施法者死亡和到期清理；1280×720与844×390均通过，见game-review/report.json。实景截图已目视检查。微信真机性能尚未验收。

首轮截图发现Sprite.trim=false令子矩形按整张纹理尺寸计算，尘浪被压窄。根据本机Cocos simple assembler定位后修正为trim=true并加入回归断言，重新构建与实景检查通过。首轮game-review-before-slice-fix保留；其report原PASS仅代表自动生命周期断言，不代表视觉通过，已另记visual-review.json为失败。

下一母图：../xianxia-monster-pillar-2026-11-03/static-prompt.md，M20破阵机关柱；现有场景粗矮柱保留。M03灵核与矿晶类素材优先复用。

# 蛇、蝎毒液弹体 · 2026-11-03

用户提供《霓虹绿果冻液滴.png》，母图通过验收。绿色黏液、短尾、气泡与右向圆润前缘适合现有毒液弹体，局部高光较强但缩小后轮廓清楚。静态本地处理，未使用Scenario额度或生成动画。

- source-original.png：用户原图字节保留。
- prepare.py、preparation.json：去品红背景及溢色、透明边缘、主体裁剪、等比居中的重现脚本，记录源尺寸与SHA256。
- extracted-alpha.png：原分辨率透明图。
- poison.png：512×256 RGBA运行图；review.png：三种背景检查。
- 运行资源：cocos-pilot/assets/resources/tower-monsters-motion/poison.png。

TowerProjectileArt增加hostile poison纹理，显示48×24世界单位，随实际vx/vy转向。复用现有节点池、加载与销毁，不改攻击发射、速度270、碰撞半径12或伤害。不添加持续中毒、落地毒池。资源未加载或失败沿用原几何回退。

71项相关自动测试通过。Cocos构建及真实蛇/蝎双方向、双横屏（1280×720、844×390）发射、暂停、清理检查均通过，以game-review/report.json的8组PASS结果为证据；脚本scripts/verify-monster-poison.cjs。这里只接入静态弹体运动，没有内部逐帧液体动画。微信真机未验收。

下一张为现有M11寒瘴泥沼地面素材，见../xianxia-monster-miasma-2026-11-03/static-prompt.md，继续用品红背景。当前飞行弹体已覆盖feather/sonic/poison，蛛网另有专用素材。

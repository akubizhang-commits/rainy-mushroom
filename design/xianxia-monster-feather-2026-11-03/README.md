# 妖隼飞羽母图验收与接入 · 2026-11-03

用户提供《霜灰红羽孤悬绿幕.png》，授权验收后接入。原图完整保存在source-original.png；主体羽尖朝右、银白羽轴、灰黑羽片与暗红纹理符合既定需求。去绿底后结构完整，三底色检查见review.png，母图验收通过。

prepare.py生成extracted-alpha.png及512×160透明运行图feather.png；按实际轮廓裁掉大面积空白，再等比缩放和居中补边，不按物品图标98%规则处理。源哈希、原始尺寸和裁剪边界见preparation.json。所有源文件保留，未上传或调用Scenario，无新增费用。

运行资源位于cocos-pilot/assets/resources/tower-monsters-motion/feather.png。TowerProjectileArt仅对hostile且element=feather的真实弹体使用此图，显示画布48×15，尖端按实际vx/vy旋转，不改变速度、射程、伤害、碰撞和生成数量。无独立内部逐帧动画，飞行来自现有战斗模拟。加载失败保留原来的简易弹体显示。复用有上限的节点池并释放纹理引用。

69项相关测试通过；Cocos web-mobile构建通过；scripts/verify-monster-feather.cjs验证真实falcon_normal发射、左右朝向、512×160帧矩形、暂停和弹体移除，在1280×720、844×390均通过。报告与截图见game-review。微信真机尚未验收。

同轮按用户要求移除M10蛛网红色圆周及红色填充，仅保留原技能文字和实际蛛网；判定范围不变。旧带圈截图保留在../xianxia-spider-web-2026-11-03/before-red-ring-removal，更新截图见该目录game-review。

下一母图为妖蝠音波弹体，见../xianxia-monster-sonic-2026-11-03/static-prompt.md。

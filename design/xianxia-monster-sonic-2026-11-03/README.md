# 妖蝠音波弹体 · 2026-11-03

用户提供《紫罗兰能量波纹crescent arcs.png》，三道向右弯曲的紫白能量弧通过母图验收。静态图本地去绿幕，未使用Scenario、未上传、费用0CU。

## 文件与处理

- source-original.png：1254×1254原始文件，字节保留。
- prepare.py / preparation.json：可重现绿幕覆盖率估算、颜色去混合、低强度背景杂色清理与尺寸记录、源文件SHA256。
- extracted-alpha.png：原尺寸透明图；sonic.png：512×512透明运行纹理，保留三道弧线作为一个弹体。
- review.png：深色、浅色、石灰背景验收图。
- 运行资源：cocos-pilot/assets/resources/tower-monsters-motion/sonic.png。

TowerProjectileArt仅替换hostile && element==='sonic'的视觉，按实际vx/vy旋转，显示52×52世界单位。复用现有弹体池与生命周期，资源加载中/失败时沿用旧圆环回退。伤害、速度270、碰撞半径12、数量、发射和命中时机不变；没有增加内部逐帧动画。御剑及已接入飞羽继续使用自己的纹理与尺寸。

## 检查

透明边缘和内部间隙已在三种背景检查。相关70项自动测试通过。Cocos构建、1280×720与844×390真实妖蝠发射、双向弹道、暂停、离场清理均通过，结果见game-review/report.json（PASS）。脚本：scripts/verify-monster-sonic.cjs。桌面浏览器验收不等于微信真机验收。

下一母图为蛇/蝎共用毒液弹体，见../xianxia-monster-poison-2026-11-03/static-prompt.md；绿色主体改用品红底。当前poison只代表直接弹体，不新增持续中毒。

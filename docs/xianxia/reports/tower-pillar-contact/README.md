# 柱子遮挡与底座接触修复

## 原因与修改

1. 原来角色、怪物和石柱分属固定绘制层，角色永远盖住柱子。现在三者共用实体层，按地面Y坐标由远到近排序；角色的身体、手持剑、御剑飞行用剑、影子，以及未加载素材时的轮廓，都参与同一遮挡关系。妖雾仍在实体下面，攻击预警在上面。
2. 原来柱子采用半径64的圆碰撞，图像又向上偏移62，而角色脚底比模拟坐标低20。现在柱子使用与图像底座校准的六边形，图片锚点对应源图的地面位置；角色脚底、怪物脚底、光环和升级特效均对齐模拟地面坐标。移动、刷怪检查、弹道裁剪及寻路使用同一六边形。导航仍使用安全包围圈来构建路径点，该圈不参与碰撞。
3. 校准怪物脚底后，血条改为相对精灵顶部定位，避免穿过身体。

没有重新生成或修改原始素材，也没有重置存档。

## 验证

- Cocos web-mobile 构建通过。
- 场地、碰撞、战斗与回放：80项测试通过。
- 遮挡、脚底锚点、血条、素材缓存、飞行和角色动作：6项针对性host测试通过。
- 实际Chrome浏览器：1280×720与844×390均通过前后遮挡检查、底座下方接触检查和空地横向通行检查。
- 北柱中心(33,310)，从下方接近首次接触约(33.21,247.83)；沿y=244从x=-87到x=133能够完整走过，不再被原来的圆形范围拦住。
- 原有环境验证脚本中的素材加载、六边形边缘及刷怪妖雾淡出检查通过。
- 独立审查发现的怪物血条定位回归已修复，复核无剩余发现。

本记录只声明以上范围通过，不声明整个仓库全量测试通过。广范围host检查仍包含药铺、货币栏、入口图标和设置按钮尺寸等已有/同时进行的UI改动相关失败；没有为本次修复改写这些业务行为。

## 复跑

```sh
node --test tests/xianxia-tower-obstacles.test.mjs tests/xianxia-tower-run-arena.test.mjs tests/xianxia-tower-run-attacks.test.mjs tests/xianxia-tower-arena-view.test.mjs tests/xianxia-tower-run.test.mjs
node --test --test-name-pattern='pillar occludes|tower environment|character flight|character atlas|monster art caches' tests/xianxia-tower-host-tools.test.mjs
npm run cocos:build
node scripts/verify-tower-pillar-contact.cjs
node scripts/verify-tower-environment.cjs
```

`behind-*`：柱后遮挡；`front-*`：柱前显示；`contact-*`：由下方走到首次接触。机器记录见`report.json`。以上为实际浏览器渲染，并非微信真机测试。

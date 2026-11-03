# 下一份技能特效：一线天 · 基础单贯

**制作前先查素材库：** 先阅读[技能特效素材库](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-vfx-asset-library/README.md)及其`manifest.json`，检查此前剑气斩、一线天的原片、审核片和可用片段。能够复用、重剪或从现有关键帧制作时，优先使用已有素材；本文件仅提供制作方案，不启动任何付费生成。确需新生成时，先说明现有素材不适配的原因与报价，再按用户明确的新制作要求执行。此前不满意的版本仍保留供其他技能使用；未经用户明确要求，不删除、移动或覆盖旧素材。

制作目标：一道银白剑芯沿锁定直线瞬间贯通，青色细焰紧贴剑路拉长，随后沿原线消散。气势来自短促出手、极亮细锋和迅速收势。与已经确认的剑气斩放在同一画面时，应一眼读出“近身月刃”和“纵向贯穿”；宽长重剑与裂空终结留给天地一剑。

本文件只提供制作方案，未开始生成。之前的一线天独立样片尚未通过本版范围契约审核，不能当作本次已获准接入的素材。

旧一线天[原视频已经保留](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-vfx-asset-library/source/yixiantian-2026-10-30-asset_EiryPFybxa4us2A1dp29At74.mp4)。下一步优先检查其中的直线白芯与青焰能否重剪为本方案：拆出过大的起点爆发、缩短亮束驻留、补齐干净消散，派生到新文件供审核；若这条复用途径不适配，再考虑下方新生成 prompt。

## 对应现行技能

以`js/xianxia/TowerSkillForms.js`与`TowerGrowth.js`为准，不调整伤害或冷却。

| 技能等级 | 单招同敌最多命中 | 剑路长度 | 剑路宽度 | 每贯目标上限 |
|---|---:|---:|---:|---:|
| 1 | 1次 | 360 | 28 | 3 |
| 3 | 1次 | 390 | 28 | 4 |
| 6 | 2次 | 450 | 28 | 5 |
| 10 | 3次 | 510 | 28 | 6 |

首贯释放时固定起点和方向，后续各贯沿同一条剑路，间隔0.16秒。人物可以继续移动；起点可由游戏保留短暂剑印。素材只制作**一次贯穿**，二贯、三贯由游戏分别播放，同轮不散射、不重新追踪。阵法、命中火花、震屏与角色动作不烘焙进这份剑路素材。

## 推荐流程与设置

1. 先审核一张“主击瞬间”的轮廓图：固定正俯视，纯黑背景，朝右的完整窄长剑锋，起点和终点明确。确认细长比例后再动画化，降低中段变成月弧、圆环或宽光柱的概率。
2. 将该主击图作为动画首帧，使用同画布的纯黑图作为末帧。下方prompt从主击开始，便于把第0帧直接对齐游戏的实际命中时刻。前摇亮点由游戏在释放前单独表现。
3. 视频设置：2秒、24fps、16:9、720p或更高、无音频、不自动循环；关闭自动提示词改写。模型与参数须在实际制作时重新发现并读取schema。
4. 虚拟起点位于画宽15%、画高50%，终点位于画宽85%、画高50%。主锋、细焰与柔光的整体厚度最多占画高10%，白芯更细，所有能量留在这条窄长通道内。
5. 黑底视频不包含alpha。验收后导出透明序列帧，统一裁切框、起点、终点与方向元数据；不按每帧可见内容分别裁切。

基础1级的实际长宽比约12.9:1；10级约18.2:1。接入层应分别映射长度和宽度：随等级拉长至当前射程，宽度始终对应28，不把整个素材等比放大。塔内柱体截断时采用实际命中终点；视口边缘不作为技能射程终点。

## 可直接复制的英文 prompt

用于已审核主击参考图的单次动画；参考图的第一帧就是贯穿命中峰值。

```text
Animate the approved reference into ONE sword-qi thrust VFX for a Chinese xianxia action game. Fixed orthographic TOP-DOWN camera, 16:9, solid black background. Preserve the reference's straight silhouette, placement, direction and width.

The invisible origin is at 15% of frame width and 50% of frame height. The endpoint is at 85% width and 50% height. Attack direction is RIGHT. A complete, perfectly straight, needle-sharp silver-white cutting core connects these fixed points. Tight cyan filaments run parallel to its axis. The entire visible envelope, including soft glow, stays inside a narrow horizontal corridor no taller than 10% of frame height. The white core is much thinner.

Start at the SINGLE impact frame: the full sword-line is already present, with a sharp pointed front and a clean origin. During 0.0-0.15s, one brilliant highlight races right along this existing line. During 0.15-0.55s, the core loses brightness and short cyan strands stream along the same axis. During 0.55-1.0s, the strands thin and disappear. During 1.0-2.0s, hold completely empty black. Exactly one intensity peak. No new attack emerges from the fade.

Make it forceful through sudden speed, a piercing edge and a crisp finish. Keep the line narrow, level and perfectly straight. Both endpoints and the camera stay fixed. The final frame is empty black.

No curved slash, crescent, ring, halo, spiral, radial shockwave, fan spread, parallel extra beams, repeated thrust, sustained laser, broad column, giant physical sword, falling sword, ground crack, explosion, lightning branches, energy behind the origin or beyond the endpoint, character, enemy, scenery, UI, lettering, logo, camera shake, zoom, cuts or full-screen flash.
```

## 关键帧与验收

| 时点 | 应看到的内容 |
|---|---|
| 首帧 | 同一条完整窄锋已经贯通，主击只有一次；不能从画外缓慢飞入 |
| 约0.15秒 | 右行高光结束，剑路开始退亮；无第二个独立前锋 |
| 约0.55秒 | 仅余沿原轴向流动的短细丝，范围没有扩张 |
| 1.0秒以后 | 纯黑空帧，能干净接下一次施放 |

- 逐帧检查中心轴、起点、终点和总宽度；火花、辉光也不得把窄剑路扩成范围爆发。
- 在真实28宽剑路上叠加审核，分别以360和510长度检查；“发光得很宽”不能被解释成无伤害装饰而直接放行。
- 将1次与间隔0.16秒的2／3次游戏调度并列播放。每贯要有独立峰值，尾光不能连接成长期持续光束，也不能让两条并行装饰误读为额外命中。
- 用游戏青石背景检查透明边缘和黑边；横向、纵向及斜向旋转后起点一致。移动角色后，正在进行的同轮剑路仍留在原位置。
- 验收原视频、透明帧和游戏实景；源图、源视频、实际输入资产ID与后期改动分别留档。2秒是美术审核时间轴，运行时按真实单贯节奏压缩，前摇和余光不增加命中。

后续顺序：一线天基础单贯通过后，制作天地一剑的宽锋重斩。先并列确认轮廓和出手节奏，再分别生成和接入。

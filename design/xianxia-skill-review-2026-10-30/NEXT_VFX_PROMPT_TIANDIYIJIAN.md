# 下一份技能特效：天地一剑 · 宽锋重斩

日期：2026-10-30。剑气斩、一线天已接入，按既定顺序制作一线天的进化技「天地一剑」（`evo_tiandi`）。本文件提供制作 prompt；尚未启动生成，也不表示新素材已通过审核。

目标画面：**蓄势凝剑 → 一道银白宽锋向前斩出 → 青蓝侧焰迅速退去 → 轴向裂光短留后合拢。** 一线天突出细、快、连贯；天地一剑突出凝聚、宽实锋面与一击的重量。真正覆盖天地的空间开裂演出仍留给远期「一剑开天」。

## 先复用，再决定是否生成

先阅读[技能特效素材库](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-vfx-asset-library/README.md)和对应 `manifest.json`。

优先检查[旧一线天原片](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-vfx-asset-library/source/yixiantian-2026-10-30-asset_EiryPFybxa4us2A1dp29At74.mp4)，Scenario 资产 ID 为 `asset_EiryPFybxa4us2A1dp29At74`。素材库已将其中较宽的锋面、沿轴青焰和起点爆发列为天地一剑候选；是否适配仍须选帧和实景审核，不能直接把原视频放大接入。

可用片段优先重剪、分层和重新编排；输出到新的独立版本目录，记录源帧和加工步骤。旧源图、视频、失败版及审核版保留原路径和字节。确需付费生成时，再发现可用模型、读取 schema、说明复用不足并取得实际报价；本文件不指定未经验证的模型或价格。

## 现行技能契约

以 `js/xianxia/TowerSkillForms.js`、`TowerGrowth.js` 和 `TowerRun.js` 为准，不修改伤害、冷却或命中规则。

| 形态 | 母技能一线天等级 | 同敌最多命中 | 长度 × 宽度 | 每击目标上限 |
|---|---:|---:|---:|---:|
| 天地一剑一阶，最低母技能等级 | 6 | 1次 | 610 × 80 | 5 |
| 天地一剑一阶，母技能满级 | 10 | 1次 | 670 × 80 | 6 |
| 天地一剑二阶，最低母技能等级 | 8 | 1次 | 740 × 112 | 5 |
| 天地一剑二阶，母技能满级 | 10 | 1次 | 770 × 112 | 6 |

- 一线天进化后以一次重斩替代原来的多次穿刺；两阶均只有一次主打击，不额外叠加母技能三贯。
- 蓄势共 0.45 秒：前 0.30 秒跟随人物并调整瞄准，最后 0.15 秒同时固定起点与方向。锁定后人物移动不改变剑路。
- 从人物前方向锁定终点释放宽长剑气，不从高空坠剑；后者属于其他技能的表现方向。
- 主击只在释放时结算一次。当前战斗特效记录寿命为 0.25 秒；需要更长的收势时由表现层保留尾光，不新增伤害或拉长人物挥剑。
- 长度和宽度分别映射到实际范围；受柱体阻挡时使用战斗返回的实际终点，不把视口边缘当作射程终点。
- 一、二阶优先共用合格母版，按各自真实长宽呈现；先验证二阶放宽后轮廓和细节是否仍合格，再决定是否需要另制素材。

## 制作与播放安排

1. 先复用或制作一张主击轮廓参考图，确认宽实剑身、银白主锋和紧贴两侧的青焰。只画剑气，无剑柄、护手和人物。
2. 主击与消散是一份独立素材：首帧就是完整锋面的命中峰值，末帧为干净空帧。下方英文 prompt 用于已确认的主击参考图动画化。
3. 蓄势剑印、方向预告、人物动作由游戏单独调度；本次不把它们烘焙进剑气视频。人物一轮只完成一次出手与收势，锁定方向时不能倒退或重播姿势。当前人物仍复用通用挥砍，专用立剑动作需另行制作。
4. 黑底审核版建议 2 秒、24fps、16:9、720p 或更高，无音频、固定正俯视、不自动循环。实际模型支持的时长和输入字段以 schema 为准，审核时间轴与游戏时间分别记录。
5. 下方黑底 prompt 用于不输出 alpha 的模型。若模型支持原生 alpha，按其 schema 输出，并去掉背景要求。黑底 MP4 本身不是透明素材。
6. 导出统一画布、统一锚点的 RGBA 序列和图集；保留原片、派生版、源资产 ID、哈希及加工脚本，不按每帧可见内容各自裁切。

## 可直接复制的英文 prompt

```text
Animate the approved impact reference into ONE heavy sword-qi strike for a Chinese xianxia action game, named “Heaven and Earth, One Sword”.

Fixed orthographic TOP-DOWN camera, 16:9 frame, perfectly solid black background. Only the isolated energy effect. Preserve the reference silhouette and placement.

The invisible origin is at 15% of frame width and 50% of frame height. The endpoint is at 85% width and 50% height. Attack direction is RIGHT. Form ONE massive, straight, flat blade of condensed sword energy along this axis: a broad silver-white blade body, sharply defined cutting edges, one pointed tip, and tightly attached translucent cyan-blue side flames. No hilt or physical weapon. The complete effect, including glow and sparks, remains between the two endpoints and inside a horizontal corridor no taller than 18% of frame height.

Begin on the SINGLE impact peak: the entire blade already spans the fixed attack corridor. During 0.00-0.18s, one intense highlight snaps forward along the existing blade, expressing a decisive, weighty release. During 0.18-0.65s, the broad white blade rapidly loses brightness while its side flames peel into short, straight axial filaments. During 0.65-1.25s, only a dim, narrow luminous seam remains on the original centerline; its edges close inward and disappear without brightening again. During 1.25-2.00s, hold completely empty black.

Exactly ONE attack and ONE brightness peak. Convey force through a substantial blade silhouette, sudden release and controlled afterglow. Keep the camera, origin, endpoint, axis and maximum width fixed throughout. The afterglow is the residue of this strike, never another impact.

No thin needle beam, sustained laser, repeated slash, extra parallel blade, crescent, ring, spiral, fan spread, radial shockwave, branching lightning, explosion, falling sword, overhead sword drop, stone debris, broken ground, world-scale portal, energy behind the origin or beyond the endpoint, character, enemy, landscape, UI, text, logo, camera movement, zoom, cuts, camera shake or full-screen flash.
```

## 审核要求

- 同屏比较剑气斩、一线天与天地一剑，能立即分辨近身月刃、窄线贯穿、宽锋重斩；天地一剑仍保留清楚锋面，不能只剩一团白光。
- 在当前一、二阶实际范围上叠加检查：主锋、侧焰与光晕沿同一道剑路，不能把宽长通道变成圆形范围爆发。
- 逐帧只有一次主击；收势单向减弱，裂光合拢时不再闪出第二次伤害暗示。
- 分别检查独立慢速审片和游戏原速录像。游戏录像包含完整蓄势、锁定、释放与收势；不能用慢放审片代替真实手感验收。
- 人物只出手一次；锁定时、释放时和尾光消失时都不重播人物动作。人物移动后，已经锁定的剑气留在原剑路。
- 检查青石地面上的透明边缘、水平/竖直/斜向、柱体截断，以及两种横屏尺寸。最后一帧完全透明，无硬切黑边或残留亮点。
- 提交审核时说明复用了哪些旧素材、做过哪些后期、是否发生新生成及实际费用。审核通过后再按用户接入指示执行。

# 四象剑阵：扩大范围进化版审核 Prompt

本轮制作 `evo_sixiang`「四象剑阵」，作为「两仪剑阵」的进化。用户选择了“做更大范围的进化版预览”。候选一阶半径 **288**、二阶半径 **336**；现有正式游戏双阶仍为 **160**。先审核动画和候选真实覆盖范围，本轮不接入生产。

以 `art/contract.json` 为数值、时序和坐标契约。保留全部旧素材和不满意版本；复用本包三张已复制的原图，本轮不调用付费生成、不上传、不重复计入历史费用。这里的英文 Prompt 也是本地绘制说明，不表示已向生成服务提交任务。

## 中文制作说明

为横屏俯视仙侠游戏制作四象剑阵的两阶特效。延续已经通过审核的两仪剑阵：清晰的白色实体剑芯、青色刃光、快速落剑和短促命中亮点，命中后保留较慢的碎光消散。进化的气势来自更大的菱形封锁范围、四柄稳定的阵眼巨剑、四方轮流响应以及最后一次四眼合鸣。

阵法中心锁定在起手时选中的敌人位置。四个阵眼固定在正北、正东、正南、正西顶点，四柄剑的锋尖都朝内。地面边框必须是四条直边围成的完整菱形；两条对角线等长。不随角色朝向旋转，不压扁为等距投影，不让保留的圆形流光素材变成另一条圆形攻击边界。

一阶中心至顶点距离为 288，整个菱形宽高 576；二阶为 336，宽高 672。对应实际面积分别约为当前 10 级两仪圆阵的 **1.43 倍、1.95 倍**。整个填满的菱形都是候选攻击区，包括四个阵眼之间；四个眼不各自建立独立伤害圆。

开阵时四柄剑从低空落位，眼位和剑柄保持在边框顶点。一阶剑身长 `0.36R`，剑尖朝内停在 `0.64R`；二阶剑身长 `0.42R`，剑尖朝内停在 `0.58R`。整个剑身不越过顶点，眼部柔光可进入透明安全边距。开阵落位高度约 `0.48R`，只作视觉变化。

每次打击提前约 0.16 秒出现空中剑形，随后快速下落；**真实形成该次脉冲时**才出现地面冲击、怪物受击亮点和命中数字。触地剑形保持峰值约 0.04 秒，0.19 秒时淡出，落地碎光 0.23 秒内消散，末击连线持续到 0.26 秒。不要把提前蓄势画成已经刺地，也不要让装饰性落剑生成新的扣血。

剑雨从内侧收束，空中落差约 `0.7R`；普通脉冲展示 5 柄长 `0.46R` 的装饰雨剑，末次展示 9 柄，一阶长 `0.53R`、二阶长 `0.58R`。这 5／9 柄是画面数量，不是伤害次数。装饰性落点限制在 `|dx|+|dy| ≤ 0.6R`，给最北侧留出高度，避免裁切。该限制只约束装饰，整个 `R` 菱形内的真实目标仍按脉冲受击，命中反馈需对应真实正伤害目标。四方边界和阵眼必须一直清楚，不能只剩中央一团剑雨。

一阶共 7 次打击：北、东、南、西、北、东，第 7 次四眼合鸣。二阶共 9 次：北、东、南、西循环两轮，第 9 次四眼合鸣。前面的普通脉冲只强化当前阵眼；最后一次可以同时点亮四眼、加强中心冲击，但仍是一次结算。每次脉冲最多命中 8 个目标，每个选中目标最多受该次阵法伤害一次。

最后一次打击发生在阵法生成后 3 秒。3.12 秒开始明显退光，3.78 秒完全结束；这段尾光不再掉剑、不再追踪目标、不再伤人。人物保持现有的一次施法动作，后续阵法脉冲不重复挥剑。玩家继续移动时，剑阵和尾光留在最初落点。

四眼按北、东、南、西使用白、青、金、浅蓝紫的能量强调；原 PNG 仍为白／青实体剑，不重绘，不新增神兽或人物。让角色、敌人轮廓、生命条与伤害数字保持可读。增强局部实体剑和触地冲击，避免用全屏泛白、厚重不透明地毯、额外震屏或新增击退来制造气势。

## 几何与时序

`R` 是中心到顶点的世界距离，不是中心到斜边的距离。坐标使用世界 `+X` 向右、`+Y` 向上；画布 `+Y` 向下。顶点／眼位顺序为：

```
N = (0, +R), E = (+R, 0), S = (0, -R), W = (-R, 0)
```

| 阶数 | 正式 R → 候选 R | 候选宽 × 高 | 脉冲数 | 末次合鸣 |
| --- | --- | --- | --- | --- |
| 一阶 | 160 → 288 | 576 × 576 | 7 | 第 7 次 |
| 二阶 | 160 → 336 | 672 × 672 | 9 | 第 9 次 |

以下全部相对**真实生成的 `zone.startedAt`**，不是角色起手时刻：

| 阶数 | 计划脉冲时间（秒） | 60 Hz 首个有效帧偏移 |
| --- | --- | --- |
| 一阶 | 0.5、0.916667、1.333333、1.75、2.166667、2.583333、3 | 30、55、80、105、130、155、180 |
| 二阶 | 0.5、0.8125、1.125、1.4375、1.75、2.0625、2.375、2.6875、3 | 30、49、68、87、105、124、143、162、180 |

一阶间隔为 `5/12` 秒，二阶为 `5/16` 秒。提前显剑可参考计划时间；触地命中必须等待真实模拟事件，不能在二阶 `0.8125` 秒提前结算实际下一帧才发生的打击。

现有起手至生成的设定为 0.12 秒，在 60 Hz 固定步进下通常是 8 帧。起手至下一次起手的原始冷却为 8 秒，装备修正沿用原规则。选点仍是 360 范围内最近的合格敌人（包含敌人体积并保留柱体视线），起手即锁定；不增加“找怪最多处”的策略。

## 分层交付与坐标映射

| 层 | 画布 | 世界宽 × 高 | 锚点 | 画布地面原点 |
| --- | --- | --- | --- | --- |
| 地面 | 768 × 768 RGBA | `2.4R × 2.4R` | `(0.5, 0.5)` | `(384, 384)` |
| 空中 | 960 × 1280 RGBA | `2.8R × (2.8×1280/960)R` | `(0.5, 0.35)` | `(480, 832)` |

地面 `R=320px`；空中每 `R=960/2.8px`。两层都用等比缩放，共用同一个世界落点。地面在敌人和角色下方；空中层只包含透明剑形、拖尾和命中碎光。地面周边多出的 `0.2R` 是透明／柔光安全边距，不扩大实际菱形。

动态 SpriteFrame 保持 `packable=false`，避免图集重排改变画布原点。必须检查一阶、二阶各自的北端高度、东／西端剑光和南端拖尾，不能裁掉巨剑或落剑尖。

## English production prompt

Create a transparent, two-layer skill VFX review for **Sixiang Sword Formation** (`evo_sixiang`), the evolved form of Liangyi Sword Formation, in a landscape, top-down xianxia action game.

Reuse the approved ivory-white and cyan sword textures and the retained flow texture. Add white, cyan, gold and periwinkle energy accents to the north, east, south and west eyes; keep the original white/cyan sword PNG pixels unchanged. Keep physical sword silhouettes, a brief bright contact core, fast descending motion, and slower fading fragments. Convey the evolution through a larger **filled diamond**, four stable cardinal sword eyes, a rotating response from one eye per ordinary pulse, and a single final four-eye resonance. Do not add a divine beast or a new character.

The center is the enemy position captured when the cast begins. It remains fixed while the character and enemies move. The four eye centers are exactly north `(0,+R)`, east `(+R,0)`, south `(0,-R)`, and west `(-R,0)`. Use equal horizontal and vertical world scale. Do not rotate with the caster, flatten the diamond, draw a circular outer attack boundary, or make four independent circular hit areas.

For review only, rank 1 uses `R=288`, a `576×576` world-unit diamond; rank 2 uses `R=336`, a `672×672` diamond. Production currently remains at `R=160` for both ranks. The candidate areas are approximately `1.43×` and `1.95×` the approved max-level Liangyi circle of radius 192.

Four substantial swords face inward with hilts at `1.0R`. Rank-1 bodies are `0.36R` long with tips at `0.64R`; rank-2 bodies are `0.42R` long with tips at `0.58R`. The sword bodies remain inside the vertex radius. Their initial placement descends from about `0.48R` above the ground, without creating an extra attack.

Reveal descending rain swords about `0.16s` before each scheduled pulse. Show ground contact and target hit flashes only when the real simulation pulse occurs. Hold the impact sword at its peak for about `0.04s`, fade it out by `0.19s`, finish contact fragments by `0.23s`, and final resonance rays by `0.26s`. Airborne rain lift is about `0.7R`. Ordinary pulses show five decorative swords of length `0.46R`; the final pulse shows nine, length `0.53R` for rank 1 and `0.58R` for rank 2. These are visual sword counts, never damage counts. Keep decorative landing points inside `abs(dx)+abs(dy) <= 0.6R` to protect vertical padding. This visual limit must not shrink actual full-diamond damage coverage.

Rank 1 has exactly seven pulses: north, east, south, west, north, east, then all four eyes on pulse 7. Rank 2 has exactly nine: two north-east-south-west rounds, then all four eyes on pulse 9. The last resonance may look stronger, but remains one ordinary damage ledger entry per selected target. All four eyes share the same maximum of eight targets per pulse.

Pulse times are measured from actual zone creation. Rank 1: `0.5, 0.9166667, 1.3333333, 1.75, 2.1666667, 2.5833333, 3.0`. Rank 2: `0.5, 0.8125, 1.125, 1.4375, 1.75, 2.0625, 2.375, 2.6875, 3.0`. The fixed 60 Hz simulation may deliver a scheduled event on the next tick. Anticipation may use scheduled times; impacts and positive-damage feedback must use the actual event.

After the final hit at `3.0s`, visibly fade from `3.12s` and finish at `3.78s`. The tail is presentation only. It emits no new sword, damage, homing action or pulse. Use the existing single cast gesture; never replay the character's slash on every formation beat. No extra camera shake, hit-stop, knockback or crowd-targeting logic.

Deliver a `768×768` RGBA ground layer mapped to `2.4R×2.4R`, centered at canvas `(384,384)` with anchor `(0.5,0.5)`, and a `960×1280` RGBA air layer mapped to `2.8R×3.7333333333R`, ground origin `(480,832)`, anchor `(0.5,0.35)`. Both layers share the fixed world center and equal XY scale. Keep dynamic frames unpackable (`packable=false`). Preserve transparent padding and avoid clipping any sword tip or trail.

Keep character and enemy silhouettes, health bars and damage numbers legible. Use local contact brightness and clean sword shapes rather than an opaque carpet or a full-screen white flash. Review the effect at original speed in the actual landscape game with a moving caster.

## 原生预演约束与验收

生产 `TowerRun` 的菱形命中直接读取 `skillForm.radius`。本轮不能只放大贴图、`zone.radius` 或外层筛选半径：预览实例必须对四象菱形分支明确使用候选半径构造顶点，同时沿用真实敌人体积、视线、排序、8 目标上限和原伤害字段。该候选分支只结算一次，不再调用一遍旧脉冲。其余技能、敌方区域和正式共享数据保持原状；记录临时覆盖，并在退出时恢复所有包装方法。

验收包括两阶新增覆盖带中的真实受击、圈外无伤害、斜边和顶点碰撞、7／9 次完整时序、末次单账本、尾光无伤害，以及暂停／恢复和退出后的清理。仅在真实 `formation` 正伤害元数据与本次目标列表匹配时显示受击亮点。保留原速原生预演和完整消散过程，供用户决定是否接入。

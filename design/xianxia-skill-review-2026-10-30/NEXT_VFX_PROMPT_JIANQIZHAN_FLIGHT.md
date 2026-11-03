# 剑气斩 · 近斩、飞射、连射制作稿

日期：2026-10-30。

用户希望保留一级近身月牙，四级变为一道月牙飞射，七级变为连续多道月牙。本文据此整理制作规格；七级暂以三发、发射间隔0.16秒制作预演，属于具体化建议。大型十字剑气另作技能设计，不再作为剑气斩的进化形态。

本文与配套合成预演是新方案，尚未接入战斗。现有近身版、源视频及所有未采用版本继续保留。不要覆盖历史 `NEXT_VFX_PROMPT.md` 或原素材。

用户另要求技能说明同步修改；当前等级说明、3→4／6→7级预览及实际代码位置已列入 [SKILL_COPY.md](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-sword-arc-flight-2026-10-30/SKILL_COPY.md)，随新机制一同接入。

## 1. 形态与技能描述

| 等级 | 形态 | 建议描述 | 同一敌人的命中次数 |
|---|---|---|---|
| 1–3级 | 一次近身月牙斩 | 挥出一道月牙剑气，斩击身前敌人。 | 每轮最多1次 |
| 4–6级 | 一道月牙离体飞射 | 挥出一道高速飞行的月牙剑气，沿前方穿过敌阵。 | 每发最多1次 |
| 7–10级 | 连续三道月牙，数量暂拟 | 连续放出三道月牙剑气，依次贯穿前方敌阵。 | 每发最多1次，三发全中最多3次 |

成长来自剑气离体、纵深扩大和连续释放。各阶段使用同一套青白月牙语言，不突然变成十字、圆环、剑雨或巨大光柱。

- 1–3级沿用已批准近身版的轮廓与播放素材，次数按新方案另行调度。
- 4级起，飞行月牙取代原地扇形伤害；起手挥剑和发射闪光不能再偷偷叠一次近斩。
- 7级三发是同一次完整出手中的连续剑气。身体动作只启动一次，后两发不能让人物姿势倒回前一帧。
- 一轮锁定一个方向，各发从人物当时的出手位置产生；已离体剑气不跟随人物平移、不转向追敌。
- 飞行速度、伤害、冷却、学习消耗与目标总数上限不在本次美术稿中定值。预演的假人、速度和边界是构图与观感演示，不代表已经修改正式战斗参数。

## 2. 飞行与结束规则

制作目标为向前高速飞行、沿途穿敌，无遮挡时持续至实际战场边界。离开镜头不等于到达战场边界。沿用墙柱阻挡方向：中途触碰实体障碍时结束，不默认获得穿墙能力。

月牙飞行时维持大小和朝向：凸起的锐边朝前，凹面与短尾迹朝后，两端收尖。不能在飞行途中变成旋转镰刀、圆盘或闭合光圈。

正式接入必须让碰撞跟随移动刃面：低帧率下检查上一位置到当前位置的扫掠，避免高速越过敌人却不命中。每发保存独立命中记录，同敌停留在刃面中也不逐帧重复受击。尾光和终止后的消散均无伤害。

碰到边界或障碍时，主体停止前进，主锋迅速解除，剩余青色细丝在约0.30–0.40秒内衰减。这个时长为审核起点，可本地调整；不要为了延长尾光把整段出手与飞行一起放慢。结束态只向已飞过的一侧收散，不能在墙后多炸出一圈。

## 3. 本轮先复用，不重复购买相同月牙

先查 `design/xianxia-vfx-asset-library/README.md`。可用源：

1. `design/xianxia-sword-arc-v2-2026-10-30/review/usable-blade-frame.png`：旧 Scenario 首尾帧约束原片的第0帧，具有正确开口月牙。
2. 同目录 `frames/*.png`：已批准修订动画的透明帧，可复用近身出手与消散质感。
3. `cocos-pilot/assets/resources/tower-skill-fx/sword-arc-v2.png`：现行近身图集，保留原字节。

已有近斩整段直接平移会在飞行中提前消失。应从可用关键帧单独整理稳定的飞行主体，再用本地流光、尾迹与透明度编排完成飞行和结束态。先审核这个复用版本；仅在轮廓或流光确实不足时才启动新的模型生成。

所有派生物写入新目录 `design/xianxia-sword-arc-flight-2026-10-30/`，记录源路径、SHA-256、选帧、加工脚本和输出。所有旧版本仍可供其他技能选用。

## 4. 制作分层与交付

| 部件 | 交付目标 | 调度方式 |
|---|---|---|
| 近身出手 | 复用原开口月牙动画 | 仅1–3级作为近斩主体 |
| 飞行月牙主体 | 独立RGBA图；必要时补短循环流光帧 | 固定自身锚点，位移与转向由游戏控制 |
| 短尾迹 | 低亮、朝后、不构成第二把完整月牙 | 长度随观感调整，不参与碰撞 |
| 结束消散 | 独立透明衰减帧或本地可调衰减 | 到边界或碰障碍后播放，立即停止伤害 |
| 审核预演 | 横屏1／4／7级并排比较，原速播放 | 明确标注合成示意，不冒充游戏实录 |

先制作一发可复用的主体。七级由同一素材连续实例化三次，不再为三连射单独付费生成，不把三发、全地图位移、角色动作或地面烘焙进一张图集。

透明资源使用统一画布与固定锚点，逐帧记录可见范围；要在深色、青石色、浅色底上检查边缘。黑底视频不是透明资源，须另存真正RGBA输出。

## 5. 中文制作 prompt

以下用于确需补做飞行主体时。它描述的是原位播放的单月牙飞行状态；跨战场运动由游戏实现。

> 为横屏俯视仙侠动作游戏制作一枚可复用的月牙剑气飞行特效。只表现一道完整、开口、细长的青白月牙，锐利凸面朝右，凹面与短尾迹朝左，上下两端尖细。使用已批准月牙素材作为轮廓和颜色参考。主刃为清楚但不过曝的白青色，内侧有薄而有层次的蓝色半透明剑气，少量流丝向后掠过。保持固定正俯视正交镜头、固定中心锚点、固定大小与朝向；让刃内流光和短尾迹体现高速向右飞行，但主体本身不跨画面移动、不旋转、不持续膨胀。全程维持稳定飞行形态与亮度，没有重新蓄力或第二次爆发。整体锋利、轻快、可读，不做厚重烟雾。画面内只出现这一枚月牙及贴近其后的短尾迹，保留足够透明边距，主体和光晕不能被裁切。无人物、实体剑、敌人、地面、UI、文字、镜头运动；无闭环、光圈、十字、多重完整月牙、爆炸或全屏白闪。

## 6. 可直接复制的英文 prompt

```text
Create one reusable, isolated sword-qi PROJECTILE VFX for a landscape, top-down Chinese xianxia action game. Use the approved crescent reference for its silhouette and cyan / blue-white color language.

Show exactly ONE slender OPEN CRESCENT energy blade. Its convex razor edge faces RIGHT. Its concave side and short trailing wisps face LEFT. The upper and lower tips taper sharply. The blade must remain open in every frame. Preserve the same recognizable crescent shape throughout.

Fixed orthographic TOP-DOWN camera. Fixed center anchor, fixed scale, fixed orientation. This is the IN-PLACE steady-flight animation of the projectile: animate subtle energy flowing inside the edge and brief wisps streaming backward to imply rapid RIGHTWARD flight, but do not translate the projectile across the canvas. The game engine will move it through the battlefield.

Use a crisp blue-white cutting edge, a thin translucent cyan body, restrained blue filaments, and a short low-brightness trail immediately behind the blade. Keep the cutting silhouette readable and the glow controlled. Refined sword energy, fast and precise, with no thick smoke.

Keep the steady-flight state for the entire clip: no summoning sequence, no pulsing attack beats, no second slash, no growth into a larger weapon, no rotation, no impact explosion, and no end fade. If animation is supported, make the subtle internal flow seamless from the final frame back to the first. The dissolve will be authored separately from the same asset.

Keep the entire blade, tips, trail and soft glow safely inside the frame with at least 10 percent padding. Exactly one isolated effect, no physical sword, character, enemy, scenery, floor, shadow, text, logo or UI. No full circle, closed ring, halo, vortex, cross shape, multiple complete crescents, repeated attack, camera movement, shake, zoom, cuts or full-frame flash.
```

模型处理说明：

- 原生alpha模型：按其schema提交孤立主体；不靠在prompt里反复写“transparent background”取得透明度。
- 仅支持不透明图或视频时，可追加 `Perfectly solid black background.`，随后另行提取alpha并检查暗边。
- 上面的时长与循环要求只在模型支持动画时使用；静态主体模型仅取造型描述，本地完成流光。
- 如需新生成，先发现适合的模型、读取schema并dry-run报价；本文件没有预定模型ID或捏造费用。

## 7. 审核要求

1. 1级清楚近斩，4级清楚离体，7级能数出三个独立波前，且始终都叫得出“月牙”。
2. 同级各发大小一致；无旋转、闭环、拖尾变第二把刃、远端再次爆炸。
3. 远处敌人应在剑气抵达时反馈；发射瞬间不能让整条道路同时受击。
4. 每发每敌只记一次。7级三发全中才是三次；出手光、拖尾、消散和渲染帧数不计击数。
5. 三发共享一轮身体动作，不重复重启动作；此项必须在之后的真实引擎预演中验证，占位人物合成片不能证明通过。
6. 未碰障碍时到实际地图边界才结束；镜头移动、暂停恢复、离场清理须在正式接入时另测。
7. 尾光可以比主刃停留更久，不能延长碰撞或改变飞行速度。
8. 核对所有源文件哈希与新输出路径；保留不满意的预演和加工记录。

## 8. 接入时需同步处理的现行代码

当前 `js/xianxia/TowerSkillForms.js` 中，剑气斩仍按共享的1／3／6／10阶段取1／2／3／3次近身扇斩。新方案只对 `sj_arc` 引入4、7级门槛，不能全局修改 `stage()`，以免改动一线天、环剑诀、剑影分光和两仪剑阵。

现行 `skillHitShare()` 也使用3／6级旧形态及2／5级伤害锚点，后续接入须重新核对总量与分摊。本次预演与prompt不代表已完成数值调整。

移动刃面、逐发命中去重、结束规则、技能描述与升级预览必须一起接入。不得保留旧瞬时扇区结算，只把图片向前搬动。

## 9. 大型十字的独立归属建议

本轮只制作月牙。推荐将完整大型十字飞射留给独立主动技能 **“纵横剑气”（暂名）**，拥有单独的起手、范围与学习节点，不占用剑气斩的七级或十级形态。

如优先使用已有的未来技能名，备选是 **神霄剑裁**；但旧方案为“天降纵裁后追加横断”，要承接移动十字就必须重新设计，不能说它现在已经是飞行十字。剑影分光保留固定落点交叉斩，一线天与天地一剑继续保持窄锋贯穿与宽锋重斩的区分。十字的归属尚未开发或定案。

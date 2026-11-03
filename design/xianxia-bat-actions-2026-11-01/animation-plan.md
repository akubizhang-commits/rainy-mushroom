# 妖蝠动作试制

2026-11-01，用户要求先接入已验收母图，再继续下一项动画。下一项为妖蝠，先制作一段扑翼循环试片，通过后再扩展动作。

## 输入与输出

- 输入：review-01/reference-green.png，已验收妖化母图，1024×1024。原图永久保留。
- 固定三分之四朝左下视角；原地飞行，镜头不动，不改变角色设计，保持完整翼展。
- 第一段仅做扑翼移动循环，计划约5秒视频；选择模型时重新核实可用性、参数及费用。应保留足够分辨率供原生至少256px运行帧导出；Boss当前显示275px，试片需检查实际物理显示清晰度，必要时导出更大帧，不先缩128再放大。
- 输出原视频、逐帧检查图、循环候选与接缝测量、透明运行帧及来源映射。先查可复用视频，避免重复购买。

## 首段提示词

Animate this exact dark fantasy bat as a hand-painted 2D game sprite. Keep its charcoal fur, dark purple-red wing membranes, short muzzle, pointed ears and two small hind feet consistent. In-place steady flight with several complete, clearly visible wingbeat cycles: both wings move naturally from the shoulders, wrists flex, the membranes stretch and relax, then the wings recover smoothly. Preserve the same three-quarter front-left viewing direction throughout. The compact torso stays near the same screen position, with only subtle vertical bobbing. Maintain exactly two wings and two hind legs. Keep wing fingers connected and stable, with no extra limbs, no melting membranes and no changing wingtip count. Entire wings, ears and claws remain inside the frame throughout. Locked orthographic-style camera, no pan, zoom, rotation or traveling across the screen. Flat uniform bright green background throughout, no ground, shadow, particles, sonic rings, motion blur, text or scene. Clear individual poses suitable for sprite frame extraction. Start and finish in compatible wingbeat phases; do not freeze the character.

## 后续动作按真实配置制作

TowerEnemyAttacks：bat为sonic远程shot，并非近身撕咬。普通/精英/Boss前摇分别0.85/0.95/1.05秒，生效0.1秒，收招0.7/0.8/0.9秒。攻击动画应表现短暂蓄力、张口声波发射姿态和恢复扑翼，声波弹体沿用战斗逻辑，不能烘焙到身体帧或额外产生伤害。

移动试片通过后再做声波攻击、受击、死亡。Boss机制由所在关卡配置决定，不能仅因族名自动新增狂暴或声波范围技能。

## 验收

逐帧检查翼根连接、翼腕和翼指数量、翼膜拉伸、后脚稳定、边缘裁剪与绿边；循环首尾差异需与该候选窗口的逐帧运动基线比较，并目视确认不是静帧或运动反转。失败版本同样保留。固定躯干锚点，普通怪与Boss分开实机看，包含暂停、受击和真实死亡。

## 当前阻断

本轮查询确认Scenario团队为free；当前成员/项目消费均为50 CU，期间2026-11-01T00:00:00Z至2026-11-02T00:00:00Z。个人与项目unlimited仅表示未设额外上限，不表示团队无限额度。此前同团队已返回50 CU每日计划上限。为避免对已耗尽额度重复提交，本轮没有调用生成、没有上传参考、没有生成job ID，新增消费0。

工具返回的下次期间重置时间为北京时间2026-11-02 08:00。恢复制作前重新核实额度、模型和准确报价。本文件是准备记录，不是动画成品，也没有安排自动重试。

## 2026-11-02 接续核查

用户再次要求继续怪物动作制作。复核交接与现行规范后，继续本文件已确定的妖蝠扑翼试片，复用review-01/reference-green.png；不重复采购静态母图，不把该低阶野兽形态套用到缺少对应母图的高阶蝠。

Scenario teams_list确认仍为原团队的Default Project、free计划；memory_recall中的动态授权与本地AGENTS.md一致。usage查询2026-11-02 UTC期间，团队已消费50 CU，共两次P-Video 2 Pro生成，每次25 CU。jobs_list与本地记录交叉核对：

- job_G5Hu8jJbL9bPBXFvtC2jTcfF：design/xianxia-sword-seal-cast-2026-11-01/attempt-01/generation.json。
- job_9gi8i2w1haJqoQLiftiw2wgK：同目录left-attempt-01/generation.json。

上述为剑印施法视频，不是可直接复用的妖蝠扑翼。consumption_limit_get返回个人和项目均未设置额外上限，但消费均为50；不能将unlimited解释为团队计划无限额度。返回period.end为2026-11-03T00:00:00.000Z，即北京时间2026-11-03 08:00。结合已确认的free团队每日50 CU限制，本轮不重复提交收费任务。

本轮新增CU为0，未上传、未生成动画、未改运行时、无后台任务或自动重试。额度恢复后先重新查询实际消费、发现适用模型并读取schema，再对真实输入报价；按首段提示词试制扑翼循环，通过后再扩展声波攻击、受击与死亡。

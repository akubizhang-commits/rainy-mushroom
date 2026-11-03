# 修仙割草 · 数据与逻辑架构

版本 v0.2 · 2026-10-26 · 状态：开发设计，未实施、未验收。

依据：已阅读原 v0.1、`00-gdd-summary.md`，并核对根目录 `js/survivor/` 的 SurvivorRun、Stats、Progression、Weapons、Projectiles、Enemies、Pickups、Meta、SurvivorSave、SimClock，以及 Cocos 的 SurvivorView、SurvivorHud、SurvivorPlatform 和同步脚本。本文中的接口、字段及任务除明确标为“已有”外，均为待实现设计。

## 1. 边界与有效基线

保持 Cocos Creator 3.8.8 + 引擎无关 ES Module；保留目录、模块名、旧内部 ID、事件名、存档键与 schema。本文只设计增量迁移，不要求现在改代码、同步、重建金标准或提交。配套验收见 `06-qa-acceptance.md`。

规则以本轮校正的00 v0.3与04为准，数值基线来自已核对的工作区源码，不把源码注释误当作本轮用户口头确认。旧报告不证明新参数通过。

| 项目 | 根源码已有 / 本次锁定 | 修仙迁移规则 |
|---|---|---|
| Boss 基础生命 | `data/enemies.js`：5500 | 刻度阶段 55000；启用 K(7)=2.15 后 118250，不额外乘普通怪分钟成长 |
| regen | `data/passives.js`：每级 0.2/秒，累计 `[0.2,0.4,0.6,0.8,1.0]` | 长青诀沿用此值；不是每级 0.4 |
| 进化 | `EVOLUTION={passiveLevel:3,unlockSec:360}` | 武器满级、条件被动至少 3 级、逻辑时间至少 360 秒、尚未进化，四项同时满足 |
| 统领 / Boss 时间 | 5:00 / 7:00 | 沿用；不改成定时直接胜利 |
| 胜利链 | Boss → cleansing → extract → won | 保留；凝婴是表现与摘要信息，不跳过撤离 |

初查发现7个源文件与生成副本不一致；集成方已运行同步并恢复331项基线测试，随后补充基础模块与奖励回归，总计352项通过。此为源码/副本验证，不是新构建或手机验收，详见08。

### 1.1 实现盘点

| 系统 | 源码已有 | 待做 |
|---|---|---|
| SurvivorRun | 60Hz、playing/levelup/paused/cleansing/extract/won/lost、事件队列、三选一、构造时 validate | classId、appliedLevel、offerInfo、境界属性、丹药、万剑状态、统一伤害记录 |
| Progression | XP 曲线、pendingLevels、多次选卡、首升保底、按获得顺序选最早可进化武器 | 逐层属性提交、职业池、职业被动卡、破境保底、丹药卡 |
| Stats | 局外与局内被动合成、冷却下限 0.5、actualDamage、Boss hitDamage、普通怪分钟成长 | realm/class/pill 上下文、K/D、玩家减伤与统一取整 |
| Weapons | 五把武器及进化、线性最近敌人、16 项多目标缓冲、tierOf | 御剑修正、射程过滤、万剑延迟命中；现在最近索敌没有射程门槛 |
| Projectiles | 飞行弹体、往返叶片、raindrop 延迟圆形区、敌方泡 | 万剑矩形结算不是已有 raindrop 的直接换皮；泡伤害需接减伤 |
| Pool / SpatialGrid | 定长池、交换删除、复用 uid、圆查询、large 列表 | 万剑初版采用全量活动表矩形精确查询；不强制重构网格 |
| Enemies | `hitAt: Float64Array(5)` | 第六武器上线时容量数据化为 6，reset 完整清零 |
| Cocos 宿主 | advance、drainEvents、战斗/暂停/结算、四功法四被动栏、0.4 秒选卡锁 | 破境演出阶段、职业独立栏、丹药倒计时、万剑预警、伤害数字 |
| 存档 | schema 1、checksum、备份、损坏恢复、更新版本锁写 | 本期无 schema 迁移；补settings白名单和兼容验收，余额/强化结构不变 |

现有 `computeStats(player,bonuses,passives)` 只有三个参数；Run 没有 `options.data` 注入。现有 `evolvableWeapon(weapons,passives,timeSec=Infinity)` 省略时间会绕过时间门槛，Run 实际传入 `this.time`；迁移时必须保留第三参数的时间语义，不能把职业对象塞到该位置。

原文中的测试通过数、性能实测、历史 bot 结果及总人日估算不作为本版证据；本次未执行游戏测试或性能测量。

## 2. ID、显示映射与存档兼容

### 2.1 只换面向玩家的名称

| 永久保留的内部 ID | 修仙显示 | 保留的进化 ID → 显示 |
|---|---|---|
| spore_shot | 飞剑 | spore_storm → 分光剑影 |
| umbrella_blades | 绕身剑阵 | umbrella_canopy → 周天剑阵 |
| dew_ring | 玄冰诀 | dawn_dew_ward → 玄冰领域 |
| raindrop | 天雷诀 | downpour → 九霄神雷 |
| leaf_boomerang | 惊鸿剑气 | autumn_leaf_dance → 惊鸿剑雨 |
| gnat / beetle / moth | 妖鼠 / 岩甲蜥 / 风狼 | 不改 kind |
| snail / sporeling | 铁背玄龟 / 瘴气蟾 | 不改 kind |
| elite_beetle / boss_mist_snail | 裂山妖犀 / 瘴泽蛟王 | 不改召唤、波次、killer 引用 |
| might / cooldown / area | 破军心法 / 清心诀 / 乾坤袖 | 不改被动键 |
| regen / speed / magnet | 长青诀 / 疾风步 / 聚灵阵 | 不改被动键 |
| heal_dew / shiny_spore | 回春丹 / 灵石 | 保留 kind=heal/crystal |

新增 ID 仅为 `wanjian`、`yujian`、`vajra`、`pill_power/pill_wind/pill_body`、职业 `sword` 和境界 `lianqi/zhuji/jindan`。元婴/化神/渡劫可有显示键，不加入本局属性成长表。

沿用 `cardSporeShot`、`cardSporeShotDesc`、`cardHealDew`、`cardShinySpore` 等现有特殊键；其余用现有 `card_<旧ID>`、`card_evolve_<旧武器ID>`。新增内容追加键。统一名称查询用于卡片、暂停、结果、图鉴与日志展示；既不批量替换旧 ID，也不增加回放“别名哈希”。资源帧、音效路由和内部事件可保留旧名。

候选枚举仍为获得顺序 + 原数据键序，新条目追加。职业池是成员过滤，不按池数组重新排序。纯文案阶段必须与基线产生相同 RNG 消耗、原始 stateHash、summary 与伤害序列。

### 2.2 schema 1 不动

保留 `survivor.v1.profile`、`.backup`、`.corrupt`，`format='survivor-save'`、`CURRENT_SCHEMA=1`、空 MIGRATIONS。保留 `crystals`、`permanent` 中所有 `perm_*`、`bestSurvivalSec/wins/runs/settings/tutorial`。露晶→灵石、永久强化→道基只是显示转换。

当前存档没有局内武器、敌人、职业、境界、丹药或断线续局快照；不能承诺恢复一场旧战斗。本期 classId 只进 Run 参数，默认 sword；不写入 profile。`sanitizeProfile` 会重建字段、丢弃未知强化和未知顶层字段，所以不能偷偷添加职业存档字段。以后需要职业解锁或局内续玩，应独立设计 schema 2、迁移函数、回滚与新版锁写测试。

保留 `Meta.settle` 与宿主 `settled` 防重复结算。基线奖励缺陷已复现并修复：Run现以`_shinyCards`累计卡片数量，Meta每张乘5；原实现把金额再乘5导致单张+25。新增选卡→摘要→结算回归测试。既有存档不扣回、不迁移。

## 3. 数据契约（全部待实现）

使用深冻结的 JSON 兼容字面量；无函数、无 Infinity/NaN/undefined。新增独立校验函数接收显式表参数，便于坏数据测试，`validate()` 仍聚合真实导入表，Run 无需增加数据注入。

### 3.1 classes.js

```js
// CLASSES 的最终 sword 条目；各层均 Object.freeze，示例省略冻结包装。
sword: {
  id: 'sword', name: '剑修', startWeapon: 'spore_shot', classPassive: 'yujian',
  statMul: {maxHp:1, atk:1, moveSpeed:1.05, pickup:1} // 未声明attackSpeed/damageTaken时取1,
  weaponPool: ['spore_shot','umbrella_blades','dew_ring','raindrop','leaf_boomerang','wanjian'],
  passivePool: ['might','cooldown','area','regen','speed','magnet','vajra'],
  pillPool: ['pill_power','pill_wind','pill_body']
}
```

Catalog的实际sword条目使用id/name；接入适配后`new SurvivorRun({seed,viewport,bonuses,firstRun,classId?})`；修仙模式缺省 sword，未知值抛 RangeError。所有差异来自表，系统不写 sword 专属分支。startWeapon 必须在合法职业池内；各池唯一且引用存在；classPassive 为 null 或合法 CLASS_PASSIVES ID；倍率有限正数。未完成内容不进启用池：职业阶段先 `classPassive:null`、五旧武器、六旧被动、空丹药池，后续各任务原子追加。体修/邪修不设可选占位职业。

### 3.2 realms.js 与 Realm.js

E01已在`js/xianxia/Realms.js`提供深冻结的`REALMS`数组、`K`与`D`数组以及纯函数。阶段边界为每境9层、27封顶。破境参数后续接入时集中定义：presentSec=1.2、inputLockSec=0.4、healRatio=1、invulnSec=1.5、waveRadius=220、waveKnockback=80；不可重复定义另一份境界数值。

| id | hpBase | hpStep | atkBase | atkStep | attackSpeed | moveMul | pickupMul |
|---|---:|---:|---:|---:|---:|---:|---:|
| lianqi | 100 | 3 | 1 | 0.02 | 1 | 1 | 1 |
| zhuji | 150 | 4 | 1.3 | 0.02 | 1.1 | 1.05 | 1.1 |
| jindan | 210 | 5 | 1.7 | 0.02 | 1.2 | 1.1 | 1.2 |

`realmAt(level) -> {key,name,stage,layer,level,cappedLevel,isMax}`：有限且≥1输入向下取整，stage从0计数、layer为1–9，cappedLevel最多27，level保留实际层级；isMax为level≥27。`realmStats(level) -> {maxHp,attackMul,attackSpeed,moveMul,pickupMul}`，不含职业与局外。未来调用方用key而非id，stage而非index。`isBreakthrough(targetLevel)` 仅 10、19 为真。27 后 XP 与选卡继续，属性封顶，显示金丹圆满。

校验：ID 唯一、数值有限、层数正整数、跨境 HP/攻击不倒退；演出与无敌时长可转换为整数逻辑/表现步，healRatio 本期固定 1。保留 `PLAYER.maxHp=100` 作为兼容基础，不在增量迁移中删除；启用境界后以 realm 派生的 stats.maxHp 为权威。

### 3.3 御剑术、金刚诀与进化

`CLASS_PASSIVES.yujian={nameKey:'card_yujian',appliesTo:['spore_shot'],levels:[…]}`，独立 1 格、开局 Lv1，不进四格 passives。

| Lv | lifeAdd | pierceAdd | countAdd | speedMul | knockbackAdd |
|---|---:|---:|---:|---:|---:|
| 1 | 0.2 | 0 | 0 | 1 | 0 |
| 2 | 0.2 | 1 | 0 | 1 | 0 |
| 3 | 0.2 | 1 | 1 | 1 | 0 |
| 4 | 0.2 | 1 | 1 | 1.15 | 5 |
| 5 | 0.2 | 1 | 2 | 1.15 | 5 |

各行是累计值，升级重算，不反复累加。Lv5 保留击退 +5 是本设计对 GDD 累计列漏项的解释。获得/升级/进化/职业被动升级后 `refreshTier(world,weaponState)` 从原始 tier 重算缓存，普通与进化档均适用。单次弹数不得超过 16。

飞剑索敌新增可选 maxDistance（缺省 Infinity，保持其他武器行为）；飞剑用修正后 speed×life，单目标、多目标都过滤；无射程内目标不发射、不推进其冷却，保持现有无目标规则。基础飞剑 + 御剑 Lv1 射程 588，Lv4 射程 676.2；进化弹速不同，必须从进化档重算。

`PASSIVES.vajra` 追加 `stat:'damageTaken'`、累计 `[0.06,0.12,0.18,0.24,0.30]`。`passiveTerms` 先初始化 damageTaken=0，避免未初始化属性变 NaN。regen 保持每级 0.2。

扩展签名为 `evolvableWeapon(weapons,passives,timeSec,classPassive=null)`，前三参数位置不变。缺省/非法时间不允许进化（更新依赖 Infinity 的测试）；条件等级取普通被动或匹配职业被动，最小值 `def.evolveMinLevel ?? EVOLUTION.passiveLevel`；校验要求显式门槛不得低于 EVOLUTION.passiveLevel，也不得高于条件被动满级。飞剑切换 yujian 仍需 360 秒且 Lv3；其余旧配对不变。抽卡与应用进化卡调用同一函数，按获得顺序选最早可进化者，固定第 1 张。wanjian 无进化，`evolvesWith/evolution/evolved=null`，校验、bot 与 UI 都接受这一契约。

### 3.4 pills.js

`PILLS[id]={index,nameKey,durationSec,effects:{damageMul,moveSpeedMul,damageTakenMul},onTake}`，缺省倍率 1。`PILL_DRAFT={minLevel:5,weight:3,maxPerOffer:1}`。

| id / index | durationSec | 倍率覆盖 | onTake |
|---|---:|---|---|
| pill_power / 0 | 30 | damageMul=2 | null |
| pill_wind / 1 | 30 | moveSpeedMul=1.2 | attractSpores |
| pill_body / 2 | 20 | damageTakenMul=0.5 | null |

索引唯一连续、时长有限正数、效果白名单、倍率有限正数、onTake 仅 null/attractSpores。不同丹药相乘，同种刷新截止步，不叠倍率。风丹每次服用都对当前场上灵气触发一次吸引。

Run 持有 `pillEndTicks: Float64Array(3)`（0表示未生效）和 `pillTakenCounts: Uint32Array(3)`。`takePill(id)` 只由成功选卡事务调用，写入 `simulationTick+durationTicks`；`expirePills(tick)` 返回是否发生过期；`pillModifiers()` 返回完整三倍率对象供 Stats 使用。过期先清零再重算，HUD 通过 PILLS[id].index 读截止步，摘要按 ID 输出服用次数，不把数组索引写进存档。

GDD“立即吸收”按现有林风实现解释为立即把所有现存 spores 标记 `wind=true`，由拾取系统飞入并入账；不是立刻清空场上并加 XP。后生成的 spores 不自动带标记。抽取 `attractAllSpores(world)` 供林风与风丹共用；不得在选卡事务里递归 addXp/弹卡。

### 3.5 万剑、刻度与校验

`WEAPONS.wanjian` 追加 index=5、warnSec=0.6、rect={width:720,height:1280}，五档 coefPct/cooldown 为 250/15、300/15、300/13、400/13、500/11。无击退、不受 areaMul 影响。

旧武器 ID/index/顺序均保留。独立刻度任务把各档 damage 转为 coefPct=原 damage×10，普通怪/统领/Boss 基础 HP×10；不放大玩家 HP、接触伤害、泡伤害、回复、XP 或货币。该任务一次切换全部伤害消费者，禁止同档同时把 damage 和 coefPct 当真值。`LIMITS.weaponIndexSlots=6` 与 Enemies.hitAt、validate 上限一起上线。

新增校验：职业引用、进化配对/等级、无进化条目、coefPct 有限正数、索敌最大弹数、矩形正尺寸、K/D 同长且非递减。现有 JSON 往返检查不能完整拒绝函数/undefined 等被 JSON 忽略的值，新增表应递归检查实际类型，不声称原校验已全面覆盖。

## 4. 属性与伤害

`computeStats(player,bonuses,passives,ctx?)` 增加可选第四参数，前三参数不动。未提供 ctx 时保持旧结果；Run 在境界阶段明确传入 `{realm,layer,classMul,pill}`。只在开局、选卡提交、境界提交、丹药生效/到期时重算。

设 k=layer−1，b 为局外加成，p 为局内累计加成：

- maxHp = round((hpBase+hpStep×k)×classMul.maxHp)+b.maxHp。
- atkMul = atkBase×(1+atkStep×k)×classMul.atk；显示 ATK=round(100×atkMul)。显示取整值不回流战斗。
- might=(1+b.might)×(1+p.might)；dmgScale=atkMul×might×pill.damageMul。
- cooldownMul=max(0.5,(1−p.cooldown)/(realm.attackSpeed×classMul.attackSpeed))。
- moveSpeed=PLAYER.moveSpeed×classMul.moveSpeed×realm.moveMul×(1+b.moveSpeed)×(1+p.moveSpeed)×pill.moveSpeedMul。
- pickupRadius=PLAYER.pickupRadius×classMul.pickup×realm.pickupMul×(1+b.pickup)×(1+p.pickup)；regenPerSec=b.regen+p.regen。
- damageTakenMul=max(0.25,classMul.damageTaken×(1−p.damageTaken)×pill.damageTakenMul)。

`Damage.js` 统一敌人命中入口：raw=coefPct×dmgScale；最终 `max(1,round(raw×enemy.takenMul))`，takenMul 缺省 1。保留 raw 避免 Boss 再对已取整值乘倍率。飞行弹体和旧雷区保留发射时伤害快照；万剑按落剑时属性（§6）。玩家入口 `max(1,round(rawIncoming×damageTakenMul))`；rawIncoming 已含 D 与 Boss 狂暴，不重复相乘。接触和泡都必须接入，不得只减免接触伤害。

刻度变化不等价于原伤害恰好乘十：例如原 4×1.1 取整为 4，新 40×1.1 取整为 44，而旧结果×10 为 40。不能以“只是显示变化”承诺原金标准不变；应单独评估击杀所需次数与强度。

K/D 采用 GDD 候选表，仍需在新基线上复核：K=`[1,1.10,1.25,1.45,1.55,1.80,1.90,2.15]`，D=`[1,1,1,1.25,1.30,1.45,1.60,1.75]`。m=floor(生成时逻辑秒/60)，7 以后取末项，已生成敌人不逐分钟变强。

普通怪 HP=放大后基础 HP×(1+hpGrowth×m)×K；接触=原基础接触×(1+damageGrowth×m)×D。Boss 单独用 55000×K(7)=118250，接触20×D(7)=35，泡10×D(7)=17.5，玩家入口无减伤时取整18。普通远程泡仍不加普通接触的分钟成长，只乘泡弹发射时 D，飞行途中保持该快照；Boss 狂暴另外乘一次。

## 5. 破境队列、时钟与抽卡

### 5.1 经验等级与已提交等级分离

Progression 新增 appliedLevel=1；level 仍为经验到达等级。始终 `pendingLevels=level−appliedLevel`。当前 offer 的目标仅为 appliedLevel+1。`offerInfo={id,targetLevel,breakthrough}`，id 在单局单调递增；每个 id 只 draft 一次，不因暂停、恢复、重绘而重抽。

例：从已提交 Lv9 一次升至经验 Lv12，依次处理 10、11、12，共三次选择，仅 10 破境；不是三次破境。跨越 10 与19 时各触发一次；27 后仍逐次选卡，但无新的破境效果。

建议扩展 `choose(index,expectedOfferId?) -> boolean`，宿主必须传 token；已有脚本一参数调用可保留。校验状态、索引、token 以及当前卡可应用性后，才原子提交：应用卡 → appliedLevel+1 → pendingLevels−1 → 重算最终 stats → 同步 maxHp/当前 HP → 破境效果 → 清理当前 offer → 下一张或 playing。非法/陈旧输入返回 false，无 RNG 消耗、不扣队列、不授予半套效果。`_applyCard` 应返回成功标记，修复“内部拒绝但仍消耗升级”的设计风险。

普通升层只补上限的正增量并 clamp；破境按本次最终新上限回满。持续无敌取 `max(现有无敌,1.5)`，另存突破专用截止步供 HUD 光效；生命结算与灵波仅发生一次。灵波按敌人中心距≤220 选择活敌，积累击退 80×(1−kbRes)，零距离固定 +X 方向，不伤害、不掉落；下一战斗步执行位移。

### 5.2 三种时间不可混用

| 时间 | 推进条件 | 负责内容 |
|---|---|---|
| 战斗逻辑步 simulationTick | 每次实际执行 playing/cleansing/extract 步 | 丹药、无敌、万剑、波次、360 秒进化门槛 |
| 选卡表现时间 | 前台可见且正在对应 offer 的演出/解锁阶段 | 破境1.2秒、出卡后0.4秒防误触 |
| 墙钟 / Date.now | 仅宿主生成种子或平台能力 | 不计算任何上述战斗期限 |

凝婴cleansing继续逻辑计时但锁移动与攻击；extract恢复移动以走入光点。保留 levelup 状态，不另开可推进战斗的 breakthrough 态。进入破境 offer 后逻辑已经冻结，宿主先播放1.2秒再显示卡片；0.4秒从卡片可见时开始。逻辑 choose 本身不依赖墙钟，自动测试/bot 可直接选；用户输入由宿主状态锁控制。切后台、手动暂停均冻结破境演出剩余时长；恢复同一offer，不重抽、不重发破境。演出继续剩余时长；若已经显示卡片，返回后重新锁定0.4秒，防止唤醒手势误选。旧tween/点击回调因token不符失效。

新增 simulationTick 在一次真实模拟步开始时 +1，time 在步结束保持与已执行步数对应；升级/暂停帧不加步。丹药在步开头、移动/回复/武器之前过期：服用时 T，durationTicks=N，则有效区间 T≤tick<T+N；首个到达截止步的伤害和移动必须使用失效后属性。对应 30秒=1800步、20秒=1200步。不要把过期处理放在移动之后。无敌期限同样以实际模拟步推进。

现有 clock.advance 会提前算一帧应执行步数，Run 进入 levelup 后中断循环；不得把“预计步数”加到 simulationTick，也不得恢复时补暂停墙钟。多步帧、超过5步截断、暂停恢复必须用实际执行序列验收。

### 5.3 抽卡与终局优先级

稳定候选顺序：已有功法升级(10) → 职业被动升级(10) → 已有心法升级(10) → 新功法(8) → 新心法(4) → 丹药(3)。新条目分别按原数据键序过滤职业池。丹药以 offerInfo.targetLevel≥5 为门槛，不以提前跳升的 level 判定；抽中一张后移除本 offer 其余丹药。四功法、四心法、独立一职业栏，丹药不占栏。

进化固定第一张；首升保底新功法；破境保底新功法或功法升级，进化卡也算功法类。无合法功法候选时退化正常抽取，不造假卡、不降级；不足三张沿用 heal_dew/shiny_spore 补齐。普通/职业被动满级不再候选。

本设计选择死亡优先：同一战斗步玩家 HP≤0，先 lost，不允许待开的选卡回满救活；玩家存活且 Boss 死亡才进入 cleansing，取消所有待呈现 offer/升级队列的交互资格，不在撤离阶段弹卡。当前通过死亡前置禁止拾取回血与后续终局裁决保证。queued XP 可留作 summary.level；新增 summary.appliedLevel/realm/layer 表示实际生效状态，避免把待选等级冒充已突破。

## 6. 万剑归宗延迟命中

以下为补足 GDD 歧义的实现选择：矩形固定720×1280世界单位，中心锁定预警开始时角色的位置，落剑仍使用该中心（E04集成裁决：预警与实际命中范围保持一致，移动不会拖动攻击区）；不直接读设备像素/相机尺寸。初版扫描最多202个 active 敌人做圆矩形精确相交，无需给 SpatialGrid 增加新 API，因此不会漏 large Boss 或受窗口外裁剪影响。

每把武器新增 `phase:'ready'|'warning'|'cooldown'`、strikeAtTick、readyAtTick、castId。所有字段构造时初始化。状态顺序：

1. ready 时矩形内有活敌，进入 warning，strikeAtTick=当前tick+36；没有目标保持 ready。只发一次 wanjianWarn。
2. warning 期间仍可移动、升级或服丹；暂停/选卡使逻辑步停留，预警进度也停留。禁止 Cocos tween 回调直接扣血。
3. tick 到达 strikeAtTick，扫描当下活动实体；圆与闭矩形相交即命中，边缘相切算命中，每实体每 cast 一次。预警后新进入者可命中，离开者不命中；不保存预警时的敌人对象/slot，避免池复用误伤。
4. 使用落剑时 tier 与 stats 计算 raw，包含届时仍有效的丹药；调用统一敌人命中入口，无击退、不受面积倍率影响、不额外消耗 RNG。即使所有敌人已离开也结算为空击。
5. 清除 warning，进入 cooldown：readyAtTick=当前tick+ceil(档位cooldown×cooldownMul/DT)，冷却按落剑时属性快照；下一轮再重新取值。周期为预警0.6秒+冷却，Lv5最低5.5+0.6秒。停止/终局/销毁清除未落剑状态，cleansing/extract 不再施放。

E04固定步调度：Weapons 同时负责预警和到期结算，位于 Projectiles 与 stepZones 之前、敌方伤害之前。优先保证当前武器调度一致；同帧重复命中由存活状态过滤。这里复用阶段，不复用圆形 raindrop zone 或它的池。事件为 `wanjianWarn{castId,strikeAtTick,width,height}` 与 `wanjianStrike{castId,x,y,width,height,hits}`；HUD 重建从武器状态读取，不依赖曾经收到一次事件。

## 7. HUD 与宿主映射

| 现有读取/行为 | 待实现读取/行为 | 责任文件（未来） |
|---|---|---|
| HUD 用 progression.level 显示 Lv | 主角境界读 appliedLevel/realm；XP 条仍读 xp/needed；待结算层数可独立提示 | SurvivorHud.ts |
| View 用 level−pendingLevels+1 算弹卡级别 | 直接读 offerInfo.targetLevel/id/breakthrough；演出阶段不调用 showLevelup | SurvivorView.ts |
| showLevelup 仅识别 weapon/passive/evolve/heal/crystal | 明确支持 classPassive/pill；丹药不能掉入 crystal 默认分支 | SurvivorHud.ts |
| 四功法/四被动 | 完整四+四与御剑术信息移入暂停详情，临时丹药图标按需显示；战斗常驻按01精简 | SurvivorHud.ts |
| update 用每帧 dt | 丹药剩余=max(0,endTick−simulationTick)/60；万剑预警同理 | Hud / BattleArt |
| 旧武器/敌人 ID 与资源帧 | 保留查询键，显示替换中文；新增万剑帧缺失有占位回退 | BattleFrames / BattleArt / strings |
| 受击、进化事件特效 | 新增破境/万剑/丹药低频事件；统计不由动画触发 | View / Audio / BattleArt |
| hide 暂停 Run、重置输入 | 额外冻结表现计时、废弃旧回调，恢复同 offer 阶段 | View / Platform |
| ResultInfo.level 与构筑 | 保留原字段，追加 appliedLevel/realm/layer/classPassive/pills/ascended | View / Hud |

现有 slotKey 只累加等级，可能无法区分同总等级的不同构筑；新缓存键应含 ID、等级、evolved 和职业被动，或使用显式 revision。0.4秒锁必须绑定 offer token，避免旧卡回调选中下一轮同索引。

伤害数字设计为只读 `DamageFeed` 环形缓冲：预分配256条，head单调增加；消费滞后仅丢显示记录，不能丢真实伤害。宿主每帧最多接纳6个、同时24个数字、每个最多5位，只显示对统领/Boss或由万剑造成的伤害，不显示玩家受伤数字（由生命条和受击反馈表达）；这些是初始预算，不是已验证性能。记录包含sequence、tick、uid、x、y、amount、source、targetKind。summary.maxHit由逻辑独立累计，不从显示缓冲反推。减少闪光沿用profile.settings.reduceFlash。E06显式扩展settings白名单：music=true、damageNumbers=true、largeText=false，保留sound/vibration/reduceFlash旧值；仅缺失项补默认，不迁移余额，不改变schema1。升级读档/保存重载/旧偏好保留均需测试；旧版本程序可能丢弃新字段，仅丢显示偏好不能损失进度。

## 8. 增量任务与代码所有权（运行时接入待开发）

统一任务状态以07为准：P0→E00，P1→E02/E05，P2/P3a/P3b→E03，P4a/b/c→E04，P5→Q01/Q02；基础纯模块E01/E02先行完成，不等于生产接入。这些路径是后续接入范围，不是本次修改清单。不按总人日承诺；依赖、验收与宿主接入分别交付。

| 任务 | 未来修改/新增路径 | 交付边界与依赖 | 验收矩阵 |
|---|---|---|---|
| P0 基线封存 | 集成负责人管理 shared、manifest、测试报告 | 在 Sprint 3 基线稳定后记录提交/差异、测试与bot配置；另行处理7文件同步，本次不执行 | BASE/SAVE |
| P1 显示映射 | data/strings.js、显示用name、SurvivorHud.ts | 不改旧ID/候选键序/经济；零战斗行为变化 | ID/HUD |
| P2 刻度与伤害 | data/weapons.js/enemies.js/validate.js、Stats.js、新 Damage.js、Weapons.js、Projectiles.js、Run伤害入口 | 统一coefPct、raw与取整；不混入境界/新卡；重审精确伤害用例 | DMG |
| P3a 职业与境界 | 新 data/classes.js/realms.js、Realm.js；Stats、Progression、Run、validate | 可选ctx、职业池、逐层提交；依赖P2，不启用yujian/丹药/万剑 | CLASS/REALM/QUEUE |
| P3b 补偿与破境宿主 | waves、Spawner、Boss、Enemies、Stats；View/Hud/Art | K/D每敌只乘一次；1.2+0.4演出、暂停恢复、终局优先 | SCALE/QUEUE/HUD |
| P4a 御剑与金刚 | passives/weapons/validate；Progression、Weapons、Stats | 职业栏、参数重算、射程、360秒/3级进化；依赖P3 | EVO/CLASS/DMG |
| P4b 丹药 | 新 data/pills.js；Pickups、Progression、Run、Stats、Hud | tick期限、最多一丹、风丹吸引复用；依赖P3 | PILL |
| P4c 万剑 | weapons/limits/validate、Enemies、Weapons、Run、Art | 第六index、延迟矩形命中；依赖P2/P3，按落剑时最新属性集成P4a/b | SWORD/PERF |
| P5 综合验收 | tests/survivor-*、fixtures、bot/balance/bench、SurvivorSmoke/Perf | 各功能合并后再交集成负责人同步、构建、双端回放与真机；结果留证据 | REPLAY/HOST/PERF |

共享文件避免并行覆盖：Progression 由队列/抽卡负责人统一合并，Stats/Damage 由属性负责人统一合并，Run 由逻辑集成人统一合并，data/validate 由数据负责人统一合并，宿主由 Cocos 负责人维护。其他任务先交接口与测试补丁，不各自大段重写这些文件。所有 shared 生成物只有集成负责人通过同步脚本维护，不手改。

## 9. 风险与交付判据

P1 应保留原始金标准，失败先定位，不靠重生成掩盖。P2 以后有意改变伤害/卡池/时序，先新增精确测试与差异报告，经评审再建立新版本金标准。扩展回放摘要以覆盖 appliedLevel、offer、职业被动、丹药截止步和万剑phase/castId/截止步；旧 stateHash 没覆盖这些，单看它一致不够。

K/D 沿用旧 GDD 候选表不是平衡证明。以5500/0.2/360秒/3级基线重新采样，固定 seeds、策略、版本与视口，记录各分钟等级、死亡时间、破境时刻、进化时刻、万剑选取率与通关率。GDD 的熟练≤80%、新手30–60%、通关中位6–9分钟仅作待验证目标；明确各策略如何归类后再统计，空通关组的中位数记 N/A。

验收须分开报告根逻辑、shared一致性、宿主、真机与平衡，不以任一层代替其他层。当前交付只有这份设计和 QA 矩阵，不包含功能实现、测试通过、性能达标或上线结论。


## 10. 本轮基础模块边界

`js/xianxia/Catalog.js`提供显示名和完整目标职业目录；其中wanjian/vajra/丹药尚未生产实装，不能把目录直接当已启用卡池。`js/xianxia/Realms.js`提供等级和K/D换算，输入为未放大旧敌人基础值，函数内部只放大一次。E03接入时从现有生成点调用，不将已放大的GDD表再次传入。两个模块尚未被Cocos宿主import；独立文件不应通过空引用强行加入包。当前生产shared仍27模块。

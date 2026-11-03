# 六边形与十二族攻击：真实 Run 烟测

状态：**completed-smoke-not-balance-acceptance**。只验证固定配置的运行结果与结构完整性，不是全面平衡验收。

本轮实测墙钟 **4.882 秒**，源码前后哈希一致。正常组 **2 胜（2、7 层）、1 败（8 层）、6 超时（1、3、4、5、6、9 层）**；六次超时全部来自事先固定的 360 秒模拟上限，没有触及机器墙钟预算。第 8 层在 358.967 秒死亡，保留 HP=0，没有重试或改配置。

正常组 287 个、功能组 227 个快照均通过真实校验与 restore 往返，共 **514 个**。玩家、敌人、预留出生圆、冲锋终点最大越界均为 **0**；横屏跟随误差最大 `2.2737367544323206e-13` 世界单位。九层功能组完成 **4,770/4,770** 个真实 authored 实体，每层均实际消耗八组入口的合法出生点，最终 pending/reserved/active 全部为 0。

正常组累计观察到 **12/12 族**攻击激活：ape、bat、bear、boar、centipede、crocodile、falcon、scorpion、snake、spider、tiger、wolf。按 kind 的激活数为 charge=210、bite=54、shot=963、web=6、slam=96、sweep=216；poison/feather/sonic 三类投射物均实际出现。此覆盖不等于每族每角色或所有 Boss 招式覆盖：本轮第 1 层停在第 19 波，未验证其 Boss 的 stone 招式。

供 review：第 8 层死亡和六次超时是保留的压力结果，不能宣称难度或通关能力验收通过。第 6 层在第 17 波结束，仍有 31 pending、4 reserved、1 active；这只是固定时限的截面。独立排空通过说明 authored 队列在该功能 fixture 下可完成，不证明所有动态站位下都不会积压，也不能代替自然养成或人类操作评估。

## 方法与限制

- 正常组：九层各 seed=1；arenaVersion=1、lootVersion=1、_playtestAssist=false，1/60 秒固定步长。
- 每步先 webEscape/steer 加六边形避墙，再设置 1280×720 横屏的实际 HUD 可见区域 1264×524，followPlayer=true。使用真实 Run 的可见性和移动；未启动 Cocos/browser，不能当作设备画面测试。
- 不调用旧 play()；正常组仅控制移动、视口和推进时间，不写玩家 HP、敌伤、敌人 HP、冷却、位置、奖励或 RNG。
- 以下配置为人为提供阶段 XP、已通层、资源的合法容量 fixture，初始满血来自对应境界。技能、研究、书费和装备精炼经 Campaign 真实事务检查；不是自然养成路径或资源可负担性证明。
- 每局模拟上限 360s，正常组单局墙钟预算 3500ms。墙钟超时依机器负载而异；--wall-ms=0 可只用确定性的模拟上限重放。死亡、超时均保留，不挑种或重试调数。
- 独立 spawn-drain 组由标准 _damageEnemy/_deaths 立即消耗已正常出生的敌人并产生标准 killLedger，不改出生警示/时序/支援触发；属于人工功能 fixture，绝不计入正常战斗胜率。
- 越界值检查玩家、敌人、预留出生圆及冲锋终点；投射物、范围技能和视觉特效可伸出墙外，不混入角色容纳判定。攻击 started/activated/fired/hitFlags 按真实攻击 id 去重；hitFlags 不是玩家实际承伤，后者另记 playerHitEvents/playerDamage。

## 固定成长配置

|层|阶段|XP/等级|已通层|SP 已用/总计|素问剑品质/精炼|
|---|---|---|---|---|---|
|1|fresh|0/1|0|0/0|1/0|
|2|early|525/6|1|5/5|1/0|
|3|early|525/6|2|5/5|1/0|
|4|middle|2925/14|3|17/17|1/2|
|5|middle|2925/14|4|17/17|1/2|
|6|middle|2925/14|5|17/17|1/2|
|7|late|7920/23|6|30/30|1/4|
|8|late|7920/23|7|30/30|1/4|
|9|late|7920/23|8|30/30|1/4|

## 正常战斗（真实结果）

|层/种子|结果|模拟秒|已清波|击杀/总数|HP|pending/reserved/active|最大越界|有效快照|结构检查|
|---|---|---|---|---|---|---|---|---|---|
|1/1|timeout (simulation-limit)|360|18/20|366/378|101|0/0/3|0.000e+0|32|通过|
|2/1|won|298.85|20/20|416/416|7.62|0/0/0|0.000e+0|30|通过|
|3/1|timeout (simulation-limit)|360|19/20|449/454|101.75|0/2/3|0.000e+0|33|通过|
|4/1|timeout (simulation-limit)|360|19/20|490/492|110.25|0/0/2|0.000e+0|33|通过|
|5/1|timeout (simulation-limit)|360|18/20|515/530|86.58|0/0/6|0.000e+0|32|通过|
|6/1|timeout (simulation-limit)|360|16/20|445/568|101.66|31/4/1|0.000e+0|30|通过|
|7/1|won|345.533333|20/20|606/606|67.17|0/0/0|0.000e+0|32|通过|
|8/1|lost|358.966667|19/20|642/644|0|0/0/2|0.000e+0|32|通过|
|9/1|timeout (simulation-limit)|360|19/20|674/682|109.8|4/0/4|0.000e+0|33|通过|

## 出生队列排空（功能 fixture）

|层/种子|结果|模拟秒|已清波|击杀/总数|HP|pending/reserved/active|最大越界|有效快照|结构检查|
|---|---|---|---|---|---|---|---|---|---|
|1/1|won|200.233333|20/20|378/378|100|0/0/0|0.000e+0|27|通过|
|2/1|won|107.733333|20/20|416/416|101.25|0/0/0|0.000e+0|24|通过|
|3/1|won|116.066667|20/20|454/454|101.25|0/0/0|0.000e+0|24|通过|
|4/1|won|124.45|20/20|492/492|110|0/0/0|0.000e+0|25|通过|
|5/1|won|132.816667|20/20|530/530|110|0/0/0|0.000e+0|25|通过|
|6/1|won|141.133333|20/20|568/568|110|0/0/0|0.000e+0|25|通过|
|7/1|won|149.533333|20/20|606/606|119|0/0/0|0.000e+0|25|通过|
|8/1|won|157.866667|20/20|644/644|119|0/0/0|0.000e+0|26|通过|
|9/1|won|166.25|20/20|682/682|119|0/0/0|0.000e+0|26|通过|

## 正常组实际攻击覆盖

|层|已出生族|已起手族|已激活族|各 kind 起手/激活/发射/命中标记|
|---|---|---|---|---|
|1|boar,spider,wolf|boar,spider,wolf|boar,spider,wolf|charge 167/88/0/0; bite 49/14/0/2|
|2|bat,boar,spider,wolf|bat,boar,spider,wolf|bat,boar,spider,wolf|bite 73/18/0/7; shot 87/49/49/0; charge 69/31/0/0|
|3|bat,scorpion,spider,wolf|bat,scorpion,spider,wolf|bat,scorpion,spider,wolf|bite 44/5/0/0; shot 200/108/108/0; web 5/3/3/0|
|4|ape,boar,crocodile,scorpion,wolf|ape,boar,crocodile,scorpion,wolf|ape,boar,crocodile,scorpion,wolf|charge 131/51/0/0; slam 25/9/0/0; sweep 32/7/0/1; bite 14/4/0/0; shot 115/67/67/0|
|5|bat,crocodile,snake,spider|bat,crocodile,snake,spider|bat,crocodile,snake,spider|shot 450/233/233/0; sweep 24/6/0/1; bite 4/0/0/0; web 3/3/3/0|
|6|ape,bear,boar,centipede,scorpion|ape,bear,boar,centipede,scorpion|ape,bear,boar,centipede,scorpion|slam 92/57/0/0; sweep 100/58/0/8; charge 67/40/0/0; bite 2/0/0/0; shot 114/57/57/0|
|7|ape,bat,falcon,snake,tiger,wolf|ape,bat,falcon,snake,tiger,wolf|ape,bat,falcon,snake,tiger,wolf|sweep 100/42/0/4; shot 320/177/177/0; bite 25/4/0/0; slam 16/8/0/0|
|8|bear,centipede,crocodile,scorpion,spider,wolf|bear,centipede,crocodile,scorpion,spider,wolf|bear,centipede,crocodile,scorpion,wolf|bite 44/9/0/5; sweep 46/18/0/2; shot 68/40/40/0; slam 20/11/0/0|
|9|ape,centipede,crocodile,falcon,snake,tiger|ape,centipede,crocodile,falcon,snake,tiger|ape,centipede,crocodile,falcon,snake,tiger|sweep 161/85/0/10; shot 404/232/232/0; slam 13/11/0/0|

## 结果边界

正常 9 局：2 胜、1 败、6 超时、0 异常；功能排空 9/9。正常组未观察到激活攻击的族：无。

源码一致性：true。完整源码哈希、逐局观测与配置购买记录见 hex-combat.json。

命令：`node scripts/verify-tower-hex-combat.mjs --prepare` 只检查配置并生成待跑说明；收到 ready 后执行 `node scripts/verify-tower-hex-combat.mjs --run`。可选 `--max-seconds=360 --wall-ms=3500 --drain-wall-ms=1500`。不会重跑旧 balance 或整个测试套件。

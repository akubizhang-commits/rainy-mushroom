# 六边形与十二族攻击：900 秒截断扩展对照

状态：**completed-900s-extension-not-balance-acceptance**。最终九局：**7 胜、2 败、0 超时、0 异常**。仅解决原六次 360 秒截断的不确定性，不是调参寻优或全面平衡验收。

## 历史证据与同轨迹检查

- 原 hex-combat.md/json 已逐字节保留为 **hex-combat-360.md/json**，包括最初的 2 胜、1 败、6 超时及 review 说明；未覆盖历史证据。
- 仅重放并延长原超时的第 1、3、4、5、6、9 层，原 seed=1、fixture、装备、controller 与全部记录源码哈希保持不变；maxSeconds=900、wallMs=0，禁用墙钟截断。
- 第 2、7 层原胜利和第 8 层原死亡记录逐字段原样保留，**没有重试第 8 层**。九层 spawn-drain 原记录也逐字段保留，未重跑、未计入正常胜率。
- 直接调用原脚本导出的 simulate()；不修改脚本、生产逻辑或数值。新结果的每个前 360 秒定期/换波快照均与历史逐字段一致，且六局完整 360 秒快照 SHA-256 全部一致。

|层/种子|匹配的历史检查点|360 秒完整状态哈希（两版相同）|
|---|---|---|
|1/1|31|3c41c6836c79d4819e7ac1fc38c762117d3ef545f1d8a93bf79113f755def05a|
|3/1|32|d5c4e0aefb6a3295d81797c451f9b62da0d977d80e492078e7cef89824e7b21a|
|4/1|32|615f4f751f0fe009a696fafd09a0f0e7c779a0764868bd569f45210a89222124|
|5/1|31|e6f2b9d946c6e2238b58bbbba9004b6ba5209b80fccb4131a2a69bdaafb63ff8|
|6/1|29|62b80361c67a311f01daef1bc30e629447f5e115422fb5694578a64659dd0f15|
|9/1|32|e17f0b653873abf1b708df021335b0a4baa6b5254ad27eaab7d9a1419bfc61d8|

扩展运行墙钟 2.967 秒。源码前后哈希一致：true；配置摘要及源码完整哈希见 hex-combat.json。

## 正常九局：历史与最终结果

|层/种子|360 秒版结果|900 秒版结果|最终模拟秒|已清波|击杀/总数|HP|pending/reserved/active|处理|
|---|---|---|---|---|---|---|---|---|
|1/1|timeout @ 360s|won|396.183|20/20|378/378|89|0/0/0|仅延长原截断样本|
|2/1|won @ 298.85s|won|298.85|20/20|416/416|7.62|0/0/0|原终局保留，未重跑|
|3/1|timeout @ 360s|won|378.667|20/20|454/454|101.75|0/0/0|仅延长原截断样本|
|4/1|timeout @ 360s|won|370.783|20/20|492/492|110.25|0/0/0|仅延长原截断样本|
|5/1|timeout @ 360s|lost|406.45|19/20|529/530|0|0/0/1|仅延长原截断样本|
|6/1|timeout @ 360s|won|500.633|20/20|568/568|95.23|0/0/0|仅延长原截断样本|
|7/1|won @ 345.533s|won|345.533|20/20|606/606|67.17|0/0/0|原终局保留，未重跑|
|8/1|lost @ 358.967s|lost|358.967|19/20|642/644|0|0/0/2|原终局保留，未重跑|
|9/1|timeout @ 360s|won|402.767|20/20|682/682|30.26|0/0/0|仅延长原截断样本|

## 固定方法与范围

- arenaVersion=1、lootVersion=1、_playtestAssist=false，1/60 秒固定步长。每步先原 webEscape/steerHex，再设横屏视口并推进；1280×720、扣除 HUD 可见区域 1264×524、followPlayer=true。未运行 Cocos/browser，不声称设备画面验证。
- 人工阶段 fixture：第 1 层 0 点；2–3 层 5 点；4–6 层 17 点；7–9 层 30 点。原 XP、初始 HP、已通层、技能、装备及真实 Campaign 购买记录全部沿用；没有改 HP、敌伤、冷却或战斗状态，不是自然养成或价格可负担性证明。
- 不挑种、不重试死亡、不更换移动策略。当前九局不是新增九个独立样本，前 360 秒与原样本重合，不能混合两版计算成功率。
- 越界测量覆盖玩家、敌人、预留出生圆和冲锋终点；快照用真实 validateTowerSnapshot 与 restore 往返验证。攻击 hitFlags 是敌方攻击命中标记，实际玩家承伤另见 playerHitEvents/playerDamage。

最终合并报告有效快照 526 个（包含保留的功能组，不重复累计旧截断行）；最大越界 0。正常九局结构检查：全部通过。

## 正常组实际攻击覆盖

|层|已激活攻击的族|各 kind 起手/激活/发射/命中标记|
|---|---|---|
|1|boar,spider,wolf|charge 176/93/0/0; bite 52/15/0/2; gore 3/2/0/1|
|2|bat,boar,spider,wolf|bite 73/18/0/7; shot 87/49/49/0; charge 69/31/0/0|
|3|bat,scorpion,spider,wolf|bite 44/5/0/0; shot 201/109/109/0; web 9/6/6/0|
|4|ape,boar,crocodile,scorpion,wolf|charge 131/51/0/0; slam 25/9/0/0; sweep 32/8/0/1; bite 14/4/0/0; shot 115/67/67/0|
|5|bat,crocodile,snake,spider|shot 468/242/242/0; sweep 24/6/0/1; bite 4/0/0/0; web 3/3/3/0|
|6|ape,bear,boar,centipede,scorpion|slam 123/76/0/0; sweep 103/58/0/8; charge 104/63/0/0; bite 3/0/0/0; shot 182/95/95/0|
|7|ape,bat,falcon,snake,tiger,wolf|sweep 100/42/0/4; shot 320/177/177/0; bite 25/4/0/0; slam 16/8/0/0|
|8|bear,centipede,crocodile,scorpion,wolf|bite 44/9/0/5; sweep 46/18/0/2; shot 68/40/40/0; slam 20/11/0/0|
|9|ape,centipede,crocodile,falcon,snake,tiger|sweep 171/91/0/12; shot 409/234/234/0; slam 13/11/0/0|

## 保留的出生排空证据

沿用 360 秒版的独立人工功能 fixture：9/9 层，4,770/4,770 authored 实体完成；每层八组入口均被实际消耗，最终 pending/reserved/active 全部为 0。未重跑这组，也不把它当作正常战斗通关。

## 结论边界

此次扩展后仍有 2 局死亡、0 局 900 秒超时。逐局尾波状态见表与 JSON；只证明这些固定输入的结果，不证明人类难度、自然成长可达性或所有 Boss 角色/攻击组合已覆盖。

复核入口：scripts/verify-tower-hex-combat.mjs 的导出 simulate(fixture, seed, {maxSeconds:900, wallMs:0})；本次从 hex-combat-360.json 读取原 fixture，仅调用原 timeout 行，保留其余行。直接使用 CLI --run 会重跑全部九局及 drain，不是本轮选择性扩展的调用方式。

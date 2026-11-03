# 成长方案统一接入合同

2026-10-28｜用户已要求收口并统一接入技能、战斗、存档；本稿将23号方案冻结为功能试玩基线。数值允许据实测校准，金丹27、装备30%、HP、三资源、抽取规则保持。

同日增补：技能节点直接＋/−，点图标或名称在本页固定说明栏显示详情，横屏右侧、竖屏下方。场外单点退款、教学绑定等级、关联技能/进化连退和经卷保留见[27号合同](27-inline-skill-controls.md)。妖丹改为按妖兽阶位随机掉落、整层数量/价值双界见[26号合同](26-random-core-drops.md)；现有经卷/研习价格按一阶等值结算。最新用户需求统一见[31现行需求](31-current-requirements.md)。

## 范围和分工

- 数值：`TowerGrowth.js` 独立新成长表、点数与条件纯函数；不修改旧TowerContent五级表，后者保留旧快照验证用途。
- 永久成长：TowerCampaign schema3，境界/首通/研习点总账、经卷、加点/重修、教学记录、迁移。
- 战斗：TowerRun同时识别旧loadout和growthVersion=1；新10/8/3等级、学会全部自动、进化替换、清波教学、暂停更新战斗技能。
- UI：TowerMenu只保留一张连接分支技能页；TowerView连接暂停加点与战斗心法光环。
- QA/数值：事务/存档测试、三流派预算与真实九层模拟、实际构建和浏览器路径。元婴领域不进入本期塔战。

## 共享API（各代理依此并行）

`js/xianxia/TowerGrowth.js` 导出：

- `GROWTH_SKILLS`：沿用旧技能id/kind/name/levels效果字段名，扩到功法10、心法8；新增`pointCosts:number[]`,`maxLevel`,`special:boolean`,`bookCost`,`learnClear`。
- `GROWTH_EVOLUTIONS`：沿用id/name/parent/passive；新增pointCosts[3,4,5]、maxLevel3、bookCost240、budgetMultipliers[1.10,1.15,1.20]。
- `giftSkills(tutorialWaves)`：御剑1；累计清波≥1剑气1、≥3万剑1（进度封顶3）。
- `realmPoints(xp)`：27级共30；`totalPoints(state)`：境界＋floor(clearedFloor/3)＋researchPurchases，最多36。
- `spentPoints(state)`：skills＋evolutionRanks逐级实际成本，减去已经授予的教学等级，不退教学成自由点。
- `growthSummary(state)`：{total,spent,available,realm,firstClear,research,cap:36}。
- `skillRequirement(state,id,{inTower=false}={})`：返回{ok,reason?,nextLevel,cost,bookCost}；必要时reason=insufficient-points/realm-locked/floor-locked/prerequisites/library-only/tutorial-locked/max-level。bookCost仅首次特殊/进化且books未拥有；同一操作可购书+升1。
- `rankCap(id,xp,clearedFloor)`：受境界限制等级；进化前置仍由skillRequirement判断。

永久state新增`books:string[]`,`evolutionRanks:{id:number}`,`researchPurchases:0..3`,`tutorialWaves:0..3`。保留skills等级字典；旧evolutions数组可作已学进化索引与evolutionRanks一致。loadouts旧技能数组仅迁移兼容，新界面与战斗忽略技能槽，只保留武器配装；不得再限制4+4/2。

新combatLoadout = 所有skills按kind拆分＋所有evolutionRanks>0的id＋`growthVersion:1,evolutionLevels:{id:rank},tutorialWaves`＋原武器字段。旧无growthVersion保持旧验证/效果，仅用于历史测试和旧快照迁移。

TowerRun：新运行base保存初始tutorialWaves；非演武每个真实清波后tutorialWaves=min(3,base.tutorialWaves+clearedWaves.length)，据此补绑定1级到loadout.active，立即有后续攻击，不重复计自由点。`setGrowthLoadout(loadout)`仅paused时更新已学等级，保持HP/时间/敌人/伤害台账/冷却；在途技能保留其施放时等级，不因新等级校验失败。

Campaign：checkpoint先验证新清波与Run台账，合并教学与xp，再检查snapshot.loadout等于新combatLoadout。动作`learnSkill {id}`在宗门或已保存paused塔内可用，按skillRequirement；塔内成功后更新保存snapshot，宿主restore该snapshot。`respecSkills`场外全洗，退实际SP，保留books与教学；全部进化同步移除。`researchPoint`场外80/160/240妖丹分别通3/6/9解锁，只3次。原buyBook可兼容转发learnSkill，新UI不再逐级妖丹购书。

## 迁移原则

schema1/2须先验证原checksum与旧规则，再一次写schema3。原资源/武器/HP/进度/已击杀收益不丢。旧特殊经卷永久保留；旧逐级妖丹按原表实际可推导投资补偿，不能重复迁移。新总量不能用旧赠技能绕过，具体等级重新分配与在途处理由Campaign/Run协作并写测试；迁移写盘失败保留原记录并只读。

## 体验/验收

首层从1技能到清第1/3波的2/3技能；技能点随永久修为增加且暂停可低阶加点；回宗解锁秘传、高阶和洗点，重载等级/花费一致。全学被动各有光环，暂停不动、死亡消失。实际消费能推进九层；可重复刷塔养成但额外点不能重复。自动模拟结果不替代真人难度验收。

## 本轮新增：独立体验工具

用户要求快速体验，已实现×1/×2/×3战斗速度与无敌秒杀。宿主TowerView负责倍率与工具状态，TowerRun.setPlaytestAssist是默认false且不写快照的实例开关，仅独立体验宿主显式重设。TowerPlaytest映射独立存储键，首次复制普通档，后续各自保存；普通场外休养恢复仍按真实时间。正常平衡测试禁止使用开关。

迁移实际采用保留经卷、补偿旧逐级妖丹，依旧配装优先按新合法点数逐级重新分配；旧进化经卷留存、等级重修。在途攻击保留施放上下文、HP/冷却/敌人与台账不重置。宿主显示一次迁移说明。

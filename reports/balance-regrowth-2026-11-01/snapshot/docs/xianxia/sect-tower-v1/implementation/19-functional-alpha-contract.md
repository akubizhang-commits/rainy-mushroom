# 宗门与九层塔：功能 Alpha 并行开发合同

2026-10-27。用户已批准18号决策表并要求自主并行开发，先体验功能，后替换美术。此稿规定接口，不重新打开已确认产品决策。

**执行状态：A/B/C/D均已完成首轮功能开发与集成。** 942测试、TypeScript、语法依赖检查、Cocos构建和三尺寸浏览器操作通过。九层16次真实模拟尝试通过，真人难度与最终美术尚待验收。详见[本轮验收](../../reports/tower-functional-alpha-2026-10-27/README.md)。

## 任务与所有权

| 任务 | 文件所有者 | 验收 |
| --- | --- | --- |
| A 永久养成、抽取、药品、配装、战斗快照与结算事务 | Campaign 工程师：TowerCampaign.js及对应测试 | 保存失败不发布；全部已定经济、HP、技能与保底规则 |
| B 九层战斗、十二族、技能、波次、存取快照 | Combat 工程师：TowerRun.js及对应测试 | 180波内容可调度；暂停可恢复；死亡不清层；实际击杀不丢收益 |
| C 宗门八处可用建筑、两处预留、整备与演武入口 | UI 工程师：TowerMenu.ts | 可触控、可滚动、无临时货币/兑换券/战斗丹药 |
| D 主机、战斗表现、输入、构建、跨模块验收 | 主线程：TowerView.ts、PinePilot.ts、同步脚本、集成测试 | 真实Cocos可玩入口，回宗消费与再进塔完整闭环 |

使用现有模块和纯JS→Cocos同步流程。旧Survivor试玩保留；新功能地址用 `?ruleset=xianxia&tower=1`。暂不做新美术。不得将静态评审页说成游戏。

## 内容接口

`js/xianxia/TowerContent.js` 由主线程生成，导出 `FLOORS, ARCHETYPES, SKILLS, EVOLUTIONS, ECONOMY, FLOOR01, FLOOR01_BOSS`，都是原批准JSON结构。各代理只读，不修改。
复用 `TowerProfile.js` 的 `cultivationAt(xp)` 和 `CAMP_PILLS`，旧基础store不接新宿主；新模式只有Campaign一个持久状态权威。

## 养成模型与接口

配装至少保留一个功法以具备自动攻击能力。进化的配套心法等级是学习条件，不要求占用出战心法槽；母功法必须装备。

`TowerCampaignStore(storage, nowMs)`：`.state` 只读JSON、`.error`、`.readOnly`、`.act(action,nowMs)` 返回 `{ok,reason?,...}`。
新存档key导出 `TOWER_CAMPAIGN_KEY`，全新profile，不做旧档迁移。

state字段固定：

```
xp,hp,cores,contribution,pills:{huichun,peiyuan},
skills:{[id]:level},evolutions:[id],
weapons:{[id]:{quality:1..4,refine:0..4}},
loadouts:[{name,weaponId,active:[id],passive:[id],evolutions:[id]}] //恰好3套
selectedLoadout:0..2,clearedFloor:0..9,normalCoreCounter:0..19,
weaponPity:0..19,rng,restAt,attemptSequence,
activeRun:null|{id,floor,base:{xp,cores,contribution,normalCoreCounter},snapshot},
tutorialDone:boolean,lastResult:null|{outcome,floor,earned,firstClear}
```

新档素问剑下品0强化，自带御剑1，20妖丹/300贡献/3回春丹；当前HP100。武器ID沿用 `eq_sword_suwen/eq_sword_qingxiao/eq_sword_zhenyue`。导出 `WEAPONS` 为数组 `{id,name,description}`；`weaponBonus(quality,refine)` 各档以6/12/18/24%加强化每级1.5个百分点，最高30%。此为可调试玩分配，非新增规则。

Actions：

```
sync
buyPill{id,count}, usePill{id}
buyBook{id} //未学学1级，已学升一级；进化同action
drawWeapon //结果含 draw:{id,name,quality,duplicate,refund,pity}
refineWeapon{id}
setLoadout{index,loadout} //整套严格验证已拥有与槽位
selectLoadout{index}
tutorialDone
startFloor{floor,seed} //返回 snapshot，创建TowerRun并保存
checkpoint{snapshot}
finishFloor{snapshot} //snapshot.phase只接受won/lost/abandoned
```

除sync/checkpoint/finish外，activeRun非空禁止场外交易/换装/再次入塔。sync塔内不回血。每次动作先写盘后发布；失败不耗任何资源。
`combatLoadout(state)` 导出 `{active:{id:level},passive:{id:level},evolutions:[id],weaponId,weaponQuality,weaponRefine}`。
开层时把 `attemptId` 传Run。checkpoint只接匹配id/floor/单调time的快照，钱包按base＋累计earned计算，绝不重复累加。永久xp取snapshot.player.xp。finish时死亡1HP，其他继承；won发一次首通10妖丹50贡献并解锁后层；同一结算不能重复。

## 战斗模型与接口

`new TowerRun({attemptId,floor,seed,hp,xp,normalCoreCounter,loadout,training?:boolean})`
`.state` 可变JSON，`.setInput(x,y)`，`.advance(dt)`，`.pause()`，`.resume()`，`.abandon()`，`.snapshot()`深复制；
`TowerRun.restore(snapshot)` 验证并复建实例；导出 `validateTowerSnapshot(snapshot)` 布尔值供Campaign使用。

固定state字段：

```
schema:1,attemptId,floor,phase:'playing'|'paused'|'won'|'lost'|'abandoned',
time,wave:1..20,player:{x,y,hp,maxHp,xp,attack,moveSpeed,faceX,faceY},
enemies:[{id,archetype,name,family,role,rank,x,y,hp,maxHp,radius,...AI}],
projectiles:[{id,x,y,radius,hostile,...}],zones:[...],drops:[...],effects:[...],
pending:[...],reserved:[...],waveKilled,wavePlanned,
earned:{xp,cores,contribution},normalCoreCounter,loadout,rng,...internal
```

坐标y向上，场地约x[-912,978],y[-1140,1020]，玩家起点(33,-60)，单位与旧游戏相同。宿主追随玩家，画面仅显示附近敌人。
副作用/RNG/计数/冷却/预警/AI等均进snapshot；不能有隐藏的Date.now/Math.random/计时器。
为了保持击杀归属和即时反馈，本功能版击杀时立即吸收修为与妖丹，drops可做收集飞行动画；回血拾取必须近身且活着才能取，不会被死亡自动吸收。每20普通怪永久计数给1丹，精英各阶3/5/8/10/12/15/18，Boss10/15/20/25/30/35/40；修为普通rank、精英5rank、Boss10rank。
每波全清2贡献，精英波额外5，最终额外45+5*(floor−1)贡献、5*(floor−1)丹。首通奖励只由Campaign发。所有pending/reserved/alive为空、击杀数满足且活着才推进；玩家死亡优先于清波奖励。
6功法6心法及4进化照SKILLS/EVOLUTIONS实现；可使用清楚的几何表现，不省略到全部同一种攻击。全套攻击受装备30%上限，宠物/符/携带丹药都不启用。
演武是独立training实例，不写资源、HP或进度；可以无限靶怪但不能伪造真实通塔。

## 宗门UI接口

`TowerMenu(parent:Node,width:number,height:number,handlers)`，
`.render(state,page='hall',notice='')`、`.destroy()`。
handlers：`action(action)`、`page(page)`、`enterFloor(floor)`、`resume()`、`training()`。
page由菜单自己细分但调用handlers.page，以宿主保存当前页；默认hall，tower/library/forge/pills/loadouts/training/home/gate为建议值。
所有UI业务通过action；菜单不直接改state、不自建storage、不持有TowerRun。
需明确显示HP、境界、妖丹/贡献、三资源用途；卡片有禁用原因/门槛，不能仅用无响应按钮。宗门首屏空间式建筑布局或清晰建筑网格均可，预留美术替换。

## 集成验收

纯模块测试 → 类型/同步/旧回归 → Cocos构建 → 浏览器首次入宗、买书/抽器/换装/服药/入塔移动攻击/暂停恢复/主动撤离/刷新继承。
用内存存储的集成模拟另验证死亡、清层、九层封顶、存储失败不丢资源、重复结算和12兽族/180波，不把加速模拟称真人平衡。
逐层8–12分钟需后续真人试玩校准，本次只交功能Alpha。

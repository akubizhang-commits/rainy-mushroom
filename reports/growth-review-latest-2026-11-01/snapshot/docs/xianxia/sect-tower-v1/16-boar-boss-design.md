# 首层裂岩獠王：可执行招式设计

2026-10-27｜战斗策划稿。阶段：设计／灰盒准备；只交付规则与数据，未接入运行时，未做真人平衡或设备可读性验证。参数源为本目录 [data/floor01-boss.json](data/floor01-boss.json)；灰盒据此展示形状和时间，不代表正式游戏已实现。

> [18决策](18-decision-register.md)已全部确认并允许开发，[17号合同](17-entry-exit-and-loot-proposal.md)明确死亡/撤离保留已击杀资源，含当波及未拾取修为/妖丹；全清条件只约束完成奖励。出入塔/下层继承HP，死亡回宗1HP，场外恢复与两种场外丹药按17号执行；塔内回血掉落保留，但不在死后自动吸收复活。本稿招式、必杀账本和同tick死亡判失败不变。

## 1. 目标、依据与边界

让玩家在第一层已学过的“横移躲直冲”上，学会“近身看扇形、半血后每次冲撞都再看一次预警”。反击发生在明确收招中，不依赖闪避无敌、位移技能、药品或金装。保留两种基本攻击 `charge`、`gore`，第二阶段复用两次 `charge`；不增加震地、碎石弹、护盾、韧性条、召唤技能或地形机关。

已读 [02清波与波次](02-tower-and-waves.md)、[08妖兽图鉴](08-beast-bestiary.md)、[11经济](11-economy-v2.md)、[13品阶校准](13-rank-calibration.md)、[15首层关卡稿](15-floor01-encounter-design.md)，并核对 `data/tower-design.json` 第一层20波、`rank-attributes.json` 及 [floor01-encounters.json](data/floor01-encounters.json)。本稿明确以下优先关系：

- 本轮硬约束及第一层账本优先于08号稿旧“8只普通猪”：支援固定为4猪、2狼、2蛛，分两批各2猪1狼1蛛。
- 第一层所有蜘蛛，包括第15波的精英赤腹毒蛛，只爬行与预警啃咬；不开放蛛网、毒、持续伤害、弹幕或减速区。名字含“毒”不构成技能授权。
- HP、基础伤害、常规移速沿用13号稿的固定原型，不叠楼层、波次、分钟、阶位或狂暴倍率。`gore.damage=12` 是13号稿小招 `20×60%` 的落表结果，读取时不能再乘60%。
- 出生以15号稿及`floor01-encounters.json`为统一合同，包括预警、预约容量、显形间隔、安全选点及单位ID。本稿细化Boss攻击与两组支援引用，不另建出生表，不改运行时、生成器或交接文件。

## 2. 数值与场地

| 项目 | 本稿取值 |
|---|---|
| 原型 | `boar_boss`，裂岩獠王，3阶 |
| HP／主要攻击伤害 | 3800／20 |
| 常规移速／身体半径 | 154u/s／42u |
| 玩家参考 | HP100、移速220u/s、碰撞半径18u |
| 场地 | 矩形 x[-912,978]、y[-1140,1020]，Y向上 |
| 初始位置 | 玩家(33,-60)；Boss北出生区首选(33,870)，该首选点中心距930u |
| 玩家中心合法范围 | x[-894,960]、y[-1122,1002] |
| Boss中心合法范围 | x[-870,936]、y[-1098,978] |
| 内置碰撞障碍 | 无；背景裂石不算障碍 |

身体半径不等于图片外框。首层设计中怪物身体不硬挡、不挤推玩家；半径用于受击、攻击与边界约束。被动接触伤害为0；普通怪的贴身啃咬同样必须取得攻击资格后才有伤害。否则玩家可能被未获资格的怪物围堵，下面的可逃离核算就不成立。此项是设计要求，不宣称旧运行时已符合。

坐标与场地复用当前庭院；(33,-60)是本轮指定的矩形中心。Boss的(33,870)是批次`f01w20b01`北区首选候选，不是强制固定点；被占用、玩家太近或其他安全检查失败时，仍按15号稿选择合法候选并完整预警。单招预览使用(33,260)适配演示射程，明确不是入场出生点。旧庭院代码中的(0,0)出生点不在本轮修改。角度以世界+X为0°，逆时针为正；渲染到Y向下画布时应转换坐标，不能把判定也翻转。

## 3. 同屏攻击资格：全首层共用2点危险预算

这里细化02/08/13已有的攻击排队要求，不另建一套Boss专用预算。第一层出生容量按`alive+reserved<=24`计算，预警预约也占容量；这与下面的2点危险预算分别计数，不是24只怪都可攻击。

| 攻击发起者 | 占用点数 | 取得／释放时点 |
|---|---:|---|
| 普通猪、狼、蛛的攻击，包括接触啃咬 | 1 | 蓄力开始取得，完整收招结束释放 |
| 任意精英 | 2 | 同上 |
| Boss任意招式 | 2 | 同上；双冲两段及段间喘息持续占用 |

同一时刻允许两个普通攻击，或一个精英／Boss动作。不能出现“2只狼扑＋Boss冲撞”；离屏怪也不能绕过此预算扣血。新蓄力开始至少相隔0.25秒，普通攻击预警至少0.6秒。等待资格者可靠近或调整位置，但不得悄悄开启伤害、挤人或刷新接触伤害计时器。

队列按“连续满足资格的时间”先后排序，同时间按出生实例ID排序。队首需要2点而当前只空1点时，保留空位等现有动作结束，不再插入新的1点攻击，避免Boss或精英永远轮不到。距离、存活、冷却、视野任一不满足则移出请求队列；重新满足时重新排队。角色身份不额外插队。

资格预检查通过后才取得点数并开始计时；锁定时若逃离条件失败，进入取消收招。活着的取消者到取消收招结束才释放点数，死亡立即释放。半血转场开始请求后暂停新攻击授予，待已有动作释放点数再执行转场。

## 4. 远处、屏幕与预警

使用首选出生点时中心距930u，超过直冲发起距离400u，所以开场不能遥控直冲；替代出生点同样必须通过发起距离与视野检查。Boss先做1.2秒出生预警，实际显形后才开始独立的1.2秒`entry`，结束后可用154u/s靠近。只有距离和屏幕条件同时通过才蓄力。屏外方向提示若存在，只提供方位信息，不能代替完整攻击预警，也不因此授权跨屏伤害。

有效视野 `V` 是当前相机投影后、扣除HUD等遮挡的战场矩形。Boss身体圆与玩家身体圆须完整处于 `V` 内，另留8屏幕像素边距；像素边距按当前相机换算，不能固定当8世界单位。整个蓄力期连续满足此条件，并连续显示攻击预警；不能在屏外先读条，入屏只补最后几帧。

预警按实际攻击形状绘制，并裁切到场地与 `V`。直冲超出屏幕的路线末端用“延续”标记，不能画封闭端盖误导玩家那里是安全终点。蓄力前段虚线轮廓可跟随转向；锁定后变实线并给一次锁定提示；颜色之外仍有线型与方向区别。声音不作为唯一提示。

锁定时还必须至少有一条下述逃离短线，其**整条玩家身体圆扫掠**留在合法场地与 `V`（含8像素边距）内。Boss和玩家不再因这项检查被瞬移；失败则取消本招。无内部障碍且视野为矩形，可检查短线两端的玩家圆是否都在内，无需增加寻路器。

| 招式 | 锁定时从玩家位置发出的候选短线 | 至少满足 |
|---|---|---|
| 直冲 | 沿锁定朝向的左右垂线各68u | 任一条合法 |
| 拱击 | 远离Boss的径向158u、左右垂线各158u | 任一条合法 |

拱击在双方中心重合时，以上一次非零朝向定义径向与垂线。候选线是发起条件的简单几何检查，不给玩家自动移动，不画新的导航UI。角落无合法候选时收招并重寻位置，不能截短预警强行命中。

蓄力期间Boss或玩家出有效视野，取消本招；锁定后相机变化使冻结的全部候选短线不可见，也取消。行动期间若身体可见条件失效，停止后续位移与伤害并做取消收招，不从画外持续冲入。重新入屏必须在冷却后重走完整蓄力，不恢复中断的旧进度。锁定后玩家自行改走另一条路，不让Boss重新追踪；检查保证的是锁定时存在逃离选择，不保证之后任意输入都安全。

如果灰盒只画全场而没有真实相机/HUD，须标记“视野条件未验证”，不能把全场都画得下当作移动端预警验收。

## 5. 两种基础招式

所有秒数均为模拟秒；暂停与后台冻结时不推进。`target_lock_s` 相对**每一段蓄力开始**。`range` 对直冲是Boss中心最大行进距离，对拱击是扇形半径；宽度和半径都尚未外扩玩家18u半径。

| id／名称 | shape | windup_s | target_lock_s | active_s | recovery_s | cooldown_s | range | width或扇形 | damage |
|---|---|---:|---:|---:|---:|---:|---:|---|---:|
| charge／裂岩直冲 | capsule | 1.05 | 0.25 | 0.60 | 0.90 | 5.00 | 432 | width=84 | 20 |
| gore／獠牙拱击 | sector | 1.25 | 0.15 | 0.18 | 0.80 | 2.40 | 132 | radius=132，angle_deg=100 | 12 |

### charge：锁定直线，不沿途追人

- 发起中心距为[180,400]u，使用2点预算。Boss原地刨地，前0.25秒只旋转朝向当前玩家位置，不平移。
- 第0.25秒锁定起点、朝向与终点。预警为沿该直线的胶囊，半径42u；实际路径长度 `L=min(432, 射线到Boss中心合法边界的距离)`。若 `L<120`，取消，不原地炸出伤害。冻结路线不会随玩家移动拐弯或延长。
- 第1.05秒开始以720u/s直冲，行动时长 `L/720`，最大0.60秒。预警描述整段未来路线；伤害只来自Boss当前身体圆以及本tick运动扫掠，不是整条路线在出手瞬间同时伤害。
- 对移动玩家使用双方相对运动的扫掠圆判定，合计半径 `42+18=60`。不得只检测帧末端而在低帧率穿人漏判；同一段最多结算一次，不因獠牙、身体、多个tick或重叠入口各扣一次。
- 命中玩家不反弹、不停下、不推人；继续走完锁定路线，已接触者本段不再命中。正常结束原地喘息0.90秒，身体接触无伤害。
- 到达中心合法边界的第一刻停止；包括恰好走满432u同时碰边的情况。边界收招固定1.20秒，**替代**常规收招，不相加；无溅射、额外撞击伤害或反弹。双冲首段撞边即取消后续第二段。

### gore：近身扇形，只拱一次

- 发起中心距为[0,150]u，使用2点预算。Boss原地抬头，前0.15秒追踪当前玩家朝向，之后冻结中心与朝向。
- 扇形圆心在Boss中心，半径132u，总夹角100°，即朝向左右各50°。1.25秒后该固定扇形生效0.18秒；不扫转、不前挪、不击退。
- 用“玩家圆是否与实心扇形相交”判定，包含两条径向边和外圆弧；不能只检查玩家中心角度，漏掉擦边。每次动作只命中一次。
- 伤害12，收招0.80秒；收招期间完整可受击，承伤倍率1，不把“侧身暴露”解释成额外易伤乘区。

### 选择与冷却

闲置且无转场时：距玩家≤150u且拱击可用，申请拱击；距玩家[180,400]u且直冲可用，申请直冲。150–180u间继续靠近至拱击区；超过400u或不可见时靠近。近身而拱击冷却时原地等待或调整位置，不补隐形接触伤害。一次只申请一个动作。

入场两招冷却均为0，仍需先完成实际显形后的1.2秒入场和全部发起条件；不能把显形前出生预警抵扣入场时长。冷却从**本次完整动作最后的收招结束**计算：正常、取消、控制延长、撞边、双冲都遵守同一规则。直冲单段从蓄力开始到同招最早再次可用为 `1.05+0.60+0.90+5=7.55s`；拱击为 `1.25+0.18+0.80+2.40=4.63s`，实际还可能等队列。不同招冷却独立，其他动作与转场中照常倒数；阶段变化不重置。

整个动作首次蓄力前的资格预检查失败不消耗冷却。已开始动作后取消（包括第二段开始前失败）则消耗该招完整冷却，不能靠出入视野刷新追踪。冷却期间不预先锁定下一个目标。

## 6. 半血阶段与两段冲撞

首次HP降至≤1900或直接死亡，先把第二批4只支援标记为已释放到待生成队列，保证只触发一次。**支援触发不等待转场动画，也不依赖Boss还活着。**

Boss仍存活时标记第二阶段待转场，立即停止授予新攻击资格：

| 当前状态 | 阈值触发后的处理 |
|---|---|
| 入场 | 完成剩余入场，然后转场 |
| 闲置／排队 | 撤销排队，等既有动作释放预算后转场 |
| 蓄力／锁定 | 取消本招，先做0.60秒取消收招，再转场 |
| 行动 | 完成本次已开始的行动与相应收招，不追加第二段 |
| 收招 | 完成当前收招，再转场 |
| 已死亡 | 不转场，保留支援队列，进入余怪清理 |

已有普通或精英动作照常结束并释放预算；转场获得2点预算后才开始1.20秒原地咆哮，其他新攻击继续等待。咆哮无伤害、无无敌、无回血、无击退，玩家可以继续输出乃至击杀Boss。转场结束采用第二阶段；之后即使未来有治疗使HP回升，也不退回第一阶段，不重复放支援。

第二阶段只有直冲变为两段：每段参数沿用上表，**每段重新开始1.05秒蓄力、第0.25秒锁定**。第一段正常结束喘息0.90秒，再从当前落点重新朝向玩家；第二段结束收招1.20秒。整个双冲占用同一份2点预算，中间不能塞杂兵攻击或拱击。

第二段不受首次发起的180–400u选择距离限制，否则容易退化为永远不连段；但在第二段蓄力开始及锁定时，玩家中心距均须≥60u，并重新通过完整视野、逃离短线与`L≥120`检查。玩家离得太近、太远而不可见或路线不安全时，放弃第二段，做0.60秒取消收招并进入冷却；不在原地无限等待，不改用拱击偷打。

| 双冲状态 | 相对整个动作的时间，未碰边／未取消时 |
|---|---|
| 第一段追踪预警 | 0.00–0.25 |
| 第一段锁定预警 | 0.25–1.05 |
| 第一段行动 | 1.05–1.65 |
| 段间喘息 | 1.65–2.55 |
| 第二段追踪预警 | 2.55–2.80 |
| 第二段锁定预警 | 2.80–3.60 |
| 第二段行动 | 3.60–4.20 |
| 最终收招 | 4.20–5.40 |
| 共享直冲冷却 | 5.40–10.40 |

动作开始时快照段数；第一阶段直冲途中掉到半血，不就地追补第二段。两段使用不同攻击实例ID，各为20伤害，确实各被撞中时最多40；不是一段获得×2倍率。第二段最早命中比第一段最晚命中晚 `0.90+1.05=1.95s`，不借两段间隔绕过受伤保护。

## 7. 打断、击杀、伤害去重与掉血恢复

普通受伤不打断，否则自动高频输出可能让首领无法出招。若现有技能明确产生硬控中断事件，允许打断蓄力、行动及剩余连段；本稿不新增硬控技能或抗性条。中断后取消收招为 `max(0.60秒, 当前剩余收招, 现有控制剩余时长)`，保持不可攻击，收招结束才起完整冷却。

同tick多个结束条件按“死亡＞撞边＞其他取消”处理；存活且撞边时至少收招1.20秒，不能因同时出画而缩成0.60秒，已有更长硬控仍取较长时长。

死亡立即删除未来判定、蓄力和后续连段并释放预算，不播完整收招拖住清理。已进入本tick有效接触集合的伤害不因同tick随后死亡而回滚；击杀取消的是尚未采集的攻击与以后tick。这样能同时满足“杀死后不再追打”和“同帧互杀仍然失败”。

攻击实例ID为 `wave_instance/unit_id/action_sequence/segment_index`，`unit_id`必须复用`floor01-encounters.json`对应批次的`unit_ids`；出生实例若已带波实例前缀，只复用一次前缀。去重键再加玩家ID。不是把字符串`charge`永久去重，也不能每帧生成新ID。一个键最多接触一次；保护期内或被完全挡下的接触也消费该键，不能贴住等保护结束再补扣。

同tick先汇总有效接触，玩家至多承受一次敌方HP伤害；多个候选选减伤后伤害最高者，相同则按攻击实例ID排序，其余接触也标记消费，避免容器遍历顺序改变伤害。沿用已有防御结算，攻击读表后不再叠阶位、波次、分钟或招式倍率。身体接触、冲撞、獠牙不得分别扣血。

实际掉HP后有跨所有敌人共用的0.60秒伤害保护，并阻止所有敌人新蓄力0.60秒；暂停不耗掉保护。已有动作与预警继续计时，保护内接触按上述规则消耗，不积攒延迟伤害。该窗口让参考玩家有132u移动距离；不是回血、额外药品、硬直或自动撤离。Boss收招本身另提供0.80／0.90／1.20秒的完整可输出窗口，并持续占用危险预算。

本tick结算顺序固定为：

1. 按tick开始时的存活集合推进已有位移，采集双方接触（直冲做连续扫掠）。
2. 去重与防御后，作为同一批提交玩家和敌人伤害。
3. 锁存首次半血／死亡的支援触发；处理死亡并取消未来攻击。
4. 玩家死亡先判本波失败，停止新攻击和生成，不检查成功。
5. 玩家存活才推进必需生成、转场与新攻击请求，再检查全清及一次性结算。

同tick最后妖兽与玩家都掉至0HP，结果是失败，不发本波完成奖励、不解锁下一层；该次真实击杀的修为/妖丹及以前收益保留，死亡回宗1HP。不能因先遍历到Boss死亡而跳过玩家死亡，也不能死后收取回血掉落复活。

## 8. 有限支援、账本与结算

第20波开局一次性登记9个必杀实例：1个Boss＋8个普通支援，初始全部进入pending，登记不等于预约。每个ID只处于`pending / reserved / alive / killed`之一，始终满足`planned=pending+reserved+alive+killed=9`。`pending`是未预约的必杀单位，包含尚未触发的半血支援；`reserved`是已经安全预约、正在等待显形的单位，不重复计入pending。

| 支援组ID（非新出生批次） | 触发 | 铁鬃妖猪 | 青风妖狼 | 墨纹妖蛛 | 合计 |
|---|---|---:|---:|---:|---:|
| opening | 第20波开始 | 2 | 1 | 1 | 4 |
| half_or_death | 首次HP≤1900或直接死亡 | 2 | 1 | 1 | 4 |
| 总支援 | 固定有限 | 4 | 2 | 2 | 8 |

`opening`和`half_or_death`只是两组汇总标签，实际出生必须引用15号稿的七个批次，不能把四只支援合并成一个新的顺序显形批次：

| 用途 | 原批次ID | 直接复用的unit_ids | 原指定区 |
|---|---|---|---|
| Boss | f01w20b01 | f01w20b01u01 | N |
| 开场两猪 | f01w20b02 | f01w20b02u01、f01w20b02u02 | W |
| 开场一狼 | f01w20b03 | f01w20b03u01 | E |
| 开场一蛛 | f01w20b04 | f01w20b04u01 | NE |
| 半血两猪 | f01w20b05 | f01w20b05u01、f01w20b05u02 | NW |
| 半血一狼 | f01w20b06 | f01w20b06u01 | E |
| 半血一蛛 | f01w20b07 | f01w20b07u01 | NE |

释放去重键为`wave_instance/encounter_batch_id`。出生实例直接使用原`unit_id`，或为不同波实例加一次`wave_instance/`前缀；不再生成`批次/原型/序号`的第二套ID。半血、死亡、多段伤害重复到达都不能再次释放已登记批次。招式本身没有召唤行为。

生成完全沿用15号合同：身体完整位于场内，中心距玩家至少280u；与其他alive或reserved单位中心距至少`max(92, 双方半径之和+16)`u。第20波S、SW保留区不生成新怪，优先原批指定区，再按15号候选顺序选点。这里不使用旧庭院函数的300u／额外120u出生距离公式。

预约成功才将对应ID由pending移入reserved并显示固定位置出生预警：普通支援0.90秒，Boss1.20秒。`at_s`是开始预警时点；同一原批次按0.22秒间隔显形，首个单位偏移为0。无延迟时显形时刻为`触发时刻+at_s+warning_s+原批内序号×0.22`；预约推迟或重做后，必须至少从本次成功预约起重新经过完整预警，不追赶旧时刻瞬间出怪。

预约容量必须满足`alive+reserved<=24`；满池的未预约ID继续pending。临显形再次检查玩家距离、边界、占位；若失效，该ID从reserved退回pending并释放预约，另选点后完整重播0.90秒／1.20秒预警。位置变化不能只续播旧倒计时。预警完成且安全检查通过，才将该ID由reserved移到alive；真实死亡才移到killed。出生标记无伤害、不消耗攻击点数，但占实体预约容量。

普通支援实际显形后0.80秒内无攻击资格、无接触伤害，仍可受击和被杀；之后也须排队并完整起手。Boss的0.80秒出生攻击禁用窗与显形后1.20秒`entry`从同一时刻起算、重叠执行，不相加，也不能计入显形前的1.20秒出生预警。无延迟时，Boss在波时钟1.20秒显形、2.40秒结束entry；若实际晚显形，entry整体后移。entry期间Boss不移动、可受伤，全体禁止**新**蓄力；之前已开始的动作不倒退取消。Boss若在entry中死亡，结束entry限制，但8只支援仍按账本处理。

屏外生成可以存在，但出怪不能在屏外预蓄力或攻击。出生失败、离屏都不能改记击杀。按15号稿，6秒无有效移动／攻击进展先重算朝向，15秒仍卡住才用安全出生流程重定位同一个ID，保留HP和支援触发状态；主动蓄力／收招不算卡住。无合法点时保留该单位并报告可恢复错误，不能复制ID、重复占两种账本状态或清除充数。

Boss被秒杀时，存活玩家仍需处理两组共8只支援。例如开场四只与Boss已死、后四只尚未预约时，账本为`killed=5, pending=4, reserved=0, alive=0`；若后四只正在预警，则是`killed=5, pending=0, reserved=4, alive=0`。两者均不能清层。后四只都显形并击杀后才到9。Boss先死不清场、不把剩余支援算作特效。玩家已死则停止失败波的继续生成，这不等于通关或奖励。

全清须同时满足：玩家存活、pending=0、reserved=0、alive=0、killed=9、两组支援引用的原批次均已释放且没有未登记必需生成任务。Boss击杀掉落归属在确认死亡时确定，死亡/撤离也保留；仅清波/通层/首通完成奖等待全清，不为招式或撞墙加奖励。击杀、拾取和钱包按同一可靠快照保存，不能回波初重发同一击杀。保存失败保持待结算冻结，使用原提交键重试，不重发掉落或解锁。

## 9. 可逃离几何核算及适用条件

以下是本稿数值的数学检查，不是实战、真人或设备验收。假设玩家速度220u/s、半径18u、无硬阻挡和减速，锁定后反应延迟暂按0.20秒，额外空间余量8u。0.20秒是待验证假设，不是测得的新手反应时间。

**直冲。** Boss攻击半宽42u，外扩玩家后需离开中心线60u；额外8u余量后，垂直横移68u即可。锁定到出手为`1.05−0.25=0.80s`，扣假设反应后可走`220×(0.80−0.20)=132u`。需要`68/220≈0.309s`，连同反应约0.509s，小于0.80s；空间余量64u，时间余量约0.291s。开火前已横移到线外，才不依赖直冲飞行时间。胶囊端帽也在这个60u外扩半径内。

**拱击。** 最保守情况是玩家在Boss中心。离开扇形外圆的玩家中心距离需超过`132+18=150u`；选择158u候选线留8u余量。前摇现为1.25秒，锁定仍为第0.15秒，因此锁定到出手`1.25−0.15=1.10s`，扣反应可走`220×(1.10−0.20)=198u`。`158/220≈0.718s`，连同反应约0.918s，小于1.10s；余约0.182s／40u。向外或垂直候选的终点都在外扩圆外，因此也是扇形外的充分条件；无需把100°扇形近似成错误的窄三角。增加的前摇只放宽静态逃离窗口，触控反应、动画辨识与真实边角走位仍待实测。

在中心距100u、处于扇形正前方时，还可绕侧：玩家圆离开50°径向边所需转角约`50°+asin(18/100)=60.37°`，等半径弧长约105.37u、移动约0.479s；这里未加8u余量。此算例解释侧走通常更短，但发起条件仍按158u保守直线候选检查，不把圆周走位能力强加给新手。

**初始空间。** 玩家距四条身体合法边界为927、927、1062、1062u；Boss在北区首选(33,870)时距四条身体合法边界为903、903、1968、108u。两者都在场内，首选中心距930u排除了直接开场冲；若换候选点，重新计算实际距离与可见性。Boss从距400u朝玩家冲满432u时中心可越过玩家原位32u，预警须如实显示越过部分。

**边角。** 上述“够走多少”不自动证明墙边安全，所以锁定时必须检查候选短线。直冲两条横移都出场，或拱击三个候选都出场／不可见，则取消，不声称玩家理应躲开。墙截短冲撞的收招仍为1.20秒。相机实际尺寸、HUD、角色碰撞变更、硬阻挡或移动减速都会使算例失效，届时先重算与验证，不靠增加伤害补难度。

## 10. 灰盒读取约定、检查与风险

灰盒只需要两个基础`attacks`条目；第二阶段读取`charge.phase2`，按两次独立蓄力与锁定播放，不另造参数不同的第三招。普通第一段的`recovery_s=0.90`，第二阶段最后一段用`final_recovery_s=1.20`，任一撞边优先用`boundary_recovery_s=1.20`；取消分支用取消规则。

| 状态 | 预览画法 | 有害判定 |
|---|---|---|
| 蓄力追踪 | 虚线胶囊／扇形、方向箭头随目标转 | 无 |
| 蓄力锁定 | 同一形状改实线，锁定标记，起点朝向不再改 | 无 |
| 直冲行动 | 移动身体圆＋当前tick扫掠，未来路线淡显 | 仅当前扫掠 |
| 拱击行动 | 冻结扇形实填 | 当前扇形，单次去重 |
| 收招 | 灰色身体与倒计时，移除有害区域 | 无 |
| 转场 | 身体咆哮占位，不画冲击波 | 无 |

预览须标明“设计预览”，可显示段号和模拟时间。不用缩短第二段预警表现“狂暴”；不画未授权毒、网、碎石弹；不把预览自动移动结果记作真人通过。

统一证据入口为主线程生成的 [verification.json](../../../design/tower-floor01-2026-10-27/verification.json)。JSON只记录报告路径与证据范围，不记录脱离命令的通过数量；报告须针对当前源文件重新生成，路径存在也不代表其中旧结果适用于本稿。未生成或未重跑时，以文末只读复核命令的实际输出为准，不宣称已完成整体验收。没有改动或运行正式游戏。

后续灰盒／运行时应覆盖，以下均为待验收项：

- 正面、侧面、贴身、四边四角，移动端窄视野／HUD遮挡，锁定前后目标横移、出画与相机改变。
- 普通＋普通允许，普通＋Boss或精英＋Boss拒绝；2点队首不会被新的1点请求饿死；收招不被杂兵偷打。
- 每一种状态跨半血与被击杀，首段撞边终止连段、第二段重新锁定、不足60u时取消第二段。
- 低帧率扫掠、扇形边缘擦碰、同一段多碰撞体、保护内接触、同tick互杀与最高伤害选择。
- 开场秒杀Boss、半血同tick死亡、重复触发、alive+reserved满池、落点失败退回pending、出生预警与显形后entry分别计时、剩一只离屏、玩家死亡、结算保存失败。
- 三种剑修路线在真实20波后的剩余HP、命中覆盖、Boss耗时与首通率；不能用13号静态44.08秒估计代替这些结果。

决策：保留两基础招式、半血双冲与有限支援；剔除首层远程蛛技、额外倍率与被动接触伤害；拱击已放宽到40u静态余量，仍需测试真实反应窗口、可见条件导致的取消频率，以及双冲持续占用预算使支援攻击过稀的可能性。当前证据只支撑规则可查与静态算例，不支持“真人平衡通过”。

## 11. 可复跑的只读静态复核

在项目根目录执行下列命令。它运行紧随其后的完整断言，只读两份设计JSON、原型表和本稿，不改文件、不生成主线程报告、不模拟游戏。若关卡JSON尚未同步Boss半径42，会明确打印`PENDING`，不能把那一项算作跨文件通过；主线程同步后重跑即可。

```sh
python3 - <<'PY'
from pathlib import Path
p = Path("docs/xianxia/sect-tower-v1/16-boar-boss-design.md")
code = p.read_text().split("<!-- floor01-boss-static-check -->\n```python\n", 1)[1].split("\n```", 1)[0]
exec(compile(code, str(p) + "#static-check", "exec"))
PY
```

<!-- floor01-boss-static-check -->
```python
from collections import Counter
from pathlib import Path
import json
import math

base = Path("docs/xianxia/sect-tower-v1")
doc = (base / "16-boar-boss-design.md").read_text()
load = lambda name: json.loads((base / "data" / name).read_text())
boss, encounter = load("floor01-boss.json"), load("floor01-encounters.json")
wave = next(w for w in encounter["waves"] if w["wave"] == 20)
batches = {b["id"]: b for b in wave["batches"]}
rules, support = encounter["spawn_rules"], boss["support"]
attacks = {a["id"]: a for a in boss["attacks"]}
charge, gore = attacks["charge"], attacks["gore"]
prototype = next(a for a in load("rank-attributes.json")["archetypes"] if a["id"] == boss["id"])
for key in ("id", "name", "rank", "hp", "damage", "move_speed"):
    assert boss[key] == prototype[key] == encounter["enemies"]["boar_boss"][key], key
assert boss["body_radius"] == 42 and charge["width"] == 84
assert boss["arena"]["player_start"] == encounter["arena"]["player_start"]
north = next(p for p in encounter["arena"]["portals"] if p["id"] == "N")
assert boss["arena"]["boss_start"] == north["candidates"][0] == {"x": 33, "y": 870}
assert boss["preview"]["attack_demo_origin"] == {"x": 33, "y": 260}
assert boss["preview"]["attack_demo_origin_is_spawn_position"] is False
assert support["spawn_minimum_center_distance_from_player"] == rules["min_player_distance"] == 280
assert support["spawn_minimum_center_spacing"] == rules["min_center_spacing"] == 92
assert support["spawn_body_gap"] == rules["body_gap"] == 16
assert support["new_actor_attack_delay_s"] == rules["spawn_grace_s"] == 0.8
assert support["changed_spawn_position_restarts_full_warning"] is True
assert support["spawn_markers_consume_entity_capacity"] == rules["reservation_counts_toward_cap"] is True
assert boss["scheduler"]["concurrent_entity_cap"] == wave["concurrent_cap"] == rules["cap"] == 24
assert boss["scheduler"]["entity_cap_rule"] == support["entity_cap_rule"] == "alive+reserved<=24"
assert support["ledger_states"] == ["pending", "reserved", "alive", "killed"]
assert support["register_all_instances_as_pending_at_wave_start"] is True
assert support["ledger_invariant"] == "planned_required=pending+reserved+alive+killed"
assert "reserved_equals_0" in boss["clear"]["all_required"]
assert "all_referenced_support_encounter_batches_released" in boss["clear"]["all_required"]
assert support["spawn_emit_index_base"] == 0
assert support["spawn_reserved_portals"] == wave["reserved_portals"] == ["S", "SW"]
assert support["spawn_instance_id"] == "unit_id_from_floor01_encounters_batch_unit_ids"
assert support["optional_spawn_instance_prefix"] == "wave_instance/unit_id"
assert support["batch_release_idempotency_key"] == "wave_instance/encounter_batch_id"
used_batches, all_unit_ids, totals = [], [], Counter()
for group in support["batches"]:
    composition = Counter()
    for batch_id in group["encounter_batch_ids"]:
        batch = batches[batch_id]
        assert batch["trigger"] == ("wave_start" if group["id"] == "opening" else "boss_half_hp_or_death")
        assert batch["warning_s"] == support["spawn_warning_s"] == 0.9
        assert batch["emit_step_s"] == support["spawn_emit_step_s"] == 0.22
        assert len(batch["unit_ids"]) == batch["count"]
        assert all(unit_id in doc for unit_id in batch["unit_ids"])
        used_batches.append(batch_id)
        all_unit_ids.extend(batch["unit_ids"])
        composition[batch["archetype"]] += batch["count"]
    assert dict(composition) == group["composition"] == {"boar_normal": 2, "wolf_normal": 1, "spider_normal": 1}
    assert sum(composition.values()) == group["count"] == 4
    totals.update(composition)
assert dict(totals) == support["composition"] == {"boar_normal": 4, "wolf_normal": 2, "spider_normal": 2}
assert len(all_unit_ids) == len(set(all_unit_ids)) == support["total"] == 8
boss_spawn = support["boss_spawn"]
boss_batch = batches[boss_spawn["encounter_batch_id"]]
assert boss_batch["unit_ids"] == [boss_spawn["unit_id"]] == ["f01w20b01u01"]
assert boss_batch["warning_s"] == boss_spawn["warning_s"] == 1.2
assert boss_batch["portal"] == boss_spawn["preferred_portal"] == "N"
assert len(used_batches) == len(set(used_batches)) == 6
assert set(used_batches + [boss_batch["id"]]) == set(batches)
assert len(all_unit_ids) + len(boss_batch["unit_ids"]) == support["planned_required"] == wave["planned_required"] == 9
entry = next(p for p in boss["phases"] if p["id"] == "entry")
assert entry["starts_at"] == "boss_actual_materialization"
assert entry["duration_s"] == boss_spawn["entry_s"] == 1.2
assert entry["spawn_warning_counts_toward_entry"] is False
assert entry["overlaps_spawn_grace_s"] == boss_spawn["spawn_grace_s"] == 0.8
assert boss_spawn["entry_starts_at"] == "actual_materialization" and boss_spawn["entry_overlaps_spawn_grace"] is True
for name, attack in attacks.items():
    row = next(line for line in doc.splitlines() if line.startswith("| " + name + "／"))
    cells = [cell.strip() for cell in row.strip("|").split("|")]
    assert cells[1] == attack["shape"]
    for i, key in ((2, "windup_s"), (3, "target_lock_s"), (4, "active_s"), (5, "recovery_s"), (6, "cooldown_s"), (7, "range"), (9, "damage")):
        assert math.isclose(float(cells[i]), attack[key]), (name, key)
assert gore["windup_s"] == 1.25 and gore["target_lock_s"] == 0.15
assert gore["radius"] == 132 and gore["angle_deg"] == 100 and gore["damage"] == 12
player = boss["player_reference"]
escape = gore["radius"] + player["body_radius"] + player["escape_safety_margin"]
available = player["move_speed"] * (gore["windup_s"] - gore["target_lock_s"] - player["assumed_reaction_delay_s"])
assert escape == gore["escape_probe_distance"] == 158
assert math.isclose(available, 198) and math.isclose(available - escape, 40)
assert math.isclose(sum(gore[k] for k in ("windup_s", "active_s", "recovery_s", "cooldown_s")), 4.63)
assert math.isclose(charge["range"], charge["dash_speed"] * charge["active_s"])
assert math.isclose(2 * (charge["windup_s"] + charge["active_s"]) + charge["phase2"]["between_segments_recovery_s"] + charge["phase2"]["final_recovery_s"], 5.4)
for actor, radius in (("player", player["body_radius"]), ("boss", boss["body_radius"])):
    bounds, inset = boss["arena"]["bounds"], boss["arena"][actor + "_center_bounds"]
    for axis in "xy":
        assert inset[axis + "min"] == bounds[axis + "min"] + radius
        assert inset[axis + "max"] == bounds[axis + "max"] - radius
        assert inset[axis + "min"] <= boss["arena"][actor + "_start"][axis] <= inset[axis + "max"]
report = (base / "data" / boss["verification"]["report"]).resolve()
assert report == Path("design/tower-floor01-2026-10-27/verification.json").resolve()
assert "static_consistency_checks_passed" not in boss["verification"]
print("PASS: spawn warning/grace/spacing, reserved ledger/cap/clear, source unit IDs and entry clock.")
print("PASS: boss radius 42 / charge width 84; preferred spawn (33,870); demo origin (33,260).")
print("PASS: attack table matches JSON; gore escape 158u / available 198u / margin 40u; earliest repeat 4.63s.")
external_radius = encounter["enemies"]["boar_boss"]["body_radius"]
print("PASS: encounter boss radius also 42." if external_radius == 42 else f"PENDING: encounter boss radius is {external_radius}; main thread must sync to 42.")
print(f"REPORT: {report}; exists={report.exists()}; this command does not generate or certify that report.")
print("UNVERIFIED: runtime, camera/HUD, touch input and human balance.")
```

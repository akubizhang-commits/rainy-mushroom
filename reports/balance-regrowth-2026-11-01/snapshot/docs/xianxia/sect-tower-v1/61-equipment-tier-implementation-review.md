# 八阶装备改造：现有实现复核

> 历史复核：下文记录改造前问题，不表示当前源码仍保持旧实现。当前四阶已按[62号数值表](62-equipment-tier-balance-review.md)完成开发，验证与剩余范围见[63号](63-equipment-tier-delivery.md)。

日期：2026-10-30。范围：当前工作区源码、现行需求及装备相关测试。**本次修改文档，不修改运行时代码。** 工作区已有大量其他未提交修改，本复核不回滚或覆盖它们。

目标需求见[60号](60-equipment-tier-requirements.md)。以下P1/P2表示改造优先级；旧两阶实现不满足新八阶并不等于旧功能本身全部有缺陷。

## P1：八阶缺少数据基础，不能仅替换展示名

证据：[TowerWeapons.js](../../../js/xianxia/TowerWeapons.js) 的 `rows`、`WEAPON_BASE_ATTACK`、`WEAPON_AFFIX_RANGES` 仅有huang/xuan；[TowerEquipment.js](../../../js/xianxia/TowerEquipment.js) 的目录按前四组黄阶、后四组玄阶生成，`rollEquipment` 也只接受两阶。

当前目录共有24把武器（含初始铁剑），防具25件、戒指25件（各含初始件）；大阶和品质固定属于物品定义，不能在实例上任意改tier，否则严格校验失败。炼器菜单出现的地／天／仙只是锁定展示，不是可生成装备。

调整：建立统一八阶配置；先编制当前四阶逐物品映射与三部位词条表，再改生成器与严格校验。后四阶只登记，不开放。初始物品的不可分解保护需从旧特殊tier拆出。特殊标签、本命进度目前没有实例字段，直接添加会被 `exactKeys`／`exact` 校验拒绝。

## P1：境界限制分散，容易出现入口可用但实际拒绝或反向绕过

证据：[TowerCampaign.js](../../../js/xianxia/TowerCampaign.js) 的 `validLoadout`、`_drawForge`、`_draw`、`_drawEquipment` 和装备操作均有xuan/Lv.19条件；[TowerInventory.js](../../../js/xianxia/TowerInventory.js) 的 `inventoryQuote`、详情中的requirement和requirementMet，以及[TowerMenu.ts](../../../cocos-pilot/assets/scripts/TowerMenu.ts) 的 `forgeBlock` 和默认阶位也重复了这一条件。

当前金丹前都使用黄阶，金丹解锁玄阶；没有“炼气凡→法、筑基法→宝、金丹宝→灵”的转换。仅改UI名称或开放按钮无法实现新规则。

调整：用共享配置查询最低境界，统一获取、装备、配装校验和展示；验证所有三部位及直接设置配装的边界。保留合法的低阶持有与使用建议，不在升级时自动替换物品。具体小阶段门槛先按60号待定项冻结。

## P1：35%装备预算在文档与代码之间存在实质冲突

证据：44号要求以同修为／技能铁剑角色为基线，最高组合35%；52号仍写无进阶装备基线。当前 `WEAPON_BASE_ATTACK` 已为初始5、黄阶15/30/45/75、玄阶260/330/430/550，59号记载了玄阶调高。

[equipment-budget测试](../../../tests/xianxia-tower-equipment-budget.test.mjs) 和[doc52装备测试](../../../tests/xianxia-tower-equipment-doc52.test.mjs) 在预算上另外乘入固定武器基础攻击项，例如：

`(1 + 武器词条份额) × (1 + 戒指份额) × (1 + 武器基础攻击 / 角色参考攻击)`

因此测试通过只能证明“现有测试定义的预算”成立，不能证明相对铁剑／无进阶装备的总增伤≤35%。仅以金丹初期角色攻击约624.378、玄极基础550、铁剑5计算，**不计任何随机词条**，攻击基数比已是 `(624.378+550)/(624.378+5)≈1.866`。该例证明固定基础项就可能超出旧总预算；不冒充完整构筑DPS实测。

调整：在铺开四阶之前先统一总预算的基线、固定基础是否包含、冷却和养成是否包含。当前未获授权放宽原35%规则；如保留现有固定攻击为独立成长轴，必须明确作为待确认的预算变更。禁止先把玄阶550提前给筑基宝器，再以改名解释平衡。

验收：同境界／同技能／同敌人，分别报告无进阶装备基线、固定攻击收益、词条收益、组合真实DPS。新测试须独立计算需求上限，不能复制实现公式后宣称验证了旧上限。

## P1：古宝掉落和本命养成尚无完整业务链

证据：当前装备由Campaign炼制生成；[TowerLoot.js](../../../js/xianxia/TowerLoot.js) 实现妖丹／灵石类掉落，不生成带古宝标签的装备实例。武器和防具实例校验仅接受现有固定字段，`refine`只允许0；当前没有本命绑定、材料消耗、升阶或玄天宝能力合同。

调整：特殊标签先做独立数据维度；本命另做绑定和有上限养成事务，不复活旧强化字段。古宝获取需接入战斗／结算奖励ID、存档重载、满仓处理与幂等校验；满仓不得扣奖励标记后丢失物品。仿灵宝按承载等级控制预算；玄天宝内容待设计，不伪造完成。

## P2：颜色结构可复用，但五阶布局和多处映射需一起替换

证据：[TowerInventoryPanel.ts](../../../cocos-pilot/assets/scripts/TowerInventoryPanel.ts) 的 `tierColor` 已按大阶设置色相，`qualityFrame` 通过亮度／装饰区分品质。它不是纯粹按品质定颜色，可继续使用这一分工。

[TowerMenu.ts](../../../cocos-pilot/assets/scripts/TowerMenu.ts) 的炼器阶位按钮仍是黄／玄／地／天／仙五项，类型声明只接受huang/xuan；结果页有xuan二选一显示名，旧配装页也有独立颜色表。[TowerInventory.js](../../../js/xianxia/TowerInventory.js) 的 `tierOrder` 只排初始、黄、玄。

调整：所有入口从八阶配置读取名称、排序、色彩及开放状态。窄横屏改为可滚动或分组阶位栏，不直接在原五格宽度塞八个长名称。凡器白色需深边，神器彩／幻金需静态可读降级；文本始终显示阶名。八色覆盖三部位、炼器结果、背包、详情、配装，不依赖某一页映射。

## P2：旧装备合同已落后于实际炼器、防具和戒指实现

证据：

| 旧文档 | 当前源码行为 | 改造时处理 |
|---|---|---|
| 31／44号：三个独立玩家炼制入口，防具／戒指80＋40 | `TowerMenu`调用`drawForge`：武器池／防具池；防具池2/3出防具、1/3出戒指；`forgeCost(1)=100+100`，十连900+900 | 新等级接入现行玩家入口，不能按旧文档回退 |
| 44号：防具不加最大生命，戒指仅暴击伤害第二词条 | `ARMOR_AFFIX_RANGES`有hpBonus；中品起戒指可用cooldownReduction替代critBonus，52号已承接 | 保留后续已实现职责，更新范围而非删字段 |
| 44号：铁剑＋3 | 当前铁剑基础＋5 | 不按旧说明改回3 |
| 44号：支持锁定保护 | 当前实例locked为退役序列化字段；48号已明确移除锁定，Campaign分解不据此阻止 | 遵循48号最新规则；本命保护应显式建立，不能依赖该旧字段 |

`TowerCrafting`仍保留三类旧直接接口费用，Campaign也保留直接抽取操作；这与玩家当前统一入口要分别描述。软概率按物品类别分别累计、跨旧大阶共享。扩为四阶且保持同价时可沿用；若以后分阶定价，49号的共享计数风险需要重新评审。

## P2：存档和Cocos共享副本必须与目录同步

证据：当前[TowerCampaign.js](../../../js/xianxia/TowerCampaign.js) 的schema为15，[TowerProfile.js](../../../js/xianxia/TowerProfile.js) 的独立profile格式schema为1。不是44号记录的schema6。实例严格核对定义ID、tier、quality、词条和字段集合；[Cocos共享目录](../../../cocos-pilot/assets/scripts/shared/js/xianxia) 承载游戏实际导入副本。

调整：按实际修改当时的版本升级Campaign格式，必要时连同战斗快照校验更新。项目已允许重置不兼容旧档，只作用于对应模式；不得因为没有迁移任务而略过当前合法档恢复、陈旧写入、保存失败回滚和重复结算验证。执行共享同步并验证构建，不能只改js源目录而让客户端仍跑旧配置。

## 实施顺序与可保留内容

1. 先确定60号待定的四阶小阶段门槛、逐物品映射与总预算口径。当前27级范围需四阶，不扩塔层或角色境界。
2. 落地共享等级配置、目录／实例校验、初始物品标记、四阶数值；同一批更新生成池和所有门槛。
3. 更新炼器、背包、结果、配装与详情；同步Cocos共享代码、存档格式、测试和需求表。
4. 在已稳定的四阶基础上独立制作本命养成与古宝掉落闭环；后四阶等相应境界内容开放再配置数值。

保留现有三装备槽、独立实例库存、240格容量、配置引用保护、品质软概率机制、事务草稿与保存失败回滚结构、战斗装备快照、暴击／会心与受击回复机制、已有可复用图标。保留机制不代表照搬全部参数。

## 本轮验证

执行9个测试文件，共154项：**148通过、6失败，当前测试集未全绿。** 原始输出见[测试日志](../reports/equipment-tier-review-2026-10-30-tests.log)。

```sh
node --test tests/xianxia-tower-weapons.test.mjs tests/xianxia-tower-equipment.test.mjs tests/xianxia-tower-equipment-budget.test.mjs tests/xianxia-tower-equipment-doc52.test.mjs tests/xianxia-tower-doc52-tier-gate.test.mjs tests/xianxia-tower-equipment-campaign.test.mjs tests/xianxia-tower-inventory.test.mjs tests/xianxia-tower-forge-ui.test.mjs tests/xianxia-tower-balance-optimization.test.mjs
```

6项均位于 `xianxia-tower-inventory.test.mjs`，失败发生在UI节点查找阶段：

| 失败项 | 数量 | 源码核对 |
|---|---|---|
| 导航用例直接在home查找“打开背包” | 1 | 当前home默认走庭院并提前return；该旧按钮位于home详情页 |
| 购药用例进入pills后直接查找购买按钮 | 2 | 当前必须先点击“丹炉”打开`apothecaryOverlay`，测试缺少这一步 |
| 钱包用例要求home始终有“货币信息”节点 | 3 | home庭院提前return，未执行后续`wallet()`；测试的页面结构假设已过时 |

这些失败是当前测试与页面流程不一致的证据，不能据此断言真实玩家无法购药或打开背包，也不能当成已通过。后续应更新场景交互测试，再做浏览器核验；本次未改测试去掩盖失败。

另以模块导入核对目录数量为24/25/25。通过的测试只覆盖现有两阶实现，不能作为八阶验收。本轮未改代码、未启动Cocos构建或浏览器验收，也未做真机性能测试。

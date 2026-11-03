# UI 全面审查 · 待确认清单

**本轮只审查，未修改游戏实现、素材或真实存档。** 建议共30项：A类6项优先解决可读性/操作问题，B类18项统一现有界面，C类6项为可选优化。所有建议待用户按编号确认后实施。

**范围与证据**

- 采集现有浏览器预览的844×390、1280×720两种横屏，共43种有效页面/状态、86张截图；三轮采集均无页面脚本错误。采集使用隔离浏览器和临时测试数据，部分弹窗以临时展示状态打开，不代表完成了真实支付、领奖或失败恢复测试。
- 当前源码与现有预览并行检查；本轮没有重新构建，因此正在其他聊天修改、尚未构建的部分以源码审查结论为准。未声称全量业务测试通过。
- 已检查：宗门及各峰庭院、锁妖塔选层、山门、背包/材料/装备详情/出售、角色属性、商店/购买/炼制/确认/成品/获得物品、藏经阁房间/目录/阅读、技能、配装、演武、6步指引、设置、机缘/概率、战斗HUD/暂停、保存失败外观、开发工具首页。
- 结算与材料提示结合前轮三尺寸实机截图及本轮代码审查；加载重试、Boss/狂暴特殊HUD、突破多物品/成功/失败、库存溢出、离线/真实存储故障等仅检查相关实现，未逐一真实触发。720p桌面与浏览器触控模拟不能代替微信设备、刘海安全区和真手指验收。
- 适用规范：[game-ui-design validations](/Users/zhangnu/.codex/skills/game-ui-design/references/validations.md)、[sharp_edges](/Users/zhangnu/.codex/skills/game-ui-design/references/sharp_edges.md)。按横屏手游调整适用范围，未把电视安全区、手柄适配作为当前必改项。
- 控件尺寸为设计值按844/1280≈0.66折算的近似显示值，尚未量测具体设备物理尺寸；JSON采集中的font/width/height保存原始场景尺度，用于定位，不能直接当成最终手机字号。对比度由源码色值按相对亮度计算。
- [manifest.json](/Users/zhangnu/WeChatProjects/rainy-mushroom/reports/ui-audit-review/manifest.json)记录源码哈希、有效截图和排除的误导航截图；首次skills/mixed-draw误回宗门的截图已排除，使用actual版本。

**已确认的规则继续保留**

横屏；物品格沿用背包灰绿色；物品静态图复用现有透明素材；详情图标无白色底板；物品名称左对齐且不重复；基础攻击不显示平均值；背包/结算角标去×、超过99显示99，真实数量不变；新物品红点左上；结算8列且窄窗口；材料掉落提示无底板并有可读性描边。不会建议把数量改成99+或重新生成全部静态素材。

**A类 · 优先处理**

| 编号 | 问题与影响 | 建议 | 证据 |
|---|---|---|---|
| A01 | **数字与单位被拆行**。背包装备详情把“30%”拆成上一行“3”、下一行“0%”，会直接干扰属性阅读。 | 数字、百分号、单位作为整体换行；同类属性统一格式，不再逐字符强行拆分。 | 截图确认；[源码](/Users/zhangnu/WeChatProjects/rainy-mushroom/cocos-pilot/assets/scripts/TowerMenu.ts:537)；[截图](/Users/zhangnu/WeChatProjects/rainy-mushroom/reports/ui-audit-review/equipped-weapon-844.png) |
| A02 | **手机横屏点击区域偏小**。844 宽屏按约 0.66 缩放后，暂停按钮约 32×29；购买加减约 40×37；部分筛选按钮高约 38。 | 统一按最终显示尺寸检查命中区，关键按钮目标至少约 44–48；视觉可保持现状，避免扩大命中区后互相重叠。 | 截图＋代码；[源码](/Users/zhangnu/WeChatProjects/rainy-mushroom/cocos-pilot/assets/scripts/TowerView.ts:545)；[截图](/Users/zhangnu/WeChatProjects/rainy-mushroom/reports/ui-audit-review/battle-844.png) |
| A03 | **小字层级偏小、跨页不一致**。背包数量使用16设计单位、技能等级18、部分说明17–20；在844横屏约为11–13，阅读吃力。 | 制定标题、正文、辅助字、角标四档；先提高关键数量和状态文字，手机尺寸单独验收。 | 截图＋代码；[源码](/Users/zhangnu/WeChatProjects/rainy-mushroom/cocos-pilot/assets/scripts/TowerInventoryPanel.ts:296)；[截图](/Users/zhangnu/WeChatProjects/rainy-mushroom/reports/ui-audit-review/skills-actual-844.png) |
| A04 | **金额等金色文字对比偏弱**。旧金色 #9A7744 配物品灰绿底约3.19:1、配纸白底约3.91:1；小金额文字尤其弱。 | 价格和核心数值用更深的金棕或墨色，装饰金保留；以普通小字4.5:1为审查目标。 | 代码颜色计算＋截图；[源码](/Users/zhangnu/WeChatProjects/rainy-mushroom/cocos-pilot/assets/scripts/TowerMenu.ts:46)；[截图](/Users/zhangnu/WeChatProjects/rainy-mushroom/reports/ui-audit-review/forge-shop-844.png) |
| A05 | **通用弹窗缺少长内容兜底**。普通 showModal 使用固定正文区，没有滚动；高度封顶后仍扣多行按钮高度。突破物品增多、错误说明加长时有挤压风险。 | 正文独立滚动、操作区固定；为多物品突破、长错误、短横屏分别规定最小正文高度。 | 代码确认；极端长度待复现；[源码](/Users/zhangnu/WeChatProjects/rainy-mushroom/cocos-pilot/assets/scripts/TowerView.ts:685)；[截图](/Users/zhangnu/WeChatProjects/rainy-mushroom/reports/ui-audit-review/save-error-844.png) |
| A06 | **结算重要入账汇总埋在物品下方**。收获达到三排时，修为、灵石、贡献位于滚动内容底部，第一眼只能看见材料。 | 在标题下固定一行实际入账汇总；8列物品列表独立滚动，溢出说明放列表尾部。 | 前轮结算截图＋本轮代码；[源码](/Users/zhangnu/WeChatProjects/rainy-mushroom/cocos-pilot/assets/scripts/TowerMenu.ts:1761)；[结算截图](/Users/zhangnu/WeChatProjects/rainy-mushroom/reports/settlement-grid-2026-11-02/harvest-844.png) |

**B类 · 统一现有界面**

| 编号 | 问题与影响 | 建议 | 证据 |
|---|---|---|---|
| B01 | **材料图标仍有缺口**。灵玉、铁精、寒晶砂、赤铜精及部分高阶材料用文字占位，与已经有图的材料混排。 | 列出原稿、透明图、运行图、接入四类缺口，优先复用已有素材；静态新图只提供制图prompt，待用户出图验收。 | 截图＋资源目录；[源码](/Users/zhangnu/WeChatProjects/rainy-mushroom/cocos-pilot/assets/scripts/TowerMenu.ts:496)；[截图](/Users/zhangnu/WeChatProjects/rainy-mushroom/reports/ui-audit-review/inventory-844.png) |
| B02 | **获得物品弹窗仍是另一套列表**。购买/炼制成功使用4列、名称×数量；通关收获和背包已用8列角标格子。 | 复用同一物品格组件；少量奖励紧凑居中，多物品按约定8列；点击查看完整数量。 | 截图＋代码；[源码](/Users/zhangnu/WeChatProjects/rainy-mushroom/cocos-pilot/assets/scripts/TowerMenu.ts:1966)；[截图](/Users/zhangnu/WeChatProjects/rainy-mushroom/reports/ui-audit-review/commerce-result-844.png) |
| B03 | **成品详情与背包属性结构不同**。成品详情没有统一图标标题、基础信息、词条与说明分区，多件候选装备直接串成长文。 | 统一物品详情结构；候选成品以可选图标切换，单次阅读一件装备，保持现有全部属性。 | 截图＋代码；[源码](/Users/zhangnu/WeChatProjects/rainy-mushroom/cocos-pilot/assets/scripts/TowerMenu.ts:1980)；[截图](/Users/zhangnu/WeChatProjects/rainy-mushroom/reports/ui-audit-review/forge-detail-844.png) |
| B04 | **短内容弹窗过大**。回春丹购买/成品详情只占上半部，仍使用固定大高度，留白明显。 | 沿用现有分栏规则，按内容量设紧凑、标准两档高度；长内容继续滚动，不缩字。 | 截图确认；[源码](/Users/zhangnu/WeChatProjects/rainy-mushroom/cocos-pilot/assets/scripts/TowerMenu.ts:1958)；[截图](/Users/zhangnu/WeChatProjects/rainy-mushroom/reports/ui-audit-review/pills-purchase-844.png) |
| B05 | **同类弹窗标题布局不同**。设置、角色、出售标题偏左；购买、成品、结算居中，标题留白与分隔线位置也各异。 | 先确认统一模板：建议功能对话框标题左对齐；通关等结果标题可独立居中，其余边距与关闭位置一致。 | 截图确认；风格决策；[源码](/Users/zhangnu/WeChatProjects/rainy-mushroom/cocos-pilot/assets/scripts/TowerMenu.ts:855)；[截图](/Users/zhangnu/WeChatProjects/rainy-mushroom/reports/ui-audit-review/material-sale-844.png) |
| B06 | **主按钮语义与位置缺少统一规则**。购买确认在右侧深绿；结算返回宗门在左侧深绿、继续下一层为次按钮；暂停又突出继续。 | 按操作目的统一：继续/确认通常作为主操作，退出/取消为次操作；具体结算默认主操作需用户确认。 | 代码＋前轮结算截图；风格决策；[源码](/Users/zhangnu/WeChatProjects/rainy-mushroom/cocos-pilot/assets/scripts/TowerView.ts:319)；[结算截图](/Users/zhangnu/WeChatProjects/rainy-mushroom/reports/settlement-grid-2026-11-02/harvest-844.png) |
| B07 | **数量调节器尺寸和样式不同**。购买使用紧凑方角按钮；出售使用更圆的小按钮，间距与数量的位置不同。 | 共用数量调节器，统一减、数值、加、最大顺序与禁用态；保留各业务购买/出售上限。 | 截图＋代码；[源码](/Users/zhangnu/WeChatProjects/rainy-mushroom/cocos-pilot/assets/scripts/TowerMenu.ts:1837)；[截图](/Users/zhangnu/WeChatProjects/rainy-mushroom/reports/ui-audit-review/material-sale-844.png) |
| B08 | **数量变化会重建详情滚动区**。购买加减触发整页重绘，commerceScroll 没有保存偏移；长属性阅读位置会回到开头。 | 更改数量只更新报价与按钮状态，或保存并恢复滚动偏移；切换物品时才回顶。 | 代码确认；长内容交互待复现；[源码](/Users/zhangnu/WeChatProjects/rainy-mushroom/cocos-pilot/assets/scripts/TowerMenu.ts:1839)；[截图](/Users/zhangnu/WeChatProjects/rainy-mushroom/reports/ui-audit-review/forge-purchase-844.png) |
| B09 | **“精通”与0级状态混用**。未学习的心法节点同时显示“精通”和0级；源码按passive种类显示精通，未按学习状态区分。 | 若表示类别，改为“心法/被动”；若表示进度，只在满足条件时显示精通。 | 截图＋代码；术语需确认；[源码](/Users/zhangnu/WeChatProjects/rainy-mushroom/cocos-pilot/assets/scripts/TowerMenu.ts:1392)；[截图](/Users/zhangnu/WeChatProjects/rainy-mushroom/reports/ui-audit-review/skills-actual-844.png) |
| B10 | **技能详情密集、升级收益难扫读**。一段文字混合范围、成长节点、伤害公式、限制与运行机制；效果区需要长滚动。 | 分为当前效果、下级变化、解锁节点、详细规则；首屏突出玩家本次加点会得到什么。 | 截图确认；[源码](/Users/zhangnu/WeChatProjects/rainy-mushroom/cocos-pilot/assets/scripts/TowerMenu.ts:1118)；[截图](/Users/zhangnu/WeChatProjects/rainy-mushroom/reports/ui-audit-review/skills-actual-844.png) |
| B11 | **红点位置仍有遗漏**。背包新物品已改左上，战斗技能点提示仍在右上，颜色也不同。 | 明确全局提示角标规则，技能点红点也按左上布局验收；等级数字角标保持独立。 | 代码＋截图；[源码](/Users/zhangnu/WeChatProjects/rainy-mushroom/cocos-pilot/assets/scripts/TowerView.ts:558)；[截图](/Users/zhangnu/WeChatProjects/rainy-mushroom/reports/ui-audit-review/battle-844.png) |
| B12 | **境界精度不一致**。角色页写“炼气 四层”，HUD写“炼气·中期”，装备要求写“炼气初期”，缺少两者对应关系。 | 允许概览与详情不同精度，但用一套格式；角色详情显示层数＋阶段，需求文案用同一套术语。 | 截图确认；文案决策；[源码](/Users/zhangnu/WeChatProjects/rainy-mushroom/cocos-pilot/assets/scripts/TowerMenu.ts:715)；[截图](/Users/zhangnu/WeChatProjects/rainy-mushroom/reports/ui-audit-review/character-844.png) |
| B13 | **灵石数量表达方式多套并存**。HUD是分品阶图标×数量，交易用格式化文字或“灵石”，出售明确“下品灵石”，教程也混用总价。 | 统一单位顺序和空格规则；支付金额、钱包总值与各品阶持有量明确区分，金额保持完整真实值。 | 截图＋代码；[源码](/Users/zhangnu/WeChatProjects/rainy-mushroom/cocos-pilot/assets/scripts/TowerMenu.ts:1833)；[截图](/Users/zhangnu/WeChatProjects/rainy-mushroom/reports/ui-audit-review/forge-shop-844.png) |
| B14 | **教程仍解释旧抽奖付费方式**。指引第3步讲100下品灵石＋100贡献、十连900；当前机缘页面使用抽奖券，炼制按配方材料扣除。 | 重新核对教程、山门、资源用途、藏经阁中的现行入口和成本说明，文案从业务数据生成或关联。 | 截图＋代码；[源码](/Users/zhangnu/WeChatProjects/rainy-mushroom/cocos-pilot/assets/scripts/TowerMenu.ts:2647)；[截图](/Users/zhangnu/WeChatProjects/rainy-mushroom/reports/ui-audit-review/tutorial-3-844.png) |
| B15 | **配装页面首屏层级浪费**。洞府整备首屏主要是大标题、说明与已选用按钮，实际装备被推到下方；背包已有更直观的角色装备区。 | 配装切换与三件装备优先展示；说明折叠，统一装备卡结构和“出战”状态。 | 截图确认；[源码](/Users/zhangnu/WeChatProjects/rainy-mushroom/cocos-pilot/assets/scripts/TowerMenu.ts:2514)；[截图](/Users/zhangnu/WeChatProjects/rainy-mushroom/reports/ui-audit-review/loadouts-844.png) |
| B16 | **材料提示称谓错误**。掉落提示统一写“药材”，实际包含灵玉、矿砂、兽皮等炼器材料。 | 统一写“材料”；丹药配方等需要细分类别的场合再使用“药材/炼器材料”。 | 代码＋前轮实机提示截图；[源码](/Users/zhangnu/WeChatProjects/rainy-mushroom/cocos-pilot/assets/scripts/TowerView.ts:680)；[掉落提示](/Users/zhangnu/WeChatProjects/rainy-mushroom/reports/settlement-grid-2026-11-02/material-notice-844.png) |
| B17 | **抽奖心愿仍用纯文字按钮**。选心愿装备是一组文字按钮，没有与商店、背包一致的装备图标和品质呈现。 | 心愿区用物品格与选中标记；保留物品名、保底状态及清空计数提醒。 | 截图确认；[源码](/Users/zhangnu/WeChatProjects/rainy-mushroom/cocos-pilot/assets/scripts/TowerMenu.ts:1715)；[截图](/Users/zhangnu/WeChatProjects/rainy-mushroom/reports/ui-audit-review/mixed-draw-actual-844.png) |
| B18 | **最近战报仍保留旧长文收获**。主峰详情的最近战报仍将材料串成姓名×数量列表，与新的图标结算不一致。 | 复用结算收获展示，首页战报只显示结果摘要和查看详情入口。 | 代码确认；本轮无历史战报数据；[源码](/Users/zhangnu/WeChatProjects/rainy-mushroom/cocos-pilot/assets/scripts/TowerMenu.ts:2541)；[截图](/Users/zhangnu/WeChatProjects/rainy-mushroom/reports/ui-audit-review/home-details-844.png) |

**C类 · 可选优化**

| 编号 | 问题与影响 | 建议 | 证据 |
|---|---|---|---|
| C01 | **纯图标导航发现成本高**。背包分类大多只有图标；宗门右上宝箱和底部书/包也缺少固定说明。 | 保留现有图标，补首次提示、按住说明或短标签，确认具体交互后再做。 | 截图确认；可选优化；[源码](/Users/zhangnu/WeChatProjects/rainy-mushroom/cocos-pilot/assets/scripts/TowerInventoryPanel.ts:104)；[截图](/Users/zhangnu/WeChatProjects/rainy-mushroom/reports/ui-audit-review/inventory-844.png) |
| C02 | **界面配色需要按用途归档**。物品格灰绿、详情灰绿、确认纸白、目录书页、选中与禁用色分散在多套常量里。 | 建立物品格、详情、普通弹窗、书页、选中、禁用六类色板；同类统一，书页保留阅读风格。 | 代码＋截图；风格决策；[源码](/Users/zhangnu/WeChatProjects/rainy-mushroom/cocos-pilot/assets/scripts/TowerInventoryPanel.ts:6)；[截图](/Users/zhangnu/WeChatProjects/rainy-mushroom/reports/ui-audit-review/library-reader-844.png) |
| C03 | **场景入口文字在亮雾处偏淡**。宗门未开放峰名、部分庭院入口文字叠在亮天光/薄雾上，小横屏识别弱。 | 保持场景美术，局部增强文字描边或阴影；未开放状态用明确短标签，避免只靠颜色。 | 截图确认；需补亮暗场景真机验证；[源码](/Users/zhangnu/WeChatProjects/rainy-mushroom/cocos-pilot/assets/scripts/TowerMenu.ts:2037)；[截图](/Users/zhangnu/WeChatProjects/rainy-mushroom/reports/ui-audit-review/hall-844.png) |
| C04 | **设置缺少玩家常用调节**。当前设置主要为操作指引与开发工具，没有字号、声音、减少动态效果等玩家选项。 | 确认项目需要后，先增加音效/音乐控制、字号或HUD大小、减少震动效果；开发入口沿用开发阶段策略。 | 代码＋截图；新增功能需批准；[源码](/Users/zhangnu/WeChatProjects/rainy-mushroom/cocos-pilot/assets/scripts/TowerMenu.ts:851)；[截图](/Users/zhangnu/WeChatProjects/rainy-mushroom/reports/ui-audit-review/settings-844.png) |
| C05 | **键盘导航覆盖不一致**。藏经阁有焦点与方向导航；背包、商店及多数弹窗主要依赖点击。 | 若保留桌面键盘玩法，再统一Esc、方向选择、确认和可见焦点；不把手柄/电视规范强加到当前横屏手游。 | 代码确认；平台范围需批准；[源码](/Users/zhangnu/WeChatProjects/rainy-mushroom/cocos-pilot/assets/scripts/TowerLibraryPanel.ts:49)；[截图](/Users/zhangnu/WeChatProjects/rainy-mushroom/reports/ui-audit-review/library-catalog-844.png) |
| C06 | **已确认规范缺少集中组件约束**。此前底色、数量角标、标题与红点分别修复，多个界面仍有独立实现。 | 确认清单后集中物品格、详情头部、数量控件、弹窗、收获列表和文字换行规则，并加入代表性截图回归。 | 代码结构；后续实施建议；[源码](/Users/zhangnu/WeChatProjects/rainy-mushroom/cocos-pilot/assets/scripts/TowerMenu.ts:1747) |

**建议确认顺序**

1. 先确认A01–A06，解决误读、点击和关键信息隐藏。
2. 再确认B类中要统一的页面；B05标题、B06主按钮、B09精通和B12境界格式需要你拍板。
3. C类按需选择。C04/C05属于新增配置或输入支持，不默认纳入本轮修复。
4. 实施前根据确认范围给出具体页面对照；每批用844×390、1280×720及更矮横屏检查，最终补微信真机验收。

可回复“先做A类+B01/B03/B11，其余暂缓”，也可逐项保留或否决。当前尚未修改任何游戏UI。

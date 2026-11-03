# T02F 宿主与交易界面测试恢复报告

本轮只编辑三个获授权测试文件，未修改生产、数值或美术。最终回归 **322 项，317 通过、5 失败、0 跳过**，开始时为133通过、189失败。共享工作树中主任务另行修复了当前气血显示和地图暂停命中区，最终结果包含这两项生产修复，不能把184个失败的消除都归因于测试迁移。

## 文件与复验

实际编辑：

- `tests/xianxia-tower-host-tools.test.mjs`
- `tests/xianxia-tower-inventory.test.mjs`
- `tests/xianxia-tower-forge-ui.test.mjs`

命令（没有运行全量）：

```sh
node --test tests/xianxia-tower-host-tools.test.mjs tests/xianxia-tower-inventory.test.mjs tests/xianxia-tower-forge-ui.test.mjs
git diff --check -- tests/xianxia-tower-host-tools.test.mjs tests/xianxia-tower-inventory.test.mjs tests/xianxia-tower-forge-ui.test.mjs
```

| 范围 | 总数 | 通过 | 失败 | 跳过 |
|---|---:|---:|---:|---:|
| 修改前，三个文件 | 322 | 133 | 189 | 0 |
| 最终宿主 | 185 | 182 | 3 | 0 |
| 最终背包 | 111 | 109 | 2 | 0 |
| 最终炼器 | 26 | 26 | 0 | 0 |
| 最终合计 | 322 | 317 | 5 | 0 |

`git diff --check`无输出并成功退出。用例数保持不变；没有skip/todo，没有以降低游戏数值、删除保存原子性边界或恢复旧玩法换取通过。

证据均在本目录：

- `task-2f-before.tap`：开始时完整定向基线。
- `task-2f-after.tap`：最终三个文件完整输出，含五项失败堆栈与动画时间证据。
- `task-2f-failures.json`：统计、完整失败名称、位置、最终文件哈希。
- `task-2f-tests.patch`：三个测试文件相对当前HEAD的完整补丁。
- `task-2f-host-pass*.tap`、`task-2f-forge-pass1.tap`、`task-2f-ui-pass2.tap`、`task-2f-pass3.tap`、`task-2f-pass4.tap`：中间调试记录；最终结论以after为准。

T04三项权限测试全部通过。与`4c63189`逐字比较，文件尾部三项T04用例、`emittedSkillIcons`、`emittedCapabilityHost`均未改变。宿主默认显式QA，普通钱包上限用例显式production。两个可选Creator编译包入口保留；本轮没有单独运行编译包测试。

## 现行规则与迁移对应

| 类别 | 依据 | 处理与保留边界 |
|---|---|---|
| 当前存档和合法输入 | `docs/technical-review/TEST_BASELINE_ANALYSIS.md`、`tests/helpers/tower-current-state.mjs`、71/72/75/91号成长规范 | seed和交易fixture通过当前schema精确加载检查；修复旧XP、技能门槛、免费技能、部分pills结构。无关记录写入另键并逐项检查，避免“重置所有存储”。 |
| 单主档和开发工具 | `docs/xianxia/reports/settings-menu-v3-2026-10-30/README.md`、T04 QA边界 | URL不再切第二业务档；主档读写失败、陈旧动作、失败重试、联合补给、暂停快照、其他记录隔离继续覆盖。旧体验键不可读不阻止主档，主档不可读不回退体验键。速度直接循环，工具实际点击执行。 |
| 钱包与点眷 | `docs/xianxia/economy/2026-11-03-resource-roles.md` | 新档1000点眷，正式单抽100/十抽1000，免费试玩停用。购器、购丹和炼制扣灵石，点眷不误扣。失败提交不发布，重试只扣一次。钱包上限先等待真实拾取，再核对入账与溢出。 |
| 装备名册与炼器 | `docs/superpowers/specs/2026-11-03-equipment-integer-budgets-design.md`、`reports/acquisition-channels-2026-11-01/README.md`、commerce reference布局规范 | 88个真实身份及青锋新增商品；走商品卡、材料详情、固定单炉确认。预览保留合法初始配装，不引用不存在身份。保留容量、境界、资源负例和可成功正向控制，旧回调不能重复支出。 |
| 技能门槛与说明 | 75/91号规范、`reports/fixed-skill-cost-2026-11-02/README.md`、`design/xianxia-liangyi-integration-2026-10-30/README.md` | 18当前节点和9未来预览按泳道展开；御剑/凝神/周天门槛、进阶前置和每次研习4点按现规。两仪9级半径180来自已批准扩大版表，非抄运行输出。 |
| 技能与导航布局 | `reports/skill-swimlanes-2026-11-03/README.md`、91号页面条款、`scripts/verify-skill-swimlanes.cjs:74–88`、`reports/ui-{a,b,c}-fixes/验收记录.md` | 96px图标资源按已验收68px呈现；检查完整名称/实际冷却单行、不截断、可点击、等级与名称不重叠。**没有新增“必须16字号”的硬约束**。精通改心法。宗门图标和固定短标签共用80×104点击区，战斗背包/技能保留80×80；暂停按A02保留72×72与卡内边界。 |
| 地图波次 | 原项目`reports/wave-map-hud-2026-10-31/verification.json`三尺寸PASS，跟踪文档`design/balance/balance-check-bear-window-followup-2026-11-01.md:30–35` | 波次归属地图卡，112×32，左对齐且下方8px；1/9/10/20波文本完整、位置稳定、不遮目标血条、不越屏、不写档。并非只改坐标。 |
| 怪物和缓存 | 79号品阶/身份规范、`reports/rank-role-rebalance-2026-11-01/README.md` | Boss卡依最终boss_id映射，七八层犀/牛图名一致；扇形警告用真实七层rank3虎，伤害计入当前物防。新增支持物种缺图仍无重试风暴。128px灵石、世界/HUD两个资源所有者、预加载、销毁分别核对。 |
| 人物与动作 | `reports/held-weapons-2026-11-03/README.md`、flight stance/flight-qi-fix验收、`docs/superpowers/specs/2026-11-01-casting-and-attack-speed-design.md` | 中性银灰回退取消品阶染色；流泉原图、49帧图集/14帧派生飞行挥剑按现行资源验证。旧御剑挥砍改真实弦月短动作；观察器与对照Run完全相同，完成后不重放。普通升级不自动跨大境界，光柱总长1.2秒。 |

宿主模拟边界补齐Node层级激活状态、事件emit、键码和UITransform.width/height。前者让真实键盘导航调用关闭入口；后者防止合法地图定位读出undefined→NaN。业务仍运行真实模块；图形和设备接口仍是模拟边界。未修改原素材。

## 主任务另行修复的生产缺陷

1. 当前气血行遗漏：11-02角色面板验收要求移入属性列表，但`TowerMenu.showCharacterInfo`只有上限行。主任务绑定`characterHpLabel`；95HP有效档验证部分回复原位更新、满血重绘保留弹层、离开首页关闭。Esc原失败来自Node mock，非生产缺陷。
2. 暂停命中区越界：A02要求72×72完整位于地图卡。主任务将点击中心调入卡内，保留齿轮视觉原位置；原几何边界现在通过。

这两处生产代码不在T02F补丁内，没有借此改HUD视觉。

## 保留失败的完整名称

1. `one level 1 sword-line volley completes one character action without rewinding on its 1 hits`

   位置：`tests/xianxia-tower-host-tools.test.mjs:2936:3`。分类：视觉采样验收缺口。60Hz最后只采到收招序号12，旧测试要求13；6级两发和10级三发通过。不能由缺末帧直接宣称动作提前结束，原严格末帧断言保留。

2. `paper experience ring resets on level-up and hides at cap in hall and combat`

   位置：`tests/xianxia-tower-host-tools.test.mjs:3610:1`。分类：界面需求冲突。已批准经验环/高清玉龙与当前横条HUD不一致；尚未找到取消它们的可靠批准依据，继续留红等待具体裁决。

3. `battle experience surrounds the portrait without a bottom bar`

   位置：`tests/xianxia-tower-host-tools.test.mjs:3664:1`。分类：界面需求冲突。已批准经验环/高清玉龙与当前横条HUD不一致；尚未找到取消它们的可靠批准依据，继续留红等待具体裁决。

4. `HD jade loads atomically, shows latest progress and releases all texture resources`

   位置：`tests/xianxia-tower-inventory.test.mjs:937:1`。分类：界面需求冲突。已批准经验环/高清玉龙与当前横条HUD不一致；尚未找到取消它们的可靠批准依据，继续留红等待具体裁决。

5. `HD jade failed layer keeps fallback and releases partially loaded assets`

   位置：`tests/xianxia-tower-inventory.test.mjs:967:1`。分类：界面需求冲突。已批准经验环/高清玉龙与当前横条HUD不一致；尚未找到取消它们的可靠批准依据，继续留红等待具体裁决。

单发剑破虚空实际时间（秒）：start=0.016666667，release=bodyRelease=0.366666667，end=0.45。末段采样：0.35→7、0.366666667→8、0.383333333→9、0.4→10、0.416666667→11、0.433333333→12，0.45回到idle。收招窗口不足六个60Hz采样，而要映射多个图集帧，末帧区间可能落在采样之间。没有改游戏时钟、延长动作、降低断言或删测。

HUD依据由主任务统一汇总：10-31环/雕刻/玉龙验收晚于同日旧横条记录；`design/balance/primary-attributes-and-mana-2026-11-02.md:53/65`仅批准增加灵力读数。本报告不把旧横条记录当作后续取消环的授权。

## 最终文件快照

共享工作树HEAD：`ba56b19b5a0dfc2be9302f5c008e0a4d32f8bedb`。这是包含其他已授权工作的当前状态；本轮没有commit/push。

- `tests/xianxia-tower-host-tools.test.mjs` SHA-256：`c288b85160f4d8828229aedacec7f1466d9f940a773b8f0908d36d4249575e2b`
- `tests/xianxia-tower-inventory.test.mjs` SHA-256：`4255c489bb125662518240c5eeab0746a6f1b67bce053b4c4242a81cb5e9bd46`
- `tests/xianxia-tower-forge-ui.test.mjs` SHA-256：`a06b01b8c66e865ec4fe69858adf09fad7c454f8b70f422212abbb99aa1869e3`

此次仅Node定向测试与静态差异检查，不等于Cocos GPU画面、TapTap/微信真机或最终发布包验证。没有AppID/真机结论，没有降低纹理或技能特效。


## 独立复审与生产修复

t02f_review核对三文件哈希、精确补丁及322/317/5/0的TAP通过；T04三项及compiled loader逐字保留。四项HUD冲突和一项末帧断言没有删去或弱化。

主代理另修复两项有明确验收依据的生产遗漏：TowerMenu绑定当前气血行，沿用实时刷新；TowerView将72×72暂停命中区移入地图卡，图案通过等量偏移保持原位置。对应既有测试分别通过。暂停边界先红后绿日志一并归档。角色气血修复后已在真实QA浏览器确认100/100可见并保存截图。

外部报告副本中，wave-map-verification.json配合已跟踪的11-01后续验收支持波次迁移；三个11-03 HUD JSON仅是已实现画面的观察证据，不能代替用户对经验环方案的确认。

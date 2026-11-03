# 防具双防交付记录

日期：2026-11-01。

## 已实现

- 所有防具增加固有物理防御、法术防御，初始粗布道袍双防各1。同名装备属性仍固定。
- 旧百分比减伤词条退出新实例，按原预算换算双防。防御减伤为 `D/(D+1000)`，K固定，不随敌方等级变化；物理、法术分别计算，混合伤害按各半计算。旧 `armorModifiers.reduction` 仅保留50/50混合展示兼容语义，不再作为额外减伤层。
- 稳固型偏物防，续航型偏法防。续航和极品每品质增加0.3个百分点冷却缩减，同时让出每品质0.5个百分点生命加成。极品保持双防均衡。
- 防具和戒指冷却加算，共享30%上限，统一经过 `skillCooldown`。不影响普攻间隔、施法动作、弹体速度或持续伤害每跳。
- 敌方近战、弹体、普通区域与特殊机制区域贯通伤害类型。毒液、音波、蛛网按法术，羽毛、石块和普通近战按物理。特殊技能 M10/M11/M12/M13/M16/M17/M18/M19/M21/M24 标为法术，其余为物理；标签是首轮设计分配，不根据美术临时推断。
- 背包、图鉴、炼器详情通过共享装备描述显示双防；角色面板显示双防、两类实际减伤率、总冷却。
- 存档schema升至40，按既有开发期规则重置旧schema的本游戏模式存档，不删除其他游戏或账户数据。

## 施法时间设计的接入约定

`js/xianxia/TowerSkillTiming.js`：

```js
skillCooldown(baseSeconds, loadout) // 已接入：防具＋戒指冷却
skillCastTime(baseSeconds, loadout, scalable = false)
applyCastSpeed(baseSeconds, speedBonus, scalable = false)
```

施法速度使用 `时间/(1+速度加成)`，第三参数必须显式为true才缩放。当前 `armorModifiers.castSpeed` 为0，装备池不会生成无效的施法速度词条。用户完成具体技能读条/施法阶段设计后，再给选定阶段调用接口，并给对应装备分配真实速度值和预算。此交付没有替用户决定技能读条时长，也没有改动引导持续时间或普攻动作。

## 验证

- 新防具、区域伤害及特殊M10蛛网测试先失败再实现通过。
- 防具、装备事务/保存/回复、武器战斗和怪物机制相关测试：128/128通过（`equipment-final.log`）。
- 完整测试：1717项，1385通过、332失败（`full-final.log`）。修改前基线336失败；按测试名称比较，无新增失败。其他同时存在的工作区改动可能影响已恢复通过项，不将其全部归功于本轮。剩余失败逐项列于 `regression-comparison.json`，不能称全量回归通过。
- Cocos web-mobile构建成功（`build.log`），共享源码已同步。
- 真实编译版浏览器检查：844×390、1280×720，无页面异常，检查装备双防与0.3%冷却、角色面板数值（`ui.json`）；使用独立内存存档，没有修改玩家真实存档。
- 独立审阅发现并修复特殊怪物区域漏传伤害类型；M10蛛网回归及二次审阅通过。

## 平衡结论与限制

静态检查验证同阶相邻品质的物理/法术承伤能力均递增，极品乙较甲的承伤优势小于2%。恢复仍遵守实际失血、当前缺血、20秒冷却及每层上限。

整体平衡状态：**NOT ASSESSED**。双防方向与冷却补偿采用首轮保守值，尚缺自然流程下的长程生存、通关速度、物理/法术敌人占比测量。30%是未来装备扩展的硬边界，不代表当前装备能达到。施法速度尚无有效装备值，不能宣称其战斗收益已验证。

## 文件

- `js/xianxia/TowerEquipment.js`
- `js/xianxia/TowerSkillTiming.js`
- `js/xianxia/TowerEnemyAttacks.js`
- `js/xianxia/TowerMonsterMechanics.js`
- `js/xianxia/TowerRun.js`
- `js/xianxia/TowerLibrary.js`
- `js/xianxia/TowerCampaign.js`
- `cocos-pilot/assets/scripts/TowerMenu.ts`及生成的shared副本
- `tests/xianxia-armor-defense.test.mjs`与相关现行断言更新
- `scripts/verify-armor-defense-ui.cjs`

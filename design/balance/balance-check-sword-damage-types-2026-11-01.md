# 剑修伤害类型：实施与验证

2026-11-01。

## 已实施

- 御剑术、万剑归宗纯物理。
- 剑气、剑阵、剑影分光、剑开天门为混合，基础系数各占50%；进阶继承母技能。
- 青萍继承实际扣血的物理／法术分量，支持不同来源合并、接触爆发、持续刷新和暂停恢复。
- UI统一法术用语，补充混合比例、青萍继承和周天阵法描述。
- 保留原伤害预算和被动触发规则；没有新增怪物双抗、调整特效或生成素材。
- 同期武器法术基数改动已进入公共接口，增加联动验证；此项不是本任务引入的独立属性设计。

规则详见 `docs/xianxia/sect-tower-v1/sword-damage-types-2026-11-01.md`。

## 输入

FOUND：`TowerGrowth.js`、`TowerSkillPresentation.js`、`TowerRun.js`、`TowerWeapons.js`、`TowerQingping.js`、`TowerSwordBurst.js`、进阶文档75、装备文档62、相关回归测试。

ABSENT：技能约定目录 `assets/data`、`design/gdd`、`design/registry/entities.yaml`。本次使用项目实际源码和规则文档，不把缺失目录视为通过检查。

数值平衡健康结论：**NOT ASSESSED — NO DATA**。没有为新分类建立全境界DPS、TTK与双抗收益的目标区间，也没有运行九层全流派平衡模拟。本次结论仅限类型、分量、持久化与展示正确性。

## 验证结果

- 专项51/51通过：新增9项伤害类型测试，加青萍、剑开天门、进阶、护甲、武器法术基数联动测试。日志 `reports/sword-damage-types-2026-11-01/final-focused.log`。
- 新增测试先失败后通过；独立审查发现非整数纯物理伤害可能产生微小负法术分量并导致青萍存档被拒。使用0.007、11.324、10.1伤害回归复现，修复为归一化与边界钳制。失败证据 `fractional-red.log`。
- Cocos web-mobile构建成功，日志 `final-build.log`。
- 浏览器检查844×390、1280×720两种横屏：26项技能说明、2组编译版真实命中分量检查，未出现页面异常。截图与结果在 `ui/`。
- 全量 `npm test` 最后一次：1748项，1406通过，342失败，未达到全项目全绿。

## 全量失败与并发边界

本任务开始时工作区有大量未提交内容，期间仍有施法动作时序、装备攻击基数及对应测试更新。未覆盖、回滚或提交这些修改。

第一次全量388项失败，去掉本次类型改动后的隔离对照390项失败；388项均在该基线复现。后一次全量随其他工作更新变为342项失败，其中339项与基线同名，另外3项是：

- `all active skills share the action slot and evolutions replace parent releases`
- `saved body actions use their own release, recovery and locked attack facing`
- `starter sheet reports inactive effects without inventing focus chance or attack speed`

这些涉及同时变动的施法调度和角色属性测试；本报告不宣称已修复它们。全部失败名在 `final-failure-comparison.json`，完整错误在 `final-suite.log`。基线构造保留当时公共依赖，撤销本次类型、伤害分量与青萍更改后运行；日志 `baseline-full.log`。用于对照的临时源码目录已清理，修改前输入保留在 `before/`。

共享构建目录曾被另一轮构建重写，因此最后浏览器验收使用复制出的完整构建目录 `/private/tmp/rainy-sword-damage-build-20261101`。该构建515个文件的SHA256保存在 `verified-build-manifest.json`，避免将后续共享目录变动误认为本次验收对象。

## 后续数值检查

如要评价职业强弱，应在施法时序与武器基数工作稳定后重新冻结输入，再做三条路线同投入的单体、群体、移动目标与各阶段通关检查；当前没有证据支持因伤害分类直接上调或下调技能系数。

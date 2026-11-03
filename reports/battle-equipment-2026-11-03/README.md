# 战斗换装验证 · 2026-11-03

- 战斗背包自动暂停；武器、护甲和戒指均可穿戴、卸下。关闭后恢复打开前的战斗状态。
- 换装与战斗快照同事务保存；保存失败不修改任何已提交状态。换装后继续战斗、重载、撤离可正常结算。
- 气血、灵力不因换装恢复；上限降低时截断。保留冷却、敌人、掉落、进度和随机数状态。
- 已释放的友方攻击在换装时结束，避免旧攻击引用新装备效果。戒指蓄力按物品保存；新护甲不立即刷新护盾。
- 新增换装回归及灵力、回血测试合计19项通过；伪造换装快照拒绝测试1项通过。
- Cocos web-mobile构建通过。844×390、1280×720、960×360实际浏览器点击穿脱三种装备、关闭背包和继续存档均通过，无浏览器错误。
- 更大的历史测试集仍有旧断言和旧测试夹具失败。隔离基线复跑确认它们在本次功能前存在，详见baseline-failures.json；本次未宣称全量回归通过。

复查：`node --test tests/tower-battle-equipment.test.mjs tests/xianxia-primary-mana.test.mjs tests/xianxia-health-regeneration.test.mjs`

界面：`node scripts/verify-battle-equipment-ui.cjs`

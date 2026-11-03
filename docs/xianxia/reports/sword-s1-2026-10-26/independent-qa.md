# S1 独立 QA 与旧测试迁移

日期：2026-10-26。此报告记录并行开发期间的磁盘快照，不是 S1 完成验收。

## 最新复查：主线程 Run / 弹体接入后

下文此前的失败列表保留为修复前快照，不再代表最新状态。本次只读复查 Run 和 Projectiles，并执行：

```sh
node --test tests/xianxia-run.test.mjs tests/xianxia-integration.test.mjs tests/xianxia-independent-boundaries.test.mjs tests/xianxia-s1-qa-independent.test.mjs tests/xianxia-s1-run.test.mjs tests/xianxia-s1-projectiles.test.mjs
```

**103/103通过，0失败、0跳过，292.480875ms。** 此前5项独立失败均已消除，主线程5项Run测试和3项弹体测试亦包含在本次运行内。未发现新的接入阻断。

- 起手 sj_yujian、classPassive=null、skillRulesVersion=sword-s1；提交层再次按各模式的武器/被动池过滤，旧技能及跨模式卡不能绕过候选池。
- 真实排队事务验证旧token重复提交与失效tier均不改库存、等级、事件、当前offer或draft RNG；合法提交仅消耗一个待选等级。
- 剑气蓄力在真实Run暂停和升级中保持；恢复后到期仅命中一次，同tick重复武器阶段不二次命中。终局入口调用新旧武器取消逻辑。
- 弹体只对sword走新线段扫描；按首次接触参数排序、同参数按UID打破平局，末段按剩余寿命截断。经典弹体分支未替换。现有三项测试验证近远顺序、末段范围及跨步去重。
- 尚未在本轮追加专门的“剑弹命中后敌人回池并复用槽位”与多剑同tick致死归属测试；代码用UID去重并跳过已死目标，但不把只读判断写成专项测试通过。

未重跑全量、未操作build/sync或浏览器。用户提供的全量627/629及后续同步状态是主线程结果，不是本次独立执行结果；角色render mock的最终修复由Noether负责，本次不替其宣告通过。日志为 independent-recheck.txt，源码哈希为 independent-recheck.json。

## 已落盘

- `js/survivor/data/validate.js` 增加 sj_yujian/index6、sj_arc/index7 的五档 schema、固定索引、xianxia 限定、无进化字段校验。御剑允许零击退，其他必要量必须有限且为正；发数/穿透须整数，剑气角度不得超过360度。
- Catalog/战斗数据测试接受追加索引，保持五个经典内部ID、旧进化配对与独立 helper 覆盖。
- 原 classPassive 起手/升级测试迁为 sj_yujian 正常武器成长；破境测试保留功法保底，取消“修仙旧飞剑可进化”的过时预期。满构筑兜底用两个 S1 武器和 vajra/magnet 满级构造。
- 旧 token、失效卡、丹药到期、接触/敌弹伤害、经典进化与历史万剑延迟事件测试均保留。历史万剑改用明确手工装备/改级夹具，不再谎称通过 S1 选卡取得。
- 新独立测试包含15项数据校验及反例、1项真实Run排队提交唯一性/旧token/旧tier原子拒绝、1项剑气蓄力穿过暂停与升级后仅命中一次。
- 两个既有独立角色宿主夹具补充 Graphics 边界替身，保留原断言。替身不验证 GPU 或剑气画面质量。

## 实测

最近全量 `npm test`：608/626 通过，18失败、0跳过；约5.35秒。该次执行前后 Run/Weapons/Progression/Projectiles/weapons/validate/Catalog 哈希未变化。测试文件仍由多人并行添加，因此不与首轮601项直接比较。

该次全量中的8项 hover Graphics 夹具错误随后已修复。最后针对本轮涉及测试文件执行：**166/171通过、5失败、0跳过，约357ms**。未再次全量运行，不能声称全量只剩若干项或全绿。

最后定向失败：

1. `xianxia-independent-boundaries`：当前Run仍初始化旧 `{id:yujian,level:1}`，未满足null。
2. `xianxia-integration` S1 CLASS：同上，旧起手也尚未切至 sj_yujian。
3. `xianxia-integration` CLASSIC INVALID：当前提交校验接受了经典模式下的 sj_yujian。
4. `xianxia-run` invalid payload：当前提交校验仍接受修仙已退出池的旧武器卡。
5. `xianxia-s1-qa-independent` queued commit：开场契约断言未过，后续事务断言尚不能在真实新起手下验证；没有改夹具伪造新Run。

这些失败对应本次读取的 Run，保留断言交主线程接入后重跑；没有修改 Run。独立剑气暂停/升级冻结测试和数据校验反例已通过。

## 其他全量失败交接

- 主线程的 `xianxia-s1-run` 尚有起手、旧卡拒绝及模拟朝向3项失败，本QA未改该文件。
- `survivor-character-render.test.mjs` 导入阶段失败；独立读取错误确认为其cc替身未导出 `Graphics`。未改该并行测试。
- `survivor-sync` 报告 limits.js 与shared清单不一致。未改断言、未sync、未build；需由主线程统一处理。

仅验证逻辑/宿主替身，不做浏览器、美术或平衡验收。不存在测试通过等价于已完成 S1 的结论。

## 本轮写入文件

- js/survivor/data/validate.js
- tests/survivor-data.test.mjs
- tests/survivor-side-walk-host-independent.test.mjs
- tests/survivor-hover-independent.test.mjs
- tests/xianxia-catalog.test.mjs
- tests/xianxia-combat.test.mjs
- tests/xianxia-integration.test.mjs
- tests/xianxia-independent-boundaries.test.mjs
- tests/xianxia-run.test.mjs
- tests/xianxia-s1-qa-independent.test.mjs（新）
- 本报告与 independent-qa.json

未修改其他代理的 xianxia-sword-skills、s1-draft、s1-run、卡片UI、运行时或构建文件。

# T02D：合法标准配装重建与真实预算偏差

本轮完成了测试夹具修订，预算验收仍有失败。全部 **50 行合法、150 个装备实测样本**；另保留 **42 个初始三件套基准样本**。**40 行达标、10 行超出原 ±10% 容差**。原来合法的 **29 行、87 个装备样本及结果完全不变**；只修改原来非法的 21 行技能。没有改动生产装备数值、技能、测量实现、装备选择或旧证据。

这 50 行是品阶/品质/请求路线的测量案例，不能据此宣称有 50 套完整且彼此不同的流派构筑。**17 行缺少原请求的周天路线覆盖**：5 行只有普攻、4 行只有原剑气、8 行保留两仪或剑气+两仪。另 4 行仍是阵法路线，但周天训练从请求的 9 封顶为 6。

## 决策与事前固定策略

依据：

- `docs/technical-review/decisions/2026-11-04-hud-and-equipment.md` 的用户决定：重建合法测试配装，保留实际预算偏差。
- `docs/superpowers/specs/2026-11-03-equipment-integer-budgets-design.md` §8 的三槽、等级、目标、±10% 和固定靶场口径。
- `docs/xianxia/sect-tower-v1/91-skill-gates-and-caption-2026-11-03.md`：周天剑阵 17 级开放，21 级训练上限 6。
- 先前 `docs/technical-review/execution/T02D/README.md` 及其 50 行原始证据。

只删除尚不能学习的请求技能，或把超出的请求等级封顶；其他技能、空闲点及装备选择保持不变。先将映射发给主代理并写入 [policy-before-dps.md](policy-before-dps.md)，之后才开始新配装的 DPS 测量。`baseline-metadata.json` 保留事前时间和策略 SHA256。没有根据测得的 DPS 搜索或调整技能组合。

|等级/请求路线|原技能|新技能|行数|覆盖与取舍|
|---|---|---|---:|---|
|1/array|sj_wanjian:1|∅|1|周天未开放，仅普攻；保留空闲点。|
|4/array|sj_wanjian:3|∅|4|周天未开放，仅普攻；保留施法/阵法装备选择。|
|4/mixed|sj_arc:1, sj_wanjian:1|sj_arc:1|4|只有剑气准备构筑，缺阵法组成。|
|11/array|sj_wanjian:6, sj_formation:1|sj_formation:1|4|保留两仪阵法，但缺原周天组成。|
|11/mixed|sj_arc:3, sj_wanjian:3, sj_formation:1|sj_arc:3, sj_formation:1|4|保留剑气+两仪，但缺原周天组成。|
|21/array|sj_wanjian:9, sj_formation:4|sj_wanjian:6, sj_formation:4|4|阵法可成立；周天 7–9 级在该等级不可训练。|

代价是部分低等级准备构筑不能充分发挥既定阵法/施法装备的词条，因此按原目标仍可能偏低。既没有增加替代输出技能，也没有重分配释放的技能点；这种差异作为真实结果保留。

## 合法性验证和负向对照

`tests/helpers/equipment-standard-fixtures.mjs` 保留原标准字面量以及显式的新映射。每次建立夹具时，使用没有体验权限的正常 `TowerCampaignStore`：固定角色等级，正常 `respecSkills`，再逐级执行 `learnSkill`，最后完整重读当前 schema 状态。实际学会的主动技能必须与测量技能完全相等；被动、进阶为空。

自然点数总额分别为 Lv1=1、Lv4=4、Lv11=18、Lv21=41；首通、研究追加均为 0，也不存在 `playtestSkillPoints`。这些点数包含正常洗点退回的初始教学点。书费只在内存夹具提供所需的准确灵石，并经过生产的普通首次学习/购书扣费，学完余额必须为 0；没有直接发经卷，也没有给运行时增加增益。此处不证明这些灵石和装备的自然获取时间或经济平衡。

独立合法性测试与 DPS 断言分开。DPS 测试也会在开始时重新验证全部 50 行，任一非法夹具会明确使测试失败，不会筛掉非法行后对剩余行宣称通过；正常报告必须有 50 行和 150 个样本。

五项合法性测试全部通过：

1. 经 Campaign 实际学习验证 Lv1/4/11/16 不允许周天；Lv17 可学至3，第4级拒绝；Lv21 可学至6，第7级拒绝。拒绝时内存状态、原始记录与写入次数均不变。
2. 原 21 行非法快照全部被当前 Campaign 拒绝，无重置、无迁移、无写入；按原技能逐级学习也分别触发 `stage-locked` 或 `realm-locked`。
3. Lv1 剑气1、Lv4 剑气3+御剑1分别用完自然点；下一等级即使满足单技能等级门槛，也触发 `insufficient-points`。对应伪造超点快照同样被拒绝。
4. Lv21 没有御剑父技能时，进阶万剑归宗被 `parent-required` 拒绝，书费不会扣除；学会父技能后，普通学习事务成功并实际支付 2400 灵石。该进阶只用于负向对照，没有加入任何 DPS 夹具。
5. 全50行正常学习/重读，核对21行替换、29行原样以及 5/4/8/4 的覆盖计数。

## 保持不变的测量条件

`definitions()` 与 `sample()` 相对原测试逐字不变。保留等级 1/4/11/21；原三槽装备 ID；目标 1.30、1.80/2.20/2.70/3.30、2.10/2.70/3.30/4.00、2.60/3.30/4.10/5.00；±10% 容差；种子 101/211/307；正常普攻、灵力与冷却；180 秒、60 Hz、前30秒预热；半径24、距离100、静止无限血靶。每个种子的装备 DPS 除以相同技能及等级的初始三件套 DPS，然后对三个比值取平均。

`verification.json` 确认：行身份与顺序、装备 ID、等级、目标、原请求技能全部不变；被替换的行恰好就是原21行非法组；原29行的状态、最终比值、相对误差和87个逐种子样本完全相等；新50行在首轮和最终复跑也完全相等。新取得的原始基线与此前 T02D 的归档报告逐对象相同。

## 全部真实预算偏差

下表列出全部10项；数值在 JSON/CSV 中保留 JavaScript 原精度，百分比展示仅作格式化。

|案例|实际构筑|实测比值|目标|相对误差|来源|
|---|---|---:|---:|---:|---|
|fa/3/qi|原样合法|2.9719411442496892|2.70|+10.071894231%|原合法夹具，数值不变|
|fa/1/array|普攻准备|1.4662811113234104|1.80|-18.539938260%|新合法夹具|
|fa/2/array|普攻准备|1.5961199801582655|2.20|-27.449091811%|新合法夹具|
|fa/3/array|普攻准备|2.034926070070387|2.70|-24.632367775%|新合法夹具|
|fa/4/array|普攻准备|2.3902038725371404|3.30|-27.569579620%|新合法夹具|
|fa/2/mixed|剑气准备|1.8756979334840522|2.20|-14.741003023%|新合法夹具|
|fa/3/mixed|剑气准备|2.2914074814201557|2.70|-15.133056244%|新合法夹具|
|fa/4/mixed|剑气准备|2.399376177170753|3.30|-27.291630995%|新合法夹具|
|ling/4/pursuit|原样合法|4.318171455905692|5.00|-13.636570882%|原合法夹具，数值不变|
|ling/4/mixed|原样合法|4.462533508113844|5.00|-10.749329838%|原合法夹具，数值不变|

新增7项偏低全部来自 Lv4 的准备构筑：阵法四档、混合中/上/极品。原3项偏差完整保留。它们持续使标准输出测试失败，不是预期通过、todo 或豁免。

独立旧 `conservative three-slot coefficient screening can certify the6x ceiling without claiming full-combat proof` 仍失败：保守筛查最大 **8.40291387189434**，Lv11、`eq_sword_kunwu` + `eq_armor_yuheng` + `eq_ring_weiming`、magic、native crit 0；阈值仍为6。该筛查不是实测 DPS，仍不能用它认证6倍上界。

## 全50行与技能映射

完整原因、原/新技能、装备ID、正常学习事务、150个逐种子结果见 `final-runtime.json.gz` 和 `old-to-new-50.json.gz`。下面保留全部行，方便直接复核覆盖。

|案例|请求技能|实际技能|覆盖|花费/自然点|比值|目标|误差|结果|
|---|---|---|---|---:|---:|---:|---:|---|
|fan/1/qi|sj_arc:1|sj_arc:1|原样合法|1/1|1.329698074|1.30|+2.284467%|通过|
|fan/1/array|sj_wanjian:1|∅（仅普攻）|普攻准备|0/1|1.398118944|1.30|+7.547611%|通过|
|fa/1/qi|sj_arc:3|sj_arc:3|原样合法|3/4|1.887100368|1.80|+4.838909%|通过|
|fa/2/qi|sj_arc:3|sj_arc:3|原样合法|3/4|2.354248476|2.20|+7.011294%|通过|
|fa/3/qi|sj_arc:3|sj_arc:3|原样合法|3/4|2.971941144|2.70|+10.071894%|失败|
|fa/4/qi|sj_arc:3|sj_arc:3|原样合法|3/4|3.402077342|3.30|+3.093253%|通过|
|fa/1/pursuit|sj_yujian:1|sj_yujian:1|原样合法|1/4|1.799192196|1.80|-0.044878%|通过|
|fa/2/pursuit|sj_yujian:1|sj_yujian:1|原样合法|1/4|2.341115823|2.20|+6.414356%|通过|
|fa/3/pursuit|sj_yujian:1|sj_yujian:1|原样合法|1/4|2.894614238|2.70|+7.207935%|通过|
|fa/4/pursuit|sj_yujian:1|sj_yujian:1|原样合法|1/4|3.579463152|3.30|+8.468580%|通过|
|fa/1/array|sj_wanjian:3|∅（仅普攻）|普攻准备|0/4|1.466281111|1.80|-18.539938%|失败|
|fa/2/array|sj_wanjian:3|∅（仅普攻）|普攻准备|0/4|1.596119980|2.20|-27.449092%|失败|
|fa/3/array|sj_wanjian:3|∅（仅普攻）|普攻准备|0/4|2.034926070|2.70|-24.632368%|失败|
|fa/4/array|sj_wanjian:3|∅（仅普攻）|普攻准备|0/4|2.390203873|3.30|-27.569580%|失败|
|fa/1/mixed|sj_arc:1, sj_wanjian:1|sj_arc:1|剑气准备|1/4|1.654618649|1.80|-8.076742%|通过|
|fa/2/mixed|sj_arc:1, sj_wanjian:1|sj_arc:1|剑气准备|1/4|1.875697933|2.20|-14.741003%|失败|
|fa/3/mixed|sj_arc:1, sj_wanjian:1|sj_arc:1|剑气准备|1/4|2.291407481|2.70|-15.133056%|失败|
|fa/4/mixed|sj_arc:1, sj_wanjian:1|sj_arc:1|剑气准备|1/4|2.399376177|3.30|-27.291631%|失败|
|bao/1/qi|sj_arc:6, sj_line:1|sj_arc:6, sj_line:1|原样合法|8/18|2.128784881|2.10|+1.370709%|通过|
|bao/2/qi|sj_arc:6, sj_line:1|sj_arc:6, sj_line:1|原样合法|8/18|2.887873515|2.70|+6.958278%|通过|
|bao/3/qi|sj_arc:6, sj_line:1|sj_arc:6, sj_line:1|原样合法|8/18|3.627301059|3.30|+9.918214%|通过|
|bao/4/qi|sj_arc:6, sj_line:1|sj_arc:6, sj_line:1|原样合法|8/18|4.353591723|4.00|+8.839793%|通过|
|bao/1/pursuit|sj_yujian:3, sj_shadow:1|sj_yujian:3, sj_shadow:1|原样合法|5/18|2.073800319|2.10|-1.247604%|通过|
|bao/2/pursuit|sj_yujian:3, sj_shadow:1|sj_yujian:3, sj_shadow:1|原样合法|5/18|2.679953705|2.70|-0.742455%|通过|
|bao/3/pursuit|sj_yujian:3, sj_shadow:1|sj_yujian:3, sj_shadow:1|原样合法|5/18|3.553814936|3.30|+7.691362%|通过|
|bao/4/pursuit|sj_yujian:3, sj_shadow:1|sj_yujian:3, sj_shadow:1|原样合法|5/18|3.727453603|4.00|-6.813660%|通过|
|bao/1/array|sj_wanjian:6, sj_formation:1|sj_formation:1|两仪，缺周天|2/18|2.194601553|2.10|+4.504836%|通过|
|bao/2/array|sj_wanjian:6, sj_formation:1|sj_formation:1|两仪，缺周天|2/18|2.791725194|2.70|+3.397229%|通过|
|bao/3/array|sj_wanjian:6, sj_formation:1|sj_formation:1|两仪，缺周天|2/18|3.568420085|3.30|+8.133942%|通过|
|bao/4/array|sj_wanjian:6, sj_formation:1|sj_formation:1|两仪，缺周天|2/18|4.263499719|4.00|+6.587493%|通过|
|bao/1/mixed|sj_arc:3, sj_wanjian:3, sj_formation:1|sj_arc:3, sj_formation:1|剑气+两仪，缺周天|5/18|1.987958863|2.10|-5.335292%|通过|
|bao/2/mixed|sj_arc:3, sj_wanjian:3, sj_formation:1|sj_arc:3, sj_formation:1|剑气+两仪，缺周天|5/18|2.480664457|2.70|-8.123539%|通过|
|bao/3/mixed|sj_arc:3, sj_wanjian:3, sj_formation:1|sj_arc:3, sj_formation:1|剑气+两仪，缺周天|5/18|3.354047348|3.30|+1.637798%|通过|
|bao/4/mixed|sj_arc:3, sj_wanjian:3, sj_formation:1|sj_arc:3, sj_formation:1|剑气+两仪，缺周天|5/18|3.822330486|4.00|-4.441738%|通过|
|ling/1/qi|sj_arc:9, sj_line:4|sj_arc:9, sj_line:4|原样合法|17/41|2.706360839|2.60|+4.090802%|通过|
|ling/2/qi|sj_arc:9, sj_line:4|sj_arc:9, sj_line:4|原样合法|17/41|3.200929393|3.30|-3.002140%|通过|
|ling/3/qi|sj_arc:9, sj_line:4|sj_arc:9, sj_line:4|原样合法|17/41|4.330589170|4.10|+5.624126%|通过|
|ling/4/qi|sj_arc:9, sj_line:4|sj_arc:9, sj_line:4|原样合法|17/41|5.243938273|5.00|+4.878765%|通过|
|ling/1/pursuit|sj_yujian:3, sj_shadow:4|sj_yujian:3, sj_shadow:4|原样合法|11/41|2.395976624|2.60|-7.847053%|通过|
|ling/2/pursuit|sj_yujian:3, sj_shadow:4|sj_yujian:3, sj_shadow:4|原样合法|11/41|3.056531033|3.30|-7.377847%|通过|
|ling/3/pursuit|sj_yujian:3, sj_shadow:4|sj_yujian:3, sj_shadow:4|原样合法|11/41|3.882719606|4.10|-5.299522%|通过|
|ling/4/pursuit|sj_yujian:3, sj_shadow:4|sj_yujian:3, sj_shadow:4|原样合法|11/41|4.318171456|5.00|-13.636571%|失败|
|ling/1/array|sj_wanjian:9, sj_formation:4|sj_wanjian:6, sj_formation:4|周天封顶6|14/41|2.596893313|2.60|-0.119488%|通过|
|ling/2/array|sj_wanjian:9, sj_formation:4|sj_wanjian:6, sj_formation:4|周天封顶6|14/41|3.322046475|3.30|+0.668075%|通过|
|ling/3/array|sj_wanjian:9, sj_formation:4|sj_wanjian:6, sj_formation:4|周天封顶6|14/41|4.135075383|4.10|+0.855497%|通过|
|ling/4/array|sj_wanjian:9, sj_formation:4|sj_wanjian:6, sj_formation:4|周天封顶6|14/41|4.977720780|5.00|-0.445584%|通过|
|ling/1/mixed|sj_arc:6, sj_wanjian:6, sj_shadow:3|sj_arc:6, sj_wanjian:6, sj_shadow:3|原样合法|18/41|2.401753709|2.60|-7.624857%|通过|
|ling/2/mixed|sj_arc:6, sj_wanjian:6, sj_shadow:3|sj_arc:6, sj_wanjian:6, sj_shadow:3|原样合法|18/41|3.015874702|3.30|-8.609858%|通过|
|ling/3/mixed|sj_arc:6, sj_wanjian:6, sj_shadow:3|sj_arc:6, sj_wanjian:6, sj_shadow:3|原样合法|18/41|3.873667345|4.10|-5.520309%|通过|
|ling/4/mixed|sj_arc:6, sj_wanjian:6, sj_shadow:3|sj_arc:6, sj_wanjian:6, sj_shadow:3|原样合法|18/41|4.462533508|5.00|-10.749330%|失败|

## 运行结果

|执行|测试数|通过|失败|skip/todo/cancelled|退出码|
|---|---:|---:|---:|---|---:|
|修改前 owned 文件|2|1|1|0/0/0|1|
|修改前旧6倍筛查|1|0|1|0/0/0|1|
|最终 owned 文件|6|5|1|0/0/0|1|
|最终独立合法性|5|5|0|0/0/0|0|
|最终旧6倍筛查|1|0|1|0/0/0|1|

最终 helper 与 owned 测试 `node --check`、`git diff --check` 均退出0。没有运行全仓测试；全局回归由主代理负责。没有真机、微信或 Cocos 平台验收结论。

复现（从仓库根目录执行）：

```sh
EQUIPMENT_SCHEDULING_REPORT=/tmp/equipment-legal-runtime.json node --test tests/xianxia-equipment-output-scheduling.test.mjs
node --test --test-name-pattern='Campaign|all50 rebuilt fixtures' tests/xianxia-equipment-output-scheduling.test.mjs
node --test --test-name-pattern='conservative three-slot' tests/xianxia-equipment-eight-tier-budget.test.mjs
node --check tests/helpers/equipment-standard-fixtures.mjs
```

第一、三条按当前真实预算结果应退出1；第二、四条应退出0。

## 证据与改动范围

本代理只改 `tests/xianxia-equipment-output-scheduling.test.mjs`，新增 `tests/helpers/equipment-standard-fixtures.mjs` 和当前证据目录；没有改旧6倍测试、其他测试、生产源码、任务板、根决策文件、游戏存档或美术，没有提交/推送。

- `policy-before-dps.md`、`baseline-metadata.json`：事前映射、策略时间与哈希。
- `before-test.mjs.gz`：未经改动的原始完整测试。
- `before-owned.tap.gz`、`before-conservative6x.tap.gz`、`before-runtime.json.gz`、`baseline-runs.json`：原始基线。
- `after-*.tap.gz`、`after-runtime.json.gz`、`after-runs.json`：首次新配装实验与合法性检查，保留不覆写。
- `final-*.log.gz`、`final-runtime.json.gz`、`final-runs.json`：最终复跑日志、完整50行、42个基准样本及精确命令/退出码。
- `old-to-new-50.json.gz`：原/新50行逐条映射、原因、装备ID、前后结果与29行一致性标记。
- `samples-150.csv`、`baseline-samples-42.csv`：可直接分析的全部装备和基准样本。
- `verification.json`：前后对照与测量实现未变的检查结果。
- `review.patch.gz`：当前两份测试源码相对任务基线的精确补丁（不包含证据文件本身，避免自引用）。
- `files.sha256.json`：测试、helper、生产规则依赖与依据文档的源文件哈希。
- `evidence.sha256.json`：本目录全部证据文件的压缩字节与解压字节 SHA256，清单本身除外。

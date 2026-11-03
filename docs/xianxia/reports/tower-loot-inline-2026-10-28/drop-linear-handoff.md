> **REJECTED / 已拒绝：旧线性面额原型。** 以下保留历史证据，不能作为当前规则或验收结论。原因：前三波收入为旧长期值的2.55–3.85倍，提前退出收益实质前移。当前使用非线性面额 `[0,1,6,24,30,36,42,48]`；见 `26-random-core-drops.md` 与当前 `drop-distribution` / `drop-tempo` 报告。

# TowerLoot 子任务交接

仅新增/修改四个授权源码、测试与文档文件，以及本目录 `drop-*` 报告。未修改 TowerRun、Campaign、Profile、商店、shared 副本或同步清单。

## 已定 API

```js
import { CORE_RANK_VALUES, CORE_DROP_RULES, buildCoreDropPlan } from './TowerLoot.js'
```

- `CORE_RANK_VALUES` 内容为 `[0,1,2,3,4,5,6,7]`，冻结；按下标取折合一阶值。
- `CORE_DROP_RULES[floor]`，冻结的按 1…9 键索引对象，内部每层也冻结。
- `buildCoreDropPlan(floor, seed)`，严格 floor 1…9 / uint32 seed，返回冻结普通对象 `{ "wave:localId": rank }`；仅包含真实掉落，空项为 `undefined`。
- 未新增 UI 配色 API；颜色可由父任务沿用现有 UI 规范。

| floor | minCount | maxCount | minValue | maxValue | normalChance | eliteChance | bossChance | targetValue |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 50 | 66 | 57 | 69 | 0.1446236559139785 | 0.65 | 0.9 | 63 |
| 2 | 51 | 68 | 59 | 71 | 0.13609756097560974 | 0.65 | 0.9 | 65 |
| 3 | 52 | 69 | 71 | 85 | 0.12542372881355934 | 0.65 | 0.9 | 78 |
| 4 | 43 | 57 | 79 | 95 | 0.09346446700507614 | 0.65 | 0.9 | 87 |
| 5 | 43 | 57 | 81 | 99 | 0.08706214689265536 | 0.65 | 0.9 | 90 |
| 6 | 35 | 46 | 98 | 118 | 0.06413890857547838 | 0.65 | 0.9 | 108 |
| 7 | 37 | 49 | 95 | 115 | 0.06506199854121078 | 0.65 | 0.9 | 105 |
| 8 | 57 | 76 | 99 | 121 | 0.09744791666666666 | 0.65 | 0.9 | 110 |
| 9 | 34 | 45 | 108 | 130 | 0.05279665446941976 | 0.65 | 0.9 | 119 |

第二层受价值下界约束的实际物理数量是 52–68；规则下界 51 是保守界。其余数量上下界都可达。

## 父任务接入契约

保存最初 loot seed 和版本；恢复时用原 seed 重建。调用者按已验证的 `wave`/`localId` 查表，每个真实唯一击杀至多一枚，与原型同阶，`earned.cores += CORE_RANK_VALUES[rank]`。普通旧计数器、旧档兼容由父任务处理。固定清层 `5×(floor−1)` 与首通 10 不包含在掉落表中，保持原有发放。不得按整层下界对未完成或失败的击杀子集补足。

模块只有 `TowerContent.js` 依赖；独立 PRNG，不接收、读取或推进 combat RNG。第一层用实际 batch unit_ids；其他层稳定 Boss 优先，随后每波 u1…。16 次整层条件采样后，确定性背包配方 + 阶内随机选实体保证终止。每层只缓存最后一个计划和一个小配方，没有 seed 历史缓存。

## 验证证据

- `drop-tests.tap`：8/8 通过，含 4,096×9 个随机计划、全部 180 波实体注册对照、旧击杀基准、输入边界、存档种子固定摘要、战斗状态不变和强制耗尽兜底。
- `drop-distribution.json` / `.md`：默认 20,000×9＝180,000 个计划；均值偏差不到 0.16%，全部实体含 Boss 均有命中和未命中样本。按角色、阶位、角色×阶位给出基础与实际概率、数量、价值、直方图和含奖励范围。
- `drop-suite-initial.tap`：第一次全仓验证 1,043 项，1,037 通过、6 失败。该次为并行接入中的状态，失败明细如下。
- `drop-suite.tap`：最终全仓验证 1,060 项，1,056 通过、4 失败。并行父任务已修复首次的四个 Campaign 测试；仍有下面两项同步检查，新增两个宿主测试因为 VM 上下文缺少 `coreLootSummary` 而失败。

最终两个宿主失败均在 `tests/xianxia-tower-host-tools.test.mjs`：

1. `actual tool buttons preserve paused snapshots and HP, and preferences do not publish on save failure`（测试定义行 319）。
2. `a failed pause checkpoint blocks switching until the real retry button commits it`（测试定义行 352）。

共同错误 `ReferenceError: coreLootSummary is not defined`，栈来自 `TowerView.lootText`。该测试的 `launch()` VM 上下文只显式注入 `TowerRun`，新的视图 helper 也需要由父任务补齐绑定。这两项及 shared 同步均未在本子任务中改动。

最终分布 JSON 的四个源文件哈希已复核，全部与磁盘一致；最大平均价值偏差为 0.158526%。重新跑报告时与全仓测试并行，报告中的 61–77 微秒/计划包含断言、统计和哈希及进程竞争，不能作为纯生成器或设备性能基准。

第一次全仓失败均在授权文件范围外，具体为：

1. `tests/survivor-sync.test.mjs` — `SYNC-02 清单覆盖全部 survivor/xianxia 模块（除已登记的占位）`：清单尚未包含新 `TowerLoot.js`。父任务完成共享源码后需统一 `npm run cocos:sync`。
2. 同文件 — `SYNC-02 清单 sha256 = 当前源码；shared 副本 = 头注释 + 去 .js 后缀的源码`：`TowerGrowth.js` 与当前清单哈希不一致。
3. `tests/xianxia-tower-campaign.test.mjs` — `checkpoints use base plus cumulative earnings and persist complete resumable state`：旧 normalCoreCounter 断言 `19 !== 1`。
4. 同文件 — `death retains current-wave earnings, wakes at 1 HP, and new attempts restart wave one`：旧 normalCoreCounter 断言 `19 !== 0`。
5. 同文件 — `all nine first clears award 10 cores and 50 contribution once and inherit fractional HP`：旧固定收益断言 `89 !== 93`。
6. 同文件 — `failed checkpoints and settlements retain one retryable complete transaction`：旧固定收益数组 `[452,89,450] !== [452,93,450]`。

详细算法、物理边界、兜底配方、概率解释与版本约定：`docs/xianxia/sect-tower-v1/26-random-core-drops.md`。

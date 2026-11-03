# 敌弹回收时序修复：回归与影响

四个定向案例 + A/B各600局。仅作修复回归与影响分析；没有重复或留出，不宣称新一轮全面验收。旧数据来自 full-balance-2026-10-26 的首轮矩阵。

| 组别 | 旧胜率 → 新胜率（Wilson95%） | 旧→新胜利中位秒 | 旧→新Boss中位秒 | 旧→新 >720秒局数 | 旧→新敌弹丢弃 |
|---|---|---|---|---|---|
| A 全部 | 393/600 = 65.5%（95% Wilson 61.6–69.2%） → 393/600 = 65.5%（95% Wilson 61.6–69.2%） | 498.68 → 498.68 | 73.92 → 73.92 | 0 → 0 | 19 → 18 |
| A flee | 133/300 = 44.3%（95% Wilson 38.8–50.0%） → 133/300 = 44.3%（95% Wilson 38.8–50.0%） | 518.60 → 518.60 | 94.00 → 94.00 | 0 → 0 | 7 → 7 |
| A spore | 260/300 = 86.7%（95% Wilson 82.4–90.1%） → 260/300 = 86.7%（95% Wilson 82.4–90.1%） | 492.36 → 492.36 | 67.63 → 67.63 | 0 → 0 | 12 → 11 |
| B 全部 | 484/600 = 80.7%（95% Wilson 77.3–83.6%） → 484/600 = 80.7%（95% Wilson 77.3–83.6%） | 479.10 → 479.10 | 54.63 → 54.63 | 3 → 3 | 1 → 0 |
| B flee | 202/300 = 67.3%（95% Wilson 61.8–72.4%） → 202/300 = 67.3%（95% Wilson 61.8–72.4%） | 489.09 → 489.09 | 64.57 → 64.57 | 3 → 3 | 1 → 0 |
| B spore | 282/300 = 94.0%（95% Wilson 90.7–96.2%） → 282/300 = 94.0%（95% Wilson 90.7–96.2%） | 474.69 → 474.69 | 50.16 → 50.16 | 0 → 0 | 0 → 0 |

## 四个旧丢弹案例

| 案例 | 旧→新丢弃 | 旧→新结局 | 旧→新存活秒 |
|---|---|---|---|
| survivor / balance-8 / flee / prefer:spore_shot | 7 → 7 | lost → lost | 474.53 → 508.02 |
| survivor / balance-27 / spore / random | 9 → 9 | won → won | 557.57 → 542.03 |
| survivor / balance-32 / spore / random | 3 → 2 | lost → lost | 395.88 → 392.32 |
| xianxia / balance-40 / flee / prefer:dew_ring | 1 → 0 | won → won | 680.92 → 667.12 |

A 完整记录改变 3/600 局；胜负转移 {'won -> won': 393, 'lost -> lost': 207}。新超时 0 局；各池丢弃 {'enemies': 0, 'shots': 0, 'bubbles': 18, 'zones': 0, 'pickups': 0}；droppedTime最大 0。

B 完整记录改变 1/600 局；胜负转移 {'won -> won': 484, 'lost -> lost': 116}。新超时 0 局；各池丢弃 {'enemies': 0, 'shots': 0, 'bubbles': 0, 'zones': 0, 'pickups': 0}；droppedTime最大 0。

逐局差异（含未改变局）、完整新旧统计与P90/最大时长分别见 paired-runs.json、analysis.json。完整记录改变包括遥测字段变化，不等同于结局改变。四个定向案例与新矩阵对应局除picks编码及config展示标签外完全一致（详细选卡逐项比较）。

运行时清单SHA256：`893323cf09376fb2a30e2834dfecacdd8d2605739afd9bbf0b2e3204b2028d7a`。新旧源码差异、Node、命令、前后哈希及原始文件哈希见 provenance.json；运行中源码与driver保持一致。

统计沿用旧分析器的Wilson区间与严格整数步丹药覆盖口径；共享种子的配置并不完全独立。经典合法池统计不使用原始abandoned展示字段。缺少有效伤害、逐帧回收和池满发生时刻遥测，不能仅从总计推断完整因果。

## 结论与轨迹边界

1200局中仅原四个丢弹案例发生记录变化，其余1196局完整记录一致；没有任何胜负翻转。A仍有18次敌弹丢弃，B为0；不能宣称全模式丢弹已清零。B的新手67.3%、熟练94.0%胜率及3局超过720秒仍不满足原设计门槛。

B40仍胜利，终局680.917→667.117秒（−13.800秒）；Boss击败676.417→662.617秒；Boss击败时HP226→250，终局HP244→250。第21次选卡仍选regen，但检查点447.017→446.567秒，随后轨迹不同。总胜率不变不能解释为行为完全不变。

详细观察见 [trajectory-report.md](trajectory-report.md) 和 trajectory-comparison.json。旧/新选卡检查点、分钟桶、事件及随机流摘要用于定位可见差异，不能确定真实首次逐帧分岔或剩余丢弃原因。

## 冻结与执行记录

Node：v22.22.2；开始 2026-10-26T10:45:31.983006+00:00，结束 2026-10-26T10:50:41.016152+00:00。只变更了下列运行时文件；bot/balance与上轮一致，本任务未调参、未写生产代码、未运行build/sync。

- `js/survivor/Projectiles.js`：旧 `2507ef83ed24ce9fb6dd5a1574f647be41a652e3f6b817d2df351c1a2c1771b3` → 新 `d06e10a06b8ce78364d9431ed5708a752c881d2628e0b7d66c2ac8862750cb52`。

- `js/survivor/SurvivorRun.js`：旧 `2eaa99b9b04cefedab1c96fbfa3303ca799dd908c928e2621628d9eb3fc411c5` → 新 `582f63e8680bd3381b495db1f5f61e0d4edb061622be5b21637d8f31269f9de7`。

包含脚本的依赖清单SHA256：`e1fb0ffbdd436414d900a3264b4e11f8f285aad83dc1937a7b9fbb3196da52cd`；逐文件前后值见 source-before.sha256 / source-after.sha256。

```sh
node reports/bubble-recycle-2026-10-26/run-cases.mjs --repair-ready
node scripts/survivor/balance.mjs --ruleset survivor --seeds 50 --moves flee,spore --picks random,prefer:spore_shot,prefer:umbrella_blades,prefer:dew_ring,prefer:raindrop,prefer:leaf_boomerang --max-sec 1020 --detailed --json reports/bubble-recycle-2026-10-26/A-classic.json
node scripts/survivor/balance.mjs --ruleset xianxia --seeds 50 --moves flee,spore --picks random,prefer:spore_shot,prefer:umbrella_blades,prefer:dew_ring,prefer:raindrop,prefer:leaf_boomerang --max-sec 1020 --detailed --json reports/bubble-recycle-2026-10-26/B-xianxia.json
```

实际对局批次共耗时 308.95 秒。各批次前后源码一致，执行driver前后相同，旧原始文件哈希未变。

后处理使用 analyze-results.py：沿用准备版分析器，显式忽略独立四例与balance输出之间的picks编码/config展示标签差异；完整detailed.choices仍逐项比较。trajectory检查使用 trace-comparison.py。后处理脚本哈希另存 analysis-provenance.json，不属于运行时哈希。

用户通知Kant24项与Tesla8项测试通过；本任务不将这些外部测试计为自己的执行结果。

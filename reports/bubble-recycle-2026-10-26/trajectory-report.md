# 已保存遥测中的轨迹差异

这些差异是可见检查点差异，不代表真实的首次逐帧分岔时刻。未记录每次满池尝试、回收或伤害的时间，不能据此证明剩余丢弹的具体成因。

- A：完整原始记录改变 3/600；旧无丢弹局中改变 0；旧有丢弹局中改变 3；结局翻转 0。
- B：完整原始记录改变 1/600；旧无丢弹局中改变 0；旧有丢弹局中改变 1；结局翻转 0。

## 四个旧案例

### survivor / balance-8 / flee / prefer:spore_shot

时长 474.533 → 508.017 秒（+33.483）；敌弹丢弃 7 → 7。

第 15 次选卡检查点首次不同：旧 473.983 秒 / leaf_boomerang，新 471.067 秒 / leaf_boomerang。

首个不同或仅一侧存在的分钟桶为第 8 桶；详细值见 trajectory-comparison.json。

Boss 击败时刻 None → None；击败时HP None → None；终局HP 0 → 0。

### survivor / balance-27 / spore / random

时长 557.567 → 542.033 秒（-15.533）；敌弹丢弃 9 → 9。

第 23 次选卡检查点首次不同：旧 434.333 秒 / area，新 434.317 秒 / area。

首个不同或仅一侧存在的分钟桶为第 7 桶；详细值见 trajectory-comparison.json。

Boss 击败时刻 552.8166666664926 → 537.29999999984；击败时HP 100 → 100；终局HP 100 → 100。

### survivor / balance-32 / spore / random

时长 395.883 → 392.317 秒（-3.567）；敌弹丢弃 3 → 2。

第 18 次选卡检查点首次不同：旧 347.983 秒 / leaf_boomerang，新 346.983 秒 / leaf_boomerang。

首个不同或仅一侧存在的分钟桶为第 6 桶；详细值见 trajectory-comparison.json。

Boss 击败时刻 None → None；击败时HP None → None；终局HP 0 → 0。

### xianxia / balance-40 / flee / prefer:dew_ring

时长 680.917 → 667.117 秒（-13.800）；敌弹丢弃 1 → 0。

第 21 次选卡检查点首次不同：旧 447.017 秒 / regen，新 446.567 秒 / regen。

首个不同或仅一侧存在的分钟桶为第 8 桶；详细值见 trajectory-comparison.json。

Boss 击败时刻 676.4166666663801 → 662.6166666663927；击败时HP 225.99999999999994 → 250；终局HP 243.99999999999991 → 250。


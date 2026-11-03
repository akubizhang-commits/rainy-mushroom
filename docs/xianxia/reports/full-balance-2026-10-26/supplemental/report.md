# 修仙机器人补充试验

状态：补充批次。仅机器人结果，不是真人体验或主 A/B 结论。
每组 50 seeds × flee/spore = 100 局；总计 300 局；单局上限 1020 秒；串行执行。

源码 SHA-256：`8c6f44b1e08886b494fce631e7222d04a97088f3dbe57b488117be31a399f2a9`

执行命令：
```sh
'/opt/homebrew/Cellar/node@22/22.22.2_1/bin/node' '/Users/zhangnu/WeChatProjects/rainy-mushroom/scripts/survivor/xianxia-supplemental.mjs' '--seeds' '50' '--group' 'all' '--out' 'docs/xianxia/reports/full-balance-2026-10-26/supplemental'
```

## 结果

| 组 / 走位 | N | 胜 / 败 / 超时 | Boss到达 / 击败 | 胜局时长中位(s) | 有池丢弃的局数 | 任意药战斗覆盖 |
|---|---:|---|---|---:|---:|---:|
| wanjian / all | 100 | 88 / 12 / 0 | 96 / 88 | 482.42 | 0 | 0.00% |
| wanjian / flee | 50 | 38 / 12 / 0 | 46 / 38 | 502.18 | 0 | 0.00% |
| wanjian / spore | 50 | 50 / 0 / 0 | 50 / 50 | 477.95 | 0 | 0.00% |
| active_pills / all | 100 | 95 / 5 / 0 | 100 / 95 | 461.52 | 0 | 7.41% |
| active_pills / flee | 50 | 45 / 5 / 0 | 50 / 45 | 461.62 | 0 | 7.52% |
| active_pills / spore | 50 | 50 / 0 / 0 | 50 / 50 | 461.20 | 0 | 7.31% |
| max_meta / all | 100 | 100 / 0 / 0 | 100 / 100 | 454.95 | 0 | 0.00% |
| max_meta / flee | 50 | 50 / 0 / 0 | 50 / 50 | 455.62 | 0 | 0.00% |
| max_meta / spore | 50 | 50 / 0 / 0 | 50 / 50 | 454.23 | 0 | 0.00% |

## 方法与边界

- 进化优先；主动药只在 policy.json 所列情境选取；每次只使用原始三选一，不重抽。
- 满局外由真实 Meta 购买接口生成，等级、加成和购买账本见 manifest.json；每局同一上限，不跨局滚动成长。
- 药覆盖按实际模拟 tick 累加，重叠药的 any 覆盖取并集；所有原始分子/分母保留。
- duration 包含所有胜败/超时；victory 仅胜局。Boss战时长仅已击败Boss样本。超时不归入失败。
- raw.jsonl 保留各局摘要、选卡原始 offer、情境、理由、关键事件、药覆盖及池诊断。池丢弃和设计上限跳过分开统计。
- 池峰值为每次 driver 迭代结束采样；不捕捉同一 tick 内短暂峰值。wallSec 为本机运行耗时，不代表设备单帧表现。
- 三组并非严格单变量消融，不能把差异直接归因于某个药/武器/局外项。flee/spore 也不等于真人新手/高手。
- 0 次错误或丢弃只是本样本观察。正式平衡结论需结合主 A/B、更多种子及真人/真机试验。

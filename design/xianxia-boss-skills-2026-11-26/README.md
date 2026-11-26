# M08 回旋尾扫（2026-11-26）

| 片段 | job | 视频 asset | 参考 asset | seed | 结果 |
|---|---|---|---|---|---|
| crocodile-humanoid M08 v2 | job_WaVgfBuPpdoTmiXLPeqiAs5Z | asset_h2FgvHwUcuk9k7gKG5osFN7w | asset_jovFFtTTRHyMaYbRnBUuzhj6（v4 缩到 62% 留白） | 202611262 | 部分可用：源 24–80 尾巴拉长、身体前倾，跳过；前摇 2–16 屈膝，生效 17/19/21/23 尾巴扫到身前，收招 81–117 |
| crocodile M08 v2 | job_QVthaHq73TSjJJB2C72iZvBe | asset_inRgKkMCJy4qiLEc9wY2kRdL | asset_D2AhTVbYYYURZVPXRy2p67BS（留白） | 202611261 | 通过：身体四足不动，只甩尾；源 16–18 尾尖贴边，跳过 |

- 导出脚本修正：重新适配时把锚点也算进范围，否则妖鳄片段锚点 y=1.0038 超出格子，运行时校验会拒掉整张图集。
- 运行时：M08 改播 `tail`（替换 11-24 的横扫临时动作）；片段名白名单加 `tail`。
- 真实游戏：鳄王（第 4 层 Boss）、妖鳄精英在 1280×720 和 844×390 下均通过。
- 已知问题：鳄王收招第一帧有跳接（从尾巴扫出直接回到屈膝姿态）。
- 至此所有有动作图集的怪物，行走、普攻、技能都已有动作。

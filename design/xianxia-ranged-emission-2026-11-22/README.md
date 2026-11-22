# 远程弹体出射点复查（2026-11-22，用户反馈有的从脚下发出）

`node scripts/audit-ranged-emission-2026-11-22.cjs`：每个远程形态×品阶各取一个真实原型，真实 AI 走位并射击，截取弹体出现第一帧。

| 形态 | 改前位置 | 改后 |
|---|---|---|
| 妖蝠 bat（音波） | 头下方空处，看起来贴着爪子／脚下 | 嘴 (.395,.60) |
| 妖隼 falcon（飞羽） | 背上 | 喙 (.285,.635) |
| 隼将 falcon-humanoid（飞羽） | 胸口 | 喙 (.325,.235) |
| 蛇后 snake-lady（毒液） | 下巴／脖子 | 嘴 (.41,.235)，吐息 M03 同步 |
| 妖蛇 snake、蝠将 bat-humanoid、蝎 | 已在嘴／蛰针 | 不变 |

坐标按当前立绘重测（`landmarks-before.png` 黄圈为旧点，`landmarks-remeasured.png` 青圈为新点）；对照 `game-before.png` / `game-after.png`。
弹体发出后仍按原设计在约 220 单位内平滑下降到地面判定线，碰撞不变。
`scripts/verify-monster-emission.cjs` 修复了普通怪射击冷却导致的夹具失败，并更新坐标：96 组发射 + M10/M03 附着点通过。

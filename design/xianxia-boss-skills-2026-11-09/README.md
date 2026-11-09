# Boss 技能动作第一批（2026-11-09，Scenario 40 CU）

| 形态 | 技能 | 片段 | 来源目录 | job | asset | seed |
|---|---|---|---|---|---|---|
| 撼地熊王（bear-humanoid） | M07 裂地重踏 | stomp | bear-m07 | job_neuk5nP5dCuUKiiQTkMz19nM | asset_DQ4cLAf1seecyESQBiVU7ZyV | 202611092 |
| 撼地熊王（bear-humanoid） | M04 岩甲蛰伏 | guard | bear-m04 | job_5GEea6AxRDYrKE8Z5NMBfupe | asset_YSfRWvi81iRRp8KcHHkmykpZ | 202611093 |
| 震岳犀王（rhino） | M07 裂地重踏 | stomp | rhino-m07 | job_RRFzHvZspStwDN7GgFVywDgA | asset_pj2JL62veKFXhGycy2j5dneh | 202611094 |
| 牛魔王（yak） | M15 环形震波 | roar | yak-m15 | job_29acSkBf651wdJ3PxkpdwUfK | asset_DgWqnaVBVmpCwoTd5jZF5uzg | 202611095 |

模型 P-Video 2 Pro，480p，5 秒，首尾帧同图，每条 10 CU。完整参数、原片 sha256 和取帧序号在 `production.json`，prompt 可用 `job_get verbose=true` 查。两条熊王 job 在当天工作表里写反过，已按 job 元数据（prompt 和 seed）核对，上表正确，文件夹内容也对应。

## 片段格式
- 16 帧：windup 6、active 2、recovery 8，fps 10。
- 先在 480 格合成，再存为 384 格（犀王 320 格），用每帧 `displayScale` 还原到 480 显示尺寸，图集宽不超过 3840。
- 已有帧逐字节保留（`export.json` 里的 keptPixelHashes）。接入前的运行图在各族的 `runtime-before.png/json`。

| 运行图 | 尺寸 | 帧数 | 片段 |
|---|---|---|---|
| bear-humanoid-v1 | 3840×3552 | 68 | move, slam, stomp, guard |
| rhino-v1 | 3840×4000 | 71 | move, sweep, charge, stomp |
| yak-v1 | 3840×3168 | 52 | move, slam, roar |

## 接入
`TowerMonsterArt.ts` 的 `motionFrame`：把犀王 M06/M20 的技能阶段分支改成一张表，熊王 M07→stomp、M04→guard，犀王 M07→stomp，牛魔王 M15→roar，按 mechanic 阶段计时（windup 从 startedAt 到 until，其余从进入阶段到 until）。`validMotion` 白名单加了 stomp、guard、roar。

M07 和 M15 在生效那一帧就转入 recovery，没有 mechanic active 阶段，所以这两个技能的 recovery 从片段的冲击帧（第 6 帧）开始，共 10 帧。M04 有 8 秒 active，期间保持交叉双臂的两帧。

仍保持立绘：熊王 M09、M02，犀王 M20 未开始冲锋时，牛魔王 M19、M05。M04 被击碎结晶后转入 M23（妖核暴露），也是立绘，不会播放 guard 的收势。

没有改玩法、数值、技能逻辑或名单。改动前的文件：`TowerMonsterArt.ts.before`、`animation.test.mjs.before`。

## 验证
- 定向测试 102/102 通过（断言改为：上述技能按阶段播放，其余技能保持立绘，图集尺寸和帧数更新）。
- web-mobile 构建成功（`build.log`）。
- 实机 `verify.cjs`：24 组通过（4 个技能 × 左右 × 1280×720 / 844×390，加上每个 Boss 一个保持立绘的技能）。走真实模拟：只放开目标技能的冷却，M04 把血量设为 50% 以满足触发条件。检查每阶段帧都在对应范围内、至少 6 个不同帧、朝向、暂停冻结、死亡只清一次、localStorage 不变。报告在 `game-review/report.json`，截图在 `game-review/`，拼图 `game-active-montage.png`。

## 已知问题
- 844×390 下熊王重踏时头部超出屏幕上沿（Boss 体型大、居中在玩家附近），同 11-07 熊王举拳压 Boss 血条的问题。
- 熊王 guard 的 active 只有两帧，8 秒内几乎静止，只有呼吸程度的差异。
- 牛魔王 roar 张臂时身体偏正面。
- 三张图集变大（最大 3840×4000，约 59 MiB 解码后），没有做手机内存检查，也没有真机验证。

# 第二批技能动作（2026-11-11，Scenario 50 CU）

请求来自 `design/xianxia-boss-skills-2026-11-10-prep/`，原样提交。job 和 asset 在 `jobs.json`，都从返回结果复制。有两次等待调用填错了 job ID，返回 404，没有生成任务，也没有扣费。

| 形态 | 技能 | 片段 | job | asset | seed |
|---|---|---|---|---|---|
| 牛魔王 yak | M19 六门避劫 | channel | job_dbeDbmDrH9KiQ1FwuzPBmENE | asset_7WsLugsKDBLz8JvQjMFRZ6ak | 202611101 |
| 犀王 rhino | M20 引兽破阵（冲锋前） | brace | job_4eAekr67uwP3MvPrKgxxNf2S | asset_dHDhYvDb5YLuWuDdbtbSkFBU | 202611102 |
| 狼妖精英 wolf-humanoid | M05 号令群妖 | howl | job_3y2ioNyerJxUTNSANpWRAhxn | asset_u5mofpcg6dE5cB9fB28ezQB4 | 202611103 |
| 虎妖精英 tiger-humanoid | M07 裂地重踏 | stomp | job_QRHHc4AMbbN5cmGPre1qmWzV | asset_zjbL6PBQD9KE52T3t5VNd6Cq | 202611104 |
| 隼妖精英 falcon-humanoid | M07 裂地重踏 | stomp | job_SDiFq2vvMGcc2DZMyqQqLQLC | asset_4c8P6GhuaHusznE3byLAxuY6 | 202611105 |

原片在各目录的 `original-v1.mp4`，逐帧在 `raw-frames/`。

## 处理
- 虎妖重踏落地后自带黑色碎石和地裂（源帧约 55–84）。`clean_tiger.py` 先只保留和躯干连通的部分，去掉飞出的碎石；再在脚下地带去掉暗色裂缝，结果在 `clean-frames/`。源帧 53 是糊掉的过渡帧，没有选用。
- `export.py` 由 11-09 的导出脚本复制而来，加了“优先读 clean-frames”和“按片段设帧数”两项。取帧窗口写在脚本的 JOBS 里（从 0 开始的源帧序号）。
- 犀王图集已经满了，brace 只放得下 9 帧（windup 3、active 2、recovery 4，320 格），其余片段都是 16 帧。
- 原有帧都逐字节保留（`export.json` 的 keptPixelHashes）。接入前的运行图存为各族的 `runtime-before.*`。

| 运行图 | 尺寸 | 帧数 | 片段 |
|---|---|---|---|
| yak-v1 | 3840×3552 | 68 | move, slam, roar, channel |
| rhino-v1 | 3840×4000 | 80 | move, sweep, charge, stomp, brace |
| wolf-humanoid-v1 | 3840×3168 | 52 | move, sweep, howl |
| tiger-humanoid-v1 | 3840×3168 | 52 | move, sweep, stomp |
| falcon-humanoid-v1 | 3840×3168 | 52 | move, sweep, stomp |

## 接入（`TowerMonsterArt.ts`，改前文件 `TowerMonsterArt.ts.before`）
- 技能表新增：犀王 M20→brace，牛魔王 M19→channel，狼妖 M05→howl，虎妖和隼妖 M07→stomp。白名单加 channel、brace、howl。
- M05 和 M19 也是生效当帧就转入收势，加进 instant 列表，收势从 active 帧开始播。
- M20 一开始就直接进入 2 秒的布阵 active，没有 windup；开始冲锋后另有自己的 windup，仍播 charge。所以 brace 在布阵期间连续播放 windup 和 active 两段。
- 仍是立绘：牛魔王 M05、虎妖 M06/M03、隼妖 M11，以及所有射击。没有改玩法。

## 验证
- 定向测试 102/102 通过（`animation.test.mjs.before` 是改前的测试）。改动内容：
  - 新技能的阶段断言；
  - 五张图集的尺寸和帧数；
  - 两个预加载测试原来写死 `ImageAsset(2880,2880)`，现在按清单尺寸生成。
- web-mobile 构建成功。
- 实机 `verify.cjs` 22 组通过：5 个技能 × 左右 × 1280/844，加上牛魔王 M05 保持立绘的检查。走真实模拟，并检查朝向、暂停冻结、死亡清理和存档。
  - 犀王 M20 只统计冲锋开始前的帧，冲锋开始后切到 charge。
  - 截图在 `game-review/`，拼图 `game-844-montage.png`。

## 已知问题
- 隼妖重踏时，右翼在源帧 18–78 被视频画面右边裁掉，翼尖是一条直边。
- 牛魔王举手时，角尖在源帧 25–70 碰到画面上沿，被裁掉几个像素。
- 犀王 brace 只有 9 帧，比其他技能稀。
- 虎妖重踏的 active 帧头顶残留一个很小的暗点（碎石残留）。
- 五张图集都没做手机内存检查，也没在真机上验证。

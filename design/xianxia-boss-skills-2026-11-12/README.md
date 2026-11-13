# 第三批技能动作（2026-11-12，Scenario 50 CU）

请求由 `make_requests.py` 生成，模型和参数与前两批相同：P-Video 2 Pro，480p，5 秒，首尾帧同图，promptUpsampler off，每条 10 CU。job 和 asset 记录在 `jobs.json`，都从返回结果复制。蛇女那条第一次写入时 asset ID 写错了，读到结果后已改正。下载链接存在 `urls.json`，`download.py` 负责下载并逐帧导出。

| 形态 | 技能 | 片段 | job | asset | seed |
|---|---|---|---|---|---|
| 蝠妖精英 bat-humanoid | M07 裂地重踏 | stomp | job_q3CyeoJmbJpkgbmErTennVpY | asset_QCq1Brg3UgXXwCHR5bufowmH | 202611121 |
| 镇魇白虎 white-tiger | M06 裂岩冲锋 | charge | job_YHpsCPyC2Eb7hfhjuxsYGgsb | asset_wm2Dknwkpz4cS6cn7nqjTPSq | 202611122 |
| 镇魇白虎 white-tiger | M19 六门避劫 | channel | job_jjomatzbjk3VdzVUeiUUPjAr | asset_T2QsD7Z94N91CqsrXQm5zTqr | 202611123 |
| 镇魇白虎 white-tiger | M01 镜魄分身 | cast | job_os1L34X1k9Uwqyije3JsjUmw | asset_xxjFEhsPXWZUxv5UHkgdyChw | 202611124 |
| 赤鳞蟒王/蛇女 snake-lady | M03 汲灵回生 | heal | job_XLSx8CK5vK7wxh5chepErtxM | asset_fEtTcfKxyL69UuUDgADnYtvV | 202611125 |

故意没做：
- M02 狂暴：按 65 号规范要走完整的狂暴流程（变红、放大、持续期间所有动作保持），不是单个片段能解决的。
- 蛛姬 M10：是蛛网弹体，按约定射击类放到最后。
- 蛇女 M16：要先出关键帧。

## 导出（`export.py`，复制自 11-11）
- 四族原本都只有 16 帧行走（1920² 图集）。这次新片段存为 384 格，原有帧逐字节保留。
- 白虎 charge 的 active 期间是原地快跑，取 6 帧；windup 6 帧，recovery 4 帧。其余片段都是 6/2/8。

| 运行图 | 尺寸 | 帧数 | 片段 |
|---|---|---|---|
| bat-humanoid-v1 | 3840×1728 | 32 | move, stomp |
| white-tiger-v1 | 3840×2880 | 64 | move, charge, channel, cast |
| snake-lady-v1 | 3840×1728 | 32 | move, heal |

## 接入（`TowerMonsterArt.ts`，改前文件 `TowerMonsterArt.ts.before`）
- 技能表新增：蝠妖 M07→stomp；白虎 M06→charge、M19→channel、M01→cast；蛇女 M03→heal。
- M01 生效当帧就收势，加进 instant 列表。
- 白名单加 `heal`；`cast` 原本就在白名单里。
- 白虎冲锋的朝向沿用现有 M06 逻辑，朝向冲锋目标。
- 仍是立绘：白虎 M02、蛇女 M16/M11、所有射击。

## 验证
- 定向测试 102/102 通过（改前测试在 `animation.test.mjs.before`）。
- web-mobile 构建成功。
- 实机 `verify.cjs` 20 组通过：5 个技能 × 左右 × 1280/844。用到的怪物：
  - 第 4 层蝠妖精英 bat_elite_f4_w15_n4
  - 第 9 层白虎 tiger_boss_zhenyan（M06 满血；M19、M01 半血，满足触发条件）
  - 第 5 层蛇女 snake_boss（半血）
- 截图在 `game-review/`，拼图 `game-844-montage.png`。

## 已知问题
- 蝠妖重踏时翅膀张开，右翼在源帧 17–90 碰到视频画面边缘，翼尖被裁成直边。
- 白虎冲锋原地快跑时，有几帧双脚离地，看起来像在跳。
- 白虎举手（M19）时手掌在源帧 43–60 碰到画面上沿。
- 蛇女回生动作幅度小，主要是双手抱胸和呼吸起伏。
- 没有做手机内存检查，也没在真机上验证。

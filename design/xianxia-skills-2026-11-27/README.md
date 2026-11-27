# 2026-11-27 蝠将咬击与精英 M07 专属动作（50 CU）
此前这几处都借用其他片段：蝠将普攻咬击借 shot 嘶鸣加程序前扑；妖蝠、妖隼、妖蛇精英的 M07 裂地重踏借 shot，蛇后借 cast。今天各生成一条专属片段。
| 片段 | job | 视频 asset | seed | 结果 |
|---|---|---|---|---|
| bat-humanoid-bite | job_kiEcesiaagX5asAk2x1RWiqG | asset_oSKE5CB1Q9G5LgMSDizvoHoR | 202611271 | 抢救通过：24–52 嘴里喷红光，跳过；前摇 2–24，生效 54/60/64（张嘴咬合），收招跳过翅膀贴边的 68–72 |
| snake-m07 | job_WtHuWgkWYagWGfXiv526rvBz | asset_rVzGKoSkNibAXVKNjmwpaZVx | 202611274 | 抢救通过：24–52 粉色光带和飞石，跳过；前摇 2–22 昂首，生效 56/60/64 头砸地，收招 66–100；尾边粘着一小块碎石 |
| snake-lady-m07 | job_SWsqpzp84G1FBKywN544fGZS | asset_qDd2MNqdrRYqJjiAc4oqGWvd | 202611275 | 抢救通过：28–36 拖影和绿色光圈，跳过；前摇 2–19 扬尾，生效 26/40/44 甩尾下砸，收招 48–110 去掉飘散碎屑；图集只剩 15 格，片段 5+3+7 帧 |
| bat-m07 | job_Y7QLSihDQfHQuM7CxfthgNfm | asset_7vQJHojoJpwjEYuzcs2oGoSq | 202611272 | 抢救通过：35–59 多扇了一次，跳过；前摇 2–25 举翅，生效 26–34 下扇，收招 60–94 |
| falcon-m07 | job_5MTWfi48sJmKKpFfakRPH427 | asset_mJ2tbwjmrzkVjc4xHN2QjKuL | 202611273 | 抢救通过：29–65 多扇了几次，跳过；前摇 2–23 举翅，生效 24/26/28 下扇，收招 66–90 展翅回到悬停 |
- 五条都自带了提示词禁止的特效或多余动作，全部是跳帧抢救，没有整条直接可用的。
- 导出：`export.py`（复制自 11-26，新增 `degreen` 去掉残留绿色）。蛇后图集已用到 4096 宽的 256 侧栏。
- 运行时：蝠将 bite 改播 `bite`，去掉借用时的程序前扑；妖蝠、妖隼、妖蛇、蛇后精英 M07 改播 `stomp`。
- 真实游戏：1280×720 与 844×390 下普攻、技能、发射物验收全部通过；npm test 2401/2401。

## 2026-11-27 later: local fixes (no CU)

- Snake M07: grey rock shards stuck to the tail and body on the slam frames. `degrey` (grey blobs of at least 150 px) runs on clip frames 6-9 only, because on later frames it cut belly highlights; the remaining loose bits on frames 6-10 and 13 are removed with hand-placed `erase` circles. Some pale smear stays where a shard overlapped the body; erasing it would cut holes in the tail.
- Bat-humanoid bite: the recovery jumped from the lunge (source 66) straight to standing (74, thumbnail diff 17.7). Recovery is now `[66, 67, 68, 70, 72, 74, 78, 92]`. On 68-72 the wing tip is cut by the right frame edge, so the new `fadeRight` option fades the last 28 px of those frames to transparent instead of leaving a flat cut.
- Atlas sizes are unchanged (snake-v1 3840x3360, bat-humanoid-v1 3840x3264).

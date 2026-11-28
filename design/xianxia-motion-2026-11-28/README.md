# 2026-11-28 补动作：蛇后普通撕咬、妖蝠与鳄鱼受击/死亡、猪将受击/死亡（50 CU）

| 片段 | job | 视频 asset | seed | 结果 |
|---|---|---|---|---|
| snake-lady-bite | job_1rgzsex7HW2XswW7ENNQyFFA | asset_dN7r7CYbZ9X4HLpdY9fsSn8u | 202611281 | 未通过：28 起脸变成蛇口獠牙，喷红雾，满屏红色碎屑 |
| snake-lady-bite-v2 | job_ycwE4GFmv9eCqpiVPgmXyrX5 | asset_9qcn4iQgtL6HDRagdTHrHPGM | 202611283 | 抢救通过：26 起整身红光；只用 2–22 后仰和双爪前探，收招倒放；幅度偏小 |
| bat-hit-death | job_SYd41cK55S5P4mHy5awZ3PWc | asset_qtf92tYVn4aCVzg7SJ3Y5WfP | 202611282 | 通过：一条视频拆两段。受击 12–28（跳过 18–20 翅膀扭成一团），死亡 70–104 失力下坠后侧躺 |
| boar-humanoid-hit-death | job_rrCqej63EMZKct8Q6KBieaaH | asset_mirVdUPDj1rLvdfqLs6uteze | 202611285 | 通过：受击 14–33 头胸后仰回正；死亡 86–116 跪倒前扑，脸朝下静止 |
| crocodile-hit-death | job_2BeX3DrDS6iw82s6i7tzxfXc | asset_su3QPLRJ1zGpu4zVqWNbUCmY | 202611284 | 抢救通过：受击 2–10 抬头后仰来回播放（12 起转侧身，跳过）；死亡 56–76 趴倒，末段眼睛有点红光 |

- 试制结论：一条 5 秒视频"受击→回正→再受击死亡倒地"可以同时拆出受击和死亡，后续族系按此做，每族 10 CU。
- 导出：`export.py`（复制自 11-27）。新增 `REPACK`：图集放满时整张重排到 4096 宽，原 480 格缩成 384（仍高于 256 原生下限）。
  - 蛇后：4096×3904 不变，126 帧；新撕咬 256 格。原 480 的行走帧缩到 384，Boss 屏幕宽约 245 设计像素，手机 3 倍屏上约 400 物理像素，基本 1:1。
  - 妖蝠：3840×3936 → 4096×3840，92 帧。鳄鱼：3840×3648 → 4096×3456，85 帧。两者屏幕尺寸都远小于 384。
- 运行时（`TowerMonsterArt.ts`）：普通蛇后撕咬播 `bite`；有 `hit` 片段的族系在站立时掉血播 0.4 秒受击（移动时仍播行走）；有 `death` 片段的族系击杀后播死亡再清理（原有逻辑）。
- 猪将：图集 3840×3360 → 3840×4000，76 帧（新帧 320 格，无需重排）。
- 真实游戏：1280×720 与 844×390 下普攻、技能、发射物验收通过；妖蝠、鳄鱼普通/精英与普通猪将受击与死亡逐帧确认，截图在 `game-review/`。npm test 2408/2408。

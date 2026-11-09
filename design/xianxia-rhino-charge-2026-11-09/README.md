# 震岳犀王冲锋已接入（2026-11-09，Scenario 10 CU）
- 生成：job_qJxnp3i5mZaDrFrJm6CkijxN，视频 asset_Ri1TrEWvigksvHANMt24QMCs，seed 202611091。
- 参数：P-Video 2 Pro、480p、5 秒、首尾帧同图、mode cost、promptUpsampler 关。
- 参考图复用 11-08 补过空洞的 asset_xHFnkJEhmdCehpxpxQSjEUEk（`rhino-reference-green.png`）。
- 原片 `original-v1.mp4`，逐帧 `raw-frames/`。

## 犀王冲锋走的是技能，不是普攻
犀王有 M06 裂岩冲锋技能。`monsterAttackSpec` 在怪物有 M06 时会屏蔽普攻 charge，所以犀王的冲锋只会通过 M06 出现；M20 引兽破阵在 `chargeStarted` 后也会冲向机关柱。
接入时按技能阶段播放 charge 片段，没有改任何玩法、数值或技能逻辑：
- 前摇：M06 的 startedAt 到 until。
- 生效、收招：从进入该阶段起算，到该阶段的 until。
- 普攻 charge 的路由也加上了，但犀王实际不会触发它。

## 导出（`export.py`）
- 共 20 帧。前摇取源帧 4–24（压低、刨蹄），生效取 28–96（低头原地快跑），收招取 100–123（挺直回站姿）。
- 整段用一个缩放，和行走第 0 帧的身高、中心、脚底对齐，没有帧碰到画布边缘。
- 原有行走 15 帧、横扫 20 帧逐字节保留。图集改为 8 列 3840×3360（55 帧），接入前的运行时文件存为 `runtime-before.png/json`。

## 接入（`TowerMonsterArt.ts`，改前副本 `TowerMonsterArt.before.ts`）
- M06 和已开始冲锋的 M20 播放 charge 片段。M07、尚未冲锋的 M20 仍保持立绘。

## 验证
- 定向测试 102/102 通过：犀王测试新增 M06 和已开始冲锋的 M20 三阶段必须落在 charge 帧段；M07 和未冲锋的 M20 仍是立绘；图集 3840×3360、55 帧。
- 构建成功。
- `verify.cjs` 在第 7 层直接驱动真实 M06 技能，和 sweep 一起测，左右两个方向 × 两种横屏共 8 组通过，两段都播满 20 帧。
- `shot-m06.cjs` 在 M06 生效阶段截图（`game-review-m06/zoom.png`）：犀王低头、犀角朝前，沿技能冲锋道冲向玩家，左右两个方向都正确。

## 已知问题
- 源片冲锋段有少量绿色碎点，去绿后基本消失。前摇有一帧犀角带一点黄绿色。
- 生效阶段在 0.4–0.6 秒内只播 3 帧，连续播放可能显得卡顿。
- 图集未压缩约 49 MiB，和猪妖一样，微信真机内存还没验证。
- 真机没有验证。

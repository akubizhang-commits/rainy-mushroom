# 赤鬃猪妖獠牙拱击（bite）已接入（2026-11-07，Meowa 15 积分）
今日 Scenario 已用完，这条改用 Meowa Frame Animation V2。参数：HD、480p、首尾帧都用同一张图、24 帧档、高帧率、不去背、绿底 #00ff00、prompt 不优化。
- job_17a9392ec0db4084bce2879a137f6d2f，花 15 积分，余额从 20 降到 5。
- 参考图复用行走用的 `reference-green.png`，没有重画。prompt 在 `prompt.txt`。
- 原片 `v1/task/meowa_animation.webp`：640px，73 帧，每帧 42ms。逐帧在 `raw-frames/`。

## 导出（`export.py`）
- 共 20 帧。前摇取源帧 6–22（低头压肩），生效取 22–30（向左低头前冲挑獠牙），收招取 30–62（回到站姿）。
- 整段用同一个缩放（0.7659），让源片第 0 帧和运行时行走第 0 帧的身高、中心、脚底对齐。
- 前冲最左那几帧离画布边不足 8px，所以整段平移收进画布，再用 anchor [.5761,.9514]（displayScale 1.0）把接地点对回行走。
- 原有 16 帧行走逐字节保留。图集从 1920² 变为 2880²。接入前的运行时文件存为 `runtime-before.png/json`。

## 接入（`TowerMonsterArt.ts`，改前副本 `TowerMonsterArt.before.ts`）
- boar-humanoid 只在 bite 时播放 bite 片段。charge 冲锋和 M06 仍保持立绘。

## 验证
- 定向测试 99/99 通过。boar-humanoid 测试已改为 bite 三个阶段都必须落在对应帧段，charge 仍是立绘，图集 2880²、36 帧。
- 构建成功。
- `verify.cjs` 按真实攻击计时测 boar_normal_r4，左右两个方向 × 两种横屏共 4 组通过。每组都播满 20 帧，暂停冻结和朝向也正确。截图在 `game-review/`，放大图是 `zoom-1280.png`。

## 已知问题
- 前摇阶段身体缩得偏多，看起来像先往后缩。
- 生效帧的朝向接近正面，獠牙挑起的幅度不大。
- 冲锋（charge）仍是立绘。
- 真机没有验证。

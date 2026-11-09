# 伏潭鳄王、镇魇白虎行走已接入（2026-11-07，Scenario 30 CU）
两条都用 Scenario P-Video 2 Pro（480p、5 秒、首尾帧同图、promptUpsampler 关），每条 10 CU。

| 形态 | job | 视频 asset | 参考 asset | seed | 结果 |
|---|---|---|---|---|---|
| crocodile-humanoid | job_jz35kGjPCiKSSWL2GJNm6Txu | asset_1qcPgFD1pxX935FZY8NtMLVF | asset_GwQAHP6xTQrX7yTbbRqXJDvA | 202611075 | 接入 |
| white-tiger v1 | job_V9sLzux34syENM9v1UmwQ6LX | asset_2ficinEouG86Lya22M7V5U95 | asset_TkDxKfuH9zLahvpftUTxVGpn | 202611074 | 未接入，保留 |
| white-tiger v2 | job_ZkofZibELoZ7RXeNYXnNDgk9 | asset_CzTsrTdEWwZLL2R9xhPeCuCE | asset_sdvagHTpWgSxuFactVjRZgvD | 202611076 | 接入 |

原片和逐帧：
- 鳄王在 `../xianxia-crocodile-humanoid-walk-scenario/`。
- 白虎在 `../xianxia-white-tiger-walk-scenario/`：v1 是 `original-v1.mp4` 和 `raw-frames/`，v2 是 `original-v2.mp4` 和 `raw-frames-v2/`。

## 白虎 v1 为什么没用
v1 参考图的银发里有透明空洞，模型把空洞里的绿底当成头发颜色，银发被染成黄绿色。后期抠色（`key_whitetiger.py`）去不干净，没有采用。v2 先把参考图的空洞补上（`reference-green-v2-filled.png`，补前的图是 `reference-green-v1-holes.png`），再重新生成。v2 的头发保持银灰色。

## 导出（`export.py`）
- 每族 16 帧，原生 480px 格子，1920² 图集。整族只用一个缩放和一个偏移，不做逐帧校正。
- 鳄王：源帧 39 起、长 43 帧（1.79 秒一圈）。尾巴和身体的并集超出画布，所以按 8–472 收进画布，再用 displayScale 1.0086 / anchor [.4498,.9298] 恢复显示大小和脚底位置。
- 白虎：v2 源帧 65 起、长 39 帧（1.625 秒一圈，按首尾差最小选的步态周期）。没有帧碰到画布边缘，不需要 displayScale。

## 接入（`TowerMonsterArt.ts`）
- 两族加入行走族，只在实际位移时播放；静止、普攻（sweep）、技能都保持立绘。
- 鳄王技能 M08/M12/M02，白虎技能 M06/M01/M19/M02，都保持原有表现。
- 改前副本：`TowerMonsterArt.before.ts`（加鳄王前）和 `TowerMonsterArt.before-white-tiger.ts`（加白虎前）。

## 验证
- 定向测试 99/99 通过（`tests-targeted-white-tiger.tap`）。新增两条行走测试。两条旧断言原本要求白虎不加载动作图集，已改成只加载 `white-tiger-v1`。
- web-mobile 构建成功（`build.log`）。
- `verify.cjs` 实机共 16 组通过：crocodile_boss（第 4 层）、crocodile_elite_f5_w10_n2/n3（第 5 层）、tiger_boss_zhenyan（第 9 层），每项都测了左右两个方向和两种横屏尺寸。检查项包括真实位移、16 帧完整循环、暂停、静止和出招回到立绘、技能阶段保持立绘、击杀清理和存档不变。截图在 `game-review/`，总览图是 `game-review/screens.png`。

## 已知问题（先接入，后续优化）
- 白虎走路时身体偏正面，朝向不够侧。尾巴只在部分帧露出。
- 鳄王的显示大小靠 displayScale 补回了 0.86%，画面可能比立绘稍软。
- 两族的 sweep 普攻仍是立绘。
- 真机没有验证。

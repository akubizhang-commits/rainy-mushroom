# 2026-11-25 技能请求（共 50 CU）

用户 11-24 确认：蛇女 M16 关键帧验收通过；恢复鳄类 M08 制作。

已上传参考（上传不花 CU）：
- 蛇女原姿（绿底）asset_AM5fLFqkJhKPDb7K4hZK1zTx；A 左转张嘴 asset_tFXfMfjNC3zK9BcfgP7mCmdc；B 右转张嘴 asset_WEiyRu83gEXatucWPRF17tPs。来源见 `design/xianxia-snake-lady-breath-meowa/keyframes/`（A/B 已按母图身高、底边中心对齐）。
- 妖鳄留白参考 asset_D2AhTVbYYYURZVPXRy2p67BS（`design/xianxia-crocodile-actions-2026-11-04/reference-tail-padded.png`）。鳄王用已有 v4 参考 asset_4SZW8NdPbWzXr1CFMost2D5m。

| 请求 | 首帧 → 尾帧 | 对应阶段 |
|---|---|---|
| snake-lady-m16-windup | 原姿 → A | M16 前摇 2 秒 |
| snake-lady-m16-sweep | A → B | M16 生效 3 秒（判定在朝向 ±0.35π 内扫过） |
| snake-lady-m16-recovery | B → 原姿 | M16 收招 3 秒 |
| crocodile-m08 | 原姿 → 原姿 | M08 前摇 1.2 秒，发动 0.2 秒内命中，收招 2 秒 |
| crocodile-humanoid-m08 | 原姿 → 原姿 | 同上 |

接入时 M16 需逐帧标记口部挂点，吐息要跟着嘴走。M08 片段需检查尾尖不出画、尾长不漂移、收势回到原姿（11-04 百炼两版就是败在这三点）。

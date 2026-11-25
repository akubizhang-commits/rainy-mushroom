# 技能动作（2026-11-25，50 CU）

| 片段 | job | 视频 asset | 首帧 → 尾帧 | seed | 结果 |
|---|---|---|---|---|---|
| snake-lady M16 前摇 | job_6dody1FyQoWGgsAwZAfWiSkT | asset_5aqYcShfd28oHDnxrytfyaAg | 原姿 → A 左转张嘴 | 202611251 | 通过 |
| snake-lady M16 生效 | job_yuFEu5jJar1JoTnTJRP52WcQ | asset_kGVTZTqi2tuEU5md2NFa4jcJ | A → B 右转张嘴 | 202611252 | 通过 |
| snake-lady M16 收招 | job_yBARPgjkAd4qYvWpmWnk61Qt | asset_HZc1SxwbRM41A4fsYQeXBKJx | B → 原姿 | 202611253 | 通过，源 35–74 嘴边有白色光点，跳过 |
| crocodile M08 | job_hgpmBCdLcijDnES5BhTuuijZ | asset_TFKGJ9qFbjv71QLCihccxwNR | 留白参考 | 202611254 | 不通过：整只转身、尾巴出画 |
| crocodile-humanoid M08 | job_vYTSkn9BsF8Yo736r9QasWNh | asset_HkxNgB4hJQFkMDpUQFPXB5aK | v4 参考 | 202611255 | 不通过：尾巴变长，26–58 帧贴边被切（提示词在请求基础上改为身体始终朝左） |

- 导出：`export.py snake-lady`（新增按阶段取不同视频 `srcs`），breath 片段 30 帧：前摇 8、生效 12、收招 10，320 格（≥256）。
- 运行时：M16 播 breath；片段名白名单加 `breath`；`mouthPosition` 在 breath 帧里按逐帧实测的口部 UV（`breathMouth`，9 个关键帧线性插值）取位置，并补上向各族渲染器的分派。
- 真实游戏：`verify-skill-clips-2026-11-24.cjs` 新增第 5 层蛇女 Boss，前摇/生效/收招 30 帧全部播放；`game-review/m16-active-*.png` 6 张截图显示吐息起点跟着嘴的摆动。
- 鳄类 M08 仍用横扫作临时动作，明日重试请求见 `design/xianxia-skills-2026-11-25-prep/*-v2-request.json`。

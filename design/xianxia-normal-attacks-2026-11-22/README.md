# 普通攻击动作补缺（2026-11-22，Scenario 30 CU）

优先级（用户 2026-11-22）：先移动和普通攻击，再技能。移动：11 个常驻族系的运行时形态都已有行走片段。普通攻击缺口（出招时仍是立像）：鳄王 sweep、白虎 sweep、蛇后吐毒 shot、蛛姬 bite／蛛网、蝠将 bite／音波 shot；妖蛇、妖隼、妖蝠及隼将的远程 shot。

P-Video 2 Pro、480p、5 秒、首尾帧同图、mode cost、promptUpsampler 关。请求在 `*-request.json`。

| 片段 | job | 视频 asset | 参考 asset | seed | 结果 |
|---|---|---|---|---|---|
| crocodile-humanoid sweep | job_Yz9NLSCbuaCS3MJ7B8f8vV2o | asset_S9NxCGGW3zhgFxnYgDAzjhc2 | asset_4SZW8NdPbWzXr1CFMost2D5m（v4 重排版） | 202611231 | 通过，已接入 |
| white-tiger sweep | job_ba2Qm5UQ5hrqNoeDLRN5dbN6 | asset_JDioHj6fS4ndtZdhvdb6QmFk | asset_sdvagHTpWgSxuFactVjRZgvD | 202611232 | 不通过：出爪时带黑绿拖影和红色爪光 |
| snake-lady shot | job_P2QWCBJKdD7HqsfVeN3wf5FX | asset_i8AkcuJihbtkPD8uigBaWLGR | asset_a3gfcgGDVP14LaphGjdtPRkf | 202611233 | 不通过：脸变成巨大红口、喷出红色飞沫，尾巴大幅甩动 |

未通过的视频和拆帧全部保留（`*-v1.mp4`、`<片段>/raw-frames/`）。

## 鳄王 sweep 导出
- `export.py crocodile-humanoid`：20 帧，前摇 9（源帧 8–34）、生效 3（34–46）、收招 8（46–92），384 格，fit displayScale 1.0566。
- 运行时：鳄王普攻 sweep 与 bite 都播放 sweep 片段（与狼将、虎将相同）；M08 仍静态，M12 cast、M02 enrage 不变。
- 真实游戏：`node scripts/verify-croc-sweep-2026-11-22.cjs`，技能全部冷却，Boss 走近后出招，前摇/生效/收招三段 20 帧全部播到，没有混入立像。

## 下一步
- 白虎 sweep 重做：提示词去掉“fast strong”，明确禁止拖影、残影、动态模糊和爪光。
- 蛇后 shot 改为不张大嘴的前探吐信，禁止任何液体和飞沫。

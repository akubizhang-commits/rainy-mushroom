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

## 首版抢救（同日，未花额度）
- 白虎 sweep：跳过带拖影的源帧 24–33。前摇 9 帧（源 2–23，收到后拉臂），生效 3 帧（36–42，爪已伸出），收招 8 帧（42–92）。少了挥动过程，出手是“后拉→已挥出”的硬切，接近卡点式打击。
- 蛇后 shot：源 36 起脸变形、喷红雾，之后尾巴大甩，全部不用。前摇 9 帧（源 1–31，后仰蓄力），生效 3 帧（31–33，前探），收招 8 帧倒放前摇回到原姿势；发射时嘴部与出射点吻合。
- 两条都接入并在真实游戏中验收（`scripts/verify-normal-attacks-2026-11-22.cjs`）：鳄王、白虎、蛇后各自的前摇/生效/收招全部播放片段，无立像混入。

## 静态立像出招兜底（代码）
`TowerMonsterArt.attackPose`：仍是立像的普通攻击（含 bite/sweep/slam/shot/web，不含冲锋和技能阶段）在前摇时后仰、生效时前探、收招时回位；射击在出射瞬间正好回到原位，保证嘴部出射点不偏。播放片段时不生效，以后接入真动作自动替换。

## 明日请求（2026-11-23 08:00 后，50 CU）
spider-lady-bite、spider-lady-web、bat-humanoid-shot、snake-shot、bat-shot，各 10 CU；提示词统一禁止拖影、残影、液体、飞沫和变色。

## 2026-11-23 生成（50 CU，当日额度已用完）

| 片段 | job | 视频 asset | 参考 asset | seed | 结果 |
|---|---|---|---|---|---|
| spider-lady bite | job_yneL2rcBzTLDPYKCaPfkDjZu | asset_L6kBSJxJ67TiFs9UA2ArCkKz | asset_sid94dPNmSttouv8DCeD5zKo | 202611241 | 通过，已接入；前摇 2–18、生效 18–26、收招 40–70 |
| bat-humanoid shot v1 | job_KXgbs24B3YsrKZqGYRHAAdTK | asset_g6SKYuuZcK6dGBjt8dYJf5fQ | asset_QKDPGAGzk63QanMt5L4jCGaq | 202611243 | 不通过：翅膀大幅展开超出画面；拆帧保留在 `bat-humanoid-shot/raw-frames-v1` |
| bat-humanoid shot v2 | job_NuL1xHRW3ydznSuRwTKJy7vj | asset_J9BvGoi9v1DUm7Gk8cR4puMc | asset_QKDPGAGzk63QanMt5L4jCGaq | 202611246 | 通过，已接入（提示词加“翅膀收拢、四周留白”）；前摇 2–22、生效 22–30、收招 86–112 |
| snake shot | job_AdLv4Pt34Ud7mdxTH9cbeHqp | asset_K4Q3BGYgbdUnGzTcjuoHaC54 | asset_zH9DimfALdCi84zTenwg28ii | 202611244 | 通过，跳过红色喷雾源帧 29–36；前摇 2–28、生效 37/39/41、收招 44–96 |
| bat shot | job_QLAiAvjash4dxehxkDgjVYYj | asset_LwPAT6oqGkYK6jHfSKgUSjFe | asset_KzTT52a3t8YmFNy7hL3yKHkr | 202611245 | 通过，已接入；前摇 2–20、生效 22–30、收招 40–96 |

spider-lady-web（`spider-lady-web-request.json`，seed 202611242）未提交，蛛网仍用立像出招兜底。

- 运行时：蛛姬普攻 bite 播 bite 片段；妖蛇、妖蝠、蝠将的 `shot` 播 shot 片段。
- 导出修正：`export.py` 现在继承行走帧自身的 displayScale（妖蛇行走帧是 384 格、1.3068），并把行走框换算到 480 格坐标，避免片段与行走体型不一致。
- 出射点：妖蛇、妖蝠按 shot 片段张嘴帧的嘴部位置换算回立像坐标；`node scripts/verify-monster-emission.cjs` 96 组通过。
- 真实游戏：`scripts/verify-normal-attacks-2026-11-22.cjs` 新增 4 例（直接生成指定原型），前摇/生效/收招全部播放片段，无立像混入。

剩余普攻缺口：蛛姬蛛网、妖隼与隼将 shot、蝠将 bite；可选重做白虎 sweep、蛇后 shot。

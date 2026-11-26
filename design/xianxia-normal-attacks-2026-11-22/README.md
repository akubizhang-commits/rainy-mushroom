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

## 2026-11-23 下午（未花额度）

- 蝠将普攻 bite：复用 shot v2 的嘶鸣片段，叠加程序前扑（`attackPose` 的近战前探），出招时不再是立像。真实游戏验收通过。
- 蛛姬蛛网：在游戏里不会出现，撤回请求。蛛姬精英和 Boss 都带 M10，M10 会取代普通蛛网，而且没有退回咬击的分支，所以精英和 Boss 只放技能；咬击只有普通怪会用（已接入 bite 片段）。
- 分身份验收（`scripts/verify-normal-attacks-2026-11-22.cjs` 共 12 例全部通过）：蛛姬普通；妖蛇普通、精英；妖蝠普通、精英、Boss；蝠将普通（咬击、射击）、精英。每例检查前摇/生效/收招都播片段、暂停时帧不变、死亡后角色移除；新片段所有帧都没有贴格子边（边缘 alpha 为 0）；截图核对出射点在嘴部、脚底贴影子、"音波"预警标签正常。
- 明日请求：`falcon-shot-request.json`（用已留白的 asset_FcXss…）、`falcon-humanoid-shot-request.json`（本地已做留白参考图 `falcon-humanoid-reference-green-padded.png`，需先上传，上传不花 CU）、可选 `white-tiger-sweep-v2-request.json`。

## 2026-11-24 妖隼、隼将 shot（20 CU）

| 片段 | job | 视频 asset | 参考 asset | seed | 结果 |
|---|---|---|---|---|---|
| falcon shot | job_GQWbbeVgCcQqYTi6h3cp7y81 | asset_DgnmzVMkzyZxZLjQYzuWPYtn | asset_FcXssedCibGXfj1ZQxhhMJfm | 202611251 | 部分可用：源 31 起射出白色羽镖、羽毛四散。抢救前摇 2–26（扬翅），生效 27–29（下拍，去散羽），收招倒放前摇 |
| falcon-humanoid shot | job_A2tZstwJgAphK1835Aoa5gbk | asset_78TSa8E4yXf5Hipn1tPNrUUt | asset_Dma9kEzsbNuspoRPcnZZjT92（本地留白版上传） | 202611252 | 部分可用：源 24 起翅膀发绿糊，36 起双翅张开出画。抢救前摇 2–21，生效 21–23（探头伸臂），收招倒放前摇 |

- `export.py` 新增 `despeckle`：只保留最大的不透明连通块，去掉飘散的羽毛。
- 出射点改为 shot-009 出手帧的喙部。远程出射检查 96 组通过；普攻验收新增 5 例（妖隼普通、精英；隼将普通、精英、Boss）全部通过。
- 已知问题：~~妖隼前摇里身体上下摆动较大~~（同日本地修正：导出加 `stabilize`，把身体最密的 40 行带固定在首帧高度，摆动从约 52px 降到约 13px；出手帧喙部改为 .35,.54）；隼将前摇动作幅度小，出手是硬切。之后额度宽裕时可重做。

## 2026-11-27 本地修复三处硬切（不花额度）
| 族系 | 原问题 | 修法 |
|---|---|---|
| 白虎横扫 | 前摇 23 直接跳到 36 的收势，而且出爪方向朝背离玩家的一侧 | 生效改为 24/25（爪子朝面向一侧扫出）+ 29（扫过身前），收招 30–92。新增 `degreen` 去掉残留的绿色拖影，再用 despeckle 去掉脱离身体的拖影块；26–28 拖影盖住腿，仍跳过 |
| 隼将射击 | 前摇小、21→23 出手硬切 | `degreen` 去掉 24–34 的绿色糊边，前摇延长到深度前倾（2–29），出手 29/31/33（收翅前倾、翅膀张开），收招倒放回原姿；喙部挂点按新出手帧重测（格内 .285,.30；锚点 .3435,.89；缩放 1.2075） |
| 妖隼射击 | 收招是倒放前摇 | 收招改用原片射完之后的真实收势（62–74，翅膀抬起回到悬停姿态），despeckle 去掉飘散羽毛；31–61 有白色羽镖，仍跳过。出手帧不变，挂点不变 |
真实游戏中 1280×720 与 844×390 普攻、技能、发射物验收均通过；npm test 2401/2401。

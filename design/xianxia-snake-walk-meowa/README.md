# 低阶妖蛇蜿蜒循环 · v1 试制未通过 · 2026-11-06

正式投放 snake（snake_normal_r2/r3）共 316 只，第5/8层，此前没有任何动作。复用已验收的 512px 妖化母图 `../xianxia-monster-demonic-2026-10-28/snake-demonic.png`，没有重画，也没有新出静态图。

## 输入整理（本地，0 费用）
`prepare.py` 去掉纸底：先按纸色 ±16 从边缘泛洪，再自底向上逐列去掉浅色低饱和的地面投影，最后用种子点去掉尾巴与盘圈之间的纸缝。这样处理后颈部米白腹鳞完整保留；旧运行图 `tower-monsters/snake.png` 的颈部有缺口，可对照 `runtime-on-green.png`。盘圈内侧的暗部是原画阴影，予以保留。输出：`reference-alpha-512.png`、`reference-alpha-1024-upscaled.png`（仅作生成输入）、`reference-green.png`，审查图是 `review-cutout-v4.png`。

## v1 生成
- 工具：Meowa V2（hd、480p、16帧、standard、loop、不去背景、不优化 prompt），10 积分，job_b536ea7025f84952a1da70788fe00944。prompt 见 `prompt.txt`。
- 源片：`v1/original.webp` 640px/16帧，逐帧见 `v1/raw-frames/`，帧时长见 `v1/durations.json`，联系表 `v1/contact-sheet.png`，全部保留。
- 质量指标：循环接缝 3.28，相邻帧平均差 9.08，接缝合格；单头单尾，身体连续。

## 不通过原因
第7–13帧尾巴向右甩出画布，右侧外框为 639/640，尾尖被裁掉。其余帧不能单独组成循环，所以本版不接入，也不导出运行图。

## 重试条件（未提交）
等动态额度恢复后再试，使用同一张 `reference-green.png`：
1. 加 `--padding`，右侧多留出尾巴摆动的空间。
2. prompt 要求尾巴贴着盘圈小幅摆动，不向外甩出。
3. 接入时参照熊妖的做法，改为 snake 独立行走图集，只在实际位移时播放，攻击、吐毒和死亡继续用原表现。

Meowa 余额已用完（20→0），本会话没有可用的 Scenario MCP，因此没有后台任务。

## v2（Scenario，2026-11-06）候选，等待用户观感确认
Scenario 连接后使用 P-Video 2 Pro 一次 10 CU，没有重画母图。参考图是同一张去纸底图，缩到 72% 并靠左放置，右侧留出 294px 给尾巴，见 `v2-scenario/reference-green-padded.png`。源片 480px/24fps/124帧，每一帧主体都在画内（x 72–445）。
从源帧 59 开始取 63 帧（2.625 秒），等距抽 16 帧，接缝比 0.83；第一次选的 28 起/60 帧接缝 1.36，没有采用，已保留。预览 `v2-scenario/candidate/snake-slither-preview.gif`，联系表 `candidate/contact.png`。
留意点：中段尾巴会从卷曲伸成平直、向右伸出。身体没有断开，也没有多出头或尾。用户确认之后才接入。

## v2 已接入（2026-11-06）
用户确认先接入，后续实测再优化。`v2-scenario/export.py` 固定按 384px 裁切，不重采样，帧数 16，图集 1536²（RGBA 9MiB）。displayScale 1.3068 和锚点 [.3646,.9896] 让盘身大小、脚底与静态立绘一致。`TowerMonsterArt.ts` 已把 snake 加入独立行走图集，改前副本见 `v2-scenario/TowerMonsterArt.before.ts`。只有实际位移时播放；吐毒、撕咬和停步仍用立绘，毒弹发射点不变。新增单测后，96/96 通过；Cocos 构建成功；`v2-scenario/verify.cjs` 实测 snake_normal_r2/r3 × 左右 × 双横屏，8 组通过。首轮断言错误地比较了节点 y，已改成比较脚底点，记录在 production.json。真机未验。

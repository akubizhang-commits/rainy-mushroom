# 剑气斩 · 基础单挥 · 审核版

状态：2026-10-30 用户确认并授权接入；已接入塔内剑气斩。实景验证与测试记录见 [integration/README.md](integration/README.md)。

审核视频：`review/sword-qi-corrected-preview.mp4`。1280×704、24fps、49帧，约2.04秒；纯黑底，无音频。黑底MP4没有透明通道，透明帧另存于`review/frames/000.png`至`048.png`。

这是一份**Scenario刃光素材＋后期控制动作**的修订预览，不是模型原样生成即通过。后期保留开口月刃，以固定发射点控制小幅前伸、沿刃高光、细丝散落和消隐。修订版已经重新上传Scenario并加入原有“剑气斩 · 动画审核 · 2026-10-30”素材集合。

## 素材与生成记录

项目：`proj_k6xCHLGuh1JrUQ7Vzo8vsZYV`；团队：`team_Ur9UBLcjfvXmu2iaNKV7cFVh`。

| 版本 | Scenario资产 | 用途及结论 |
|---|---|---|
| 原始文字生成 | `asset_dak8zaRYK5mYw7T5ohuGjAud` | 整段出现旋转闭环，不用于当前剑气斩；原视频保留，可供旋斩、环形剑气类技能复用 |
| 本地几何参考 | `asset_7PebR6q3wvoBBPbUKdHDFYxv` | 手工构建开口月刃轮廓，仅作图生视频首帧约束 |
| 首尾帧约束生成 | `asset_kDcXJGxPMGMYvbiznnfJTxac` | 首帧正确，中段仍闭环；源视频保留，刃光已局部复用于修订版，其余动画可另用 |
| 修订审核预览 | `asset_xoVQvWdHedrAdG8xcxZew9Rh` | 仅取上一版第0帧刃光，后期控制动作；用户已确认，透明帧已导出运行时图集 |

两次生成均使用已发现并读取schema的`model_pruna-p-video-2`，各先估价10 CU，实际各10 CU，总计20 CU。种子分别为301031、301032；均关闭自动提示词改写与音频，2秒、24fps、720p、非draft。没有第三次付费生成。

第一次prompt见`../xianxia-skill-review-2026-10-30/NEXT_VFX_PROMPT.md`；第二次改用首帧约束，并以旧版素材的空黑末帧`asset_DuT6gFKtD9StuDQraxLy9LRH`作为结尾。生成后的metadata确认这两张输入均被消费。

源视频：`source/scenario-v1.mp4`、`source/scenario-v2.mp4`。形态审核记录分别为`review/v1-contact-sheet.png`、`review/v2-all-49-frames.png`。所有原版保留，不因当前技能未采用而删除或覆盖；后续先查 [特效素材库](../xianxia-vfx-asset-library/README.md) 评估复用。

## 修订版验收

- `prepare_review.py`可重建所有修订帧与视频，明确记录生成素材与后期制作的边界。
- 固定发射点为画面坐标(384,352)，朝右，90°扇区，最长半径394px；49帧可见像素均无越扇区、无出现在发射点后方。
- 上下至少56px空边；1.2秒以后所有帧为空；一次主锋亮起并消散，无第二次攻击。
- 透明PNG使用straight alpha；视频按黑底合成，接入时不能把MP4当透明素材。
- `review/geometry-check.json`保存逐帧范围、可见像素数与检查结果。
- `review/corrected-contact-sheet.png`为透明帧总览；它不是游戏运行时图集。

这里的49帧是审核时间轴。运行时从既有透明帧选取16帧，以统一发射点裁切为1024×1024图集，映射现有0.25秒单次斩击；范围随真实半径缩放，各等级1／2／3次施放由游戏调度。实际加载失败时保留程序扇斩。导出规则见 `runtime-contract.json`，生成脚本为 `scripts/art/prepare_sword_arc_v2.py`。这次接入没有新增付费生成。

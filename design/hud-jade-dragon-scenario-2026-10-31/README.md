# 玉龙经验环：Scenario 龙头、龙尾重制

用户反馈：高清处理有提升，但龙头、龙尾造型仍不满意。继续使用现有头像外圈进度、玉龙身体及满级隐藏逻辑，重制两个端部美术。

## 制作方向

- 龙头：侧面长吻、后掠鹿角、连贯鬃毛、短而明确的须，浅青白玉，避免细碎悬空结构。实际约24px检查轮廓。
- 龙尾：由身体自然收细，优雅弯曲的尾尖，玉质与龙头一致。
- 龙头先生成，合格后作为龙尾材质参考；源文件与历次版本全部保留。
- 下载后检查透明边缘，映射到现有头像外环，在大厅和战斗实际尺寸验收。

## 本次请求结果

2026-10-31，已调用 Scenario teams_list、memory_recall、recommend、model_schema_get、consumption_limit_get 和 model_run。

- team: team_Ur9UBLcjfvXmu2iaNKV7cFVh
- project: proj_k6xCHLGuh1JrUQ7Vzo8vsZYV
- 推荐模型：model_openai-gpt-image-2-5-sunburst
- 龙头参数：1024×1024，quality=high，background=transparent，numOutputs=1
- dry_run报价：12 CU
- 实际生成失败：429 PlanLimitReachedError，free，custom-generation 50/50，team scope
- trace: mcpt_Ynvc2sBP7e5E1SjZUB1NENF2
- 未生成任务或新素材；没有替换运行时美术。没有重试或切换模型绕过额度。
- 等待额度恢复或用户自行升级后再继续。

## 龙头提示词

A single finely carved pale celadon jade Chinese dragon head ornament for a small xianxia game portrait HUD, exact side profile facing right. Long elegant snout, proud brow, one clearly readable swept-back deer antler, flowing carved mane and short integrated whisker. Neck extends horizontally to the left and tapers into a narrow jade band. Compact unified silhouette readable at 24 pixels, no detached hair-thin parts. Authentic polished nephrite, milky translucent edges, soft jade green shadows, restrained ivory highlights, smooth hand-carved volumes, shallow incised details. Entire object visible, centered, isolated. No body, no ring, no text, no pedestal, no cast shadow, no glow.

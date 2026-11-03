**本轮已停止，未生成动作视频。最终状态以 ../death-trial-review.md 与 result.json 为准。**

# A14B 本地死亡候选 v3

320×320、81帧、16fps。复用既有死亡文本编码，完整提示词见 request.json。其他采样设置同 v2：A14B Q4_K_M、LightX2V 4步LoRA、CFG1、高低模型各2步。v2 在条件编码972秒未完成时主动中断并保留；v3 降低空间分辨率，保持时长。

图像条件编码完成：536.73秒，采样观测的进程RSS峰值3,259,613,184字节。中间 latent 形状及有限值检查见 conditioning/latent-check.json。生成仍在进行，未作视觉验收，未接入游戏。

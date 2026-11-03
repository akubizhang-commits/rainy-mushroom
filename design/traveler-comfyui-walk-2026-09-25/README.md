# 本地 ComfyUI 能力测试 · 2026-09-25

## 2026-09-25 后续复核：AnimateDiff 与姿势模型已可枚举

当前API能识别AnimateDiff-Evolved节点、mm_sd_v15_v2.ckpt、control_v11p_sd15_openpose_fp16.safetensors和Counterfeit-V2.5_fp16.safetensors。此前“controlnet为空”只适用于较早测试时点，已经过时。CLIPVision列表仍为空，未发现注册的IPAdapter；本地RemoveBackground节点存在，但背景移除模型列表为空。详细证据见animatediff-capability-check.json。

本轮仅查询节点/模型/队列，没有提交生成，没有下载或安装。权重可枚举不代表已成功联合推理。具备做SD1.5+OpenPose+AnimateDiff小规模原型的基础；建议先用同一角色参考和明确的姿势序列验证短走路循环，检查身份漂移、脚底滑动、镜头位移和首尾跳变。角色参考增强可随后评估，不能把缺IPAdapter当成所有试验的硬阻塞。

设备为MPS、16GiB共享内存，查询时空闲约3GiB；分辨率、帧数和采样步数需从小规模起测，未承诺耗时或稳定性。新方案尚未生成美术样片，也未替换游戏角色。

状态：连接和真实出图通过；美术、三头身、八帧循环未通过。未替换游戏。

## 环境
- 用户明确指定 http://127.0.0.1:8188 ，本地运行，MPS，16 GiB共享内存。
- 已安装主模型：Counterfeit-V2.5_fp16.safetensors。
- API枚举：controlnet、clip_vision、background_removal为空；LoRA为空。
- 没有调用云端节点，没有安装插件或下载新模型，没有中断其他任务。

## 测试与证据
1. probe-api.json：纯文字单帧造型测试。seed 25092501，512×640，24steps，cfg7，dpmpp_2m/karras。probe.png生成成功但明显偏离：服装/帽型/视角/背景/动作不符，淘汰。
2. reference-probe-api.json：用既有参考侧视图白底合成作为图生图输入，denoise0.42，28steps，cfg6。reference-probe.png保留角色轮廓和主色，但仍是原较高比例、站姿，未达到三头身和走路目标。
3. 两张输出均为RGB，有背景，不是透明精灵；不能把测试图当作最终资产。
4. 完整提示词和参数保存在两个API JSON；submission/history记录服务器返回。API JSON用于POST /prompt，不是前端画布格式。

## 下一步
先补齐本地兼容的角色参考与姿势控制能力，在下载前确认模型大小、依赖与16GiB设备可运行性。优先验证三头身侧视造型及两张相反接触相位，再做八帧。最终需去背景、统一格子/基线、循环预览和逐帧审查。不恢复已被用户否定的程序化拼接方案。

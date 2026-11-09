# 怪物动作的免费制作方案调研（2026-11-06）

只调研、不改代码，没有花任何额度。现在的做法是 Scenario P-Video 2 Pro 图生视频（首尾同图），本地去绿后切帧接入，每条 10 CU，free 套餐每天 50 CU。本文比较能做出同样效果（从已验收母图出 480px 透明动作帧）的免费方案。

本机条件：Apple M4、16GB 统一内存、可用磁盘 541GB，已装 ffmpeg，没有 NVIDIA 显卡，也没装 ComfyUI。

## 结论
1. **最接近现有效果、能直接替换的是 Google Flow 的免费额度。** 每个账号每天 50 credits，Veo 3.1 Lite 一条 10 credits，支持首帧+尾帧。等于在 Scenario 之外每天再多 5 条，生成流程和本地接入都不用改。限制：要在支持地区登录 Google 账号，高峰期免费用户可能生成不了视频，商用条款需要你确认。
2. **完全免费、产量不限的是开源 Wan 2.2，但本机跑不动大模型。** 14B 首尾帧版本需要约 24GB 显存。在本机 16GB 内存上只能尝试 5B 版本，速度慢，质量也低于现在的线上模型。可行的免费算力是 Kaggle（每周约 30 小时 T4/P100，16GB 显存），社区说 5B 版本在 480p 下能跑起来。
3. **能根治贴边裁切、朝向漂移、发射点重测的，是程序/骨骼动作。** 这条路线不靠视频模型。它把现有立绘拆成部件，或直接对整张图做形变，再在本地烘焙成和现在一样的帧图集。零费用，帧与帧之间完全稳定，发射点可以跟着部件走。代价是动作比较僵，像皮影；拆部件需要可分层的图（可由你出图，或用工具自动拆）。适合 bite 这类短促动作，以及受击、死亡。

建议的分工：继续用视频模型做行走、挥击这类需要有机形变的动作，免费额度用 Scenario + Google Flow 叠加；受击、死亡和简单的扑咬改用程序/骨骼烘焙。是否采用、先试哪一条，请你决定。

## 候选方案对比

| 方案 | 免费量 | 首尾帧 | 能不能接现有流程 | 主要风险 |
|---|---|---|---|---|
| Google Flow（Veo 3.1 Lite） | 每天 50 credits ≈ 5 条，不累积 | 支持 | 能，输出视频后照旧去绿切帧 | 地区限制；高峰期免费用户可能被拦；有 SynthID 不可见水印；商用条款待查 |
| Google Flow（Omni Flash 1.2，360p） | 每秒 1 credit，每天约 5 条 10 秒 | 待实测 | 360p 低于现有 480p，不满足 ≥256px 清晰度时不能用 | 分辨率不够 |
| 可灵、即梦、海螺、Vidu、PixVerse 等 | 多为注册赠送或少量每日积分 | 多数支持 | 能 | 免费版普遍带可见水印，且多数把商用列为付费权益；水印压在画面上会破坏去绿。没有逐家核实 |
| Luma、Pika、Runway | 据 2026 年的评测已取消免费视频 | — | — | 不可用 |
| Wan 2.2 14B 首尾帧（本地） | 不限，Apache 2.0 可商用 | 支持 | 能 | 需要约 24GB 显存，本机不行 |
| Wan 2.2 TI2V 5B（本机 M4 16GB） | 不限 | 只有首帧，首尾帧需另找工作流 | 能 | 有 Mac 移植版，但推荐配置是 64GB 机器；16GB 上大概率很慢或内存不够，需要试 |
| Wan 2.2 5B / 14B 量化版（Kaggle 免费 GPU） | 每周约 30 小时 | 14B 量化版支持，待实测能否装下 | 能，在云端出视频再下载 | 搭环境要花时间；16GB 显存偏紧；需要验证手机号 |
| Hugging Face ZeroGPU Space | 免费账号每天只有几分钟 GPU 时间 | 看具体 Space | 能 | 一天大概只够一两条，Space 随时可能下线 |
| LTX（本机） | 不限 | 支持 | 能 | 官方 Mac 版要求启动时有 15GB 空闲内存，16GB 机器上几乎跑不了 |
| 程序形变（Cocos 内或本地脚本，对整张立绘做位移、缩放、倾斜、网格扭曲） | 不限 | 不需要 | 能，直接出帧图集 | 动作像贴纸在动，只适合 bite 前扑、受击抖动、死亡倒地淡出 |
| 骨骼动画编辑器（DragonBones、Rigby2D、Synfig、OpenToonz 等）+ 烘焙成帧 | 不限，开源 | 不需要 | 能，烘焙成 PNG 序列后照现有图集接入，不用接运行时 | 要把立绘拆成头、颚、翼、尾等图层；每个形态要绑一次骨骼；要有人逐个调关键帧 |

## 和现有痛点的对应
- **每天只能做 5 条左右**：叠加 Google Flow 约翻倍；Wan 不限量但要自己搭环境；程序/骨骼动作完全不限。
- **挥击贴边被裁**：视频方案只能靠参考图多留白，今天妖蝠、妖蛇的参考图已经这样处理。骨骼/程序动作自己控制画布，从根上没有这个问题。
- **朝向、体型漂移**：所有视频模型都有，首尾帧只能减轻。骨骼/程序动作没有漂移。
- **射击要逐帧重测发射点**：骨骼动作可以直接导出嘴、翼根等部件每帧的坐标，替代手工测量。视频方案仍然要测。
- **死亡、受击成功率低**：这两种动作短而且模式固定（后仰抖动、倒地淡出），用程序形变或骨骼做最稳。

## 需要注意的地方
- **商用和水印**：游戏要上微信，免费层的输出能否商用要逐家看条款。Wan 2.2 是 Apache 2.0，明确可以商用。Google Flow 的商用条款我没有核实，接入前需要你确认。
- **Spine 运行时授权**：Cocos 自带 Spine 运行时，但 Spine 的运行时许可要求有 Spine 编辑器授权。用开源编辑器导出 Spine 格式、再在 Cocos 里直接播放，授权上有疑问。建议烘焙成帧，沿用现在的图集方式，这样完全不碰运行时授权。
- **AGENTS.md 的约定**：静态图仍由你出图、我写 prompt；拆部件用的分层图也按这条约定来。付费产出的保留规则不受影响。

## 如果要试，建议的最小试验（未执行，等你决定）
1. **Google Flow**：用今天准备好的妖蝠 bite 参考图和 prompt 出一条，和 Scenario 的结果比较体型漂移、裁切和清晰度。需要你本人登录 Google 账号操作，或者告诉我能否通过网页自动化来做。
2. **程序形变**：本地用 Python 对妖蝠立绘做一段 20 帧的前扑咬击（9/3/8 分段），零费用，先看观感能不能接受。
3. **Kaggle + Wan 2.2**：搭环境的成本较高，前两项都不理想时再考虑。

## 来源
- Google Flow 的额度、价格和模型变更：[Fello AI 的 Google Flow 指南](https://felloai.com/google-flow/)、[Google Flow 额度帮助页](https://support.google.com/flow/answer/16526234)
- 各家免费图生视频对比，以及 Wan 2.2 5B 的硬件要求：[techpilot.ai](https://techpilot.ai/image-to-video-free-ai/)、[vuela.ai（Luma、Pika、Runway 取消免费）](https://vuela.ai/blog/best-free-ai-image-to-video-tools-2026)
- Wan 2.2 首尾帧工作流和显存要求：[ComfyUI 官方 Wan 2.2 FLF2V](https://comfy.org/workflows/video_wan2_2_14B_flf2v-7016f027bcf1/)、[Next Diffusion 教程](https://www.nextdiffusion.ai/tutorials/wan-22-first-last-frame-video-generation-in-comfyui)
- Mac 上运行：[Wan2.2-Mac](https://github.com/HighDoping/Wan2.2-Mac)、[Wan2.2 5B MLX 量化版](https://huggingface.co/Anes1032/Wan2.2-TI2V-5B-mlx-q8)、[LTX Mac 运行要求](https://ltx.io/blog/how-to-run-ltx-on-a-mac)
- 免费 GPU：[Kaggle 配额说明](https://nandigamharikrishna.substack.com/p/kaggles-free-gpus-for-ai-experiments)、[Wan2GP-on-Kaggle](https://github.com/Square-Zero-Labs/Wan2GP-on-Kaggle/)、[Hugging Face ZeroGPU 配额](https://discuss.huggingface.co/t/what-is-the-free-zerogpu-quota-for-1-space/178610/2)
- 骨骼动画工具：[Rigby2D](https://github.com/jaisurya-dev-art/rigby2d)、[DragonBones 等工具对比](https://zipdo.co/best/2d-bone-animation-software/)

以上内容已转述改写，以符合来源的授权限制。各家的免费额度变化很快，以上数字以文中来源的发布日期为准，使用前需要再次核实。

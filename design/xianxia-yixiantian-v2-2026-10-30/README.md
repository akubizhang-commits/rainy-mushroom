# 一线天 · 延尾接入版

2026-10-30，用户授权“消散适当延长，然后直接接入”。当前 `attempt-03-long-tail` 已接入游戏：单段视觉生命周期由 **0.25秒延长至0.33秒**，前0.05秒出剑保持原速，仅放慢后续消散。打击次数、命中时间、范围、伤害、冷却均未改动。

按[制作 prompt](../xianxia-skill-review-2026-10-30/NEXT_VFX_PROMPT_YIXIANTIAN.md)优先复用已有素材。此版从旧一线天原片提取直线白芯和青焰，去掉大范围起点星芒、箭头及长期驻留，重新编排向右流光和消散。**本轮没有调用生成模型，新增生成费用为 0 CU。**

## 当前接入与验证

- [游戏三贯实时预览](integration/runtime-three-hit-preview.mp4)：1280×720、3.4秒；演武场正常运行速度，展示两轮三贯。截取完整录像的1.8～5.2秒，去掉开头加载过程；完整录像、原始录制与时间记录均在`integration/`保留。
- [延尾单贯预览](attempt-03-long-tail/yixiantian-long-tail-preview.mp4)：1280×720、24fps、2秒容器，以游戏4倍时长放慢观看；第28帧起全空。
- [消散前后对比](attempt-03-long-tail/yixiantian-tail-comparison.mp4)：1280×720、60fps、4秒；按游戏实时速度对比0.25秒与0.33秒。它是合成示意，保留在本地。
- [手机横屏三贯实景](integration/rank10-three-locked-origin-pulse3-844.png)、[斜向剑路实景](integration/rank1-diagonal-pulse1-1280.png)。
- [接入契约](attempt-03-long-tail/runtime-contract.json)、[逐帧检查](attempt-03-long-tail/retiming-check.json)、[浏览器验收](integration/browser.json)、[测试基线对比](integration/tests.json)。

运行时资源为 `cocos-pilot/assets/resources/tower-skill-fx/sword-line-v1.png`，像素与 `attempt-02` 已审核候选图集完全相同，复用原 Scenario 图集 `asset_4YzyrST5PiMgbQpz3NwiVZgk`。接入由独立的 `SwordLineArt` 管理每次真实释放的视觉生命周期；实际命中效果在0.25秒移除后，尾光仍能自然结束，最迟0.33秒清理。1／2／3贯分别跟随真实释放，不增加伪打击。

图集末两帧为空帧，尾光会在0.33秒清理前逐渐归零；0.33秒表示总播放窗口，后段保留细弱余光。

已通过 Cocos web-mobile 构建，以及1280×720、844×390两种横屏下16组真实战斗释放检查：方向、单／二／三贯、同轮锁定起点、柱体／边界截断、暂停、相机移动、窗口重建、退出清理、资源404回退、贴图实际网络哈希。测试使用内存演武场，无持久化写入。

相关回归24/24通过。完整测试从1824项、1783通过、41失败，变为1833项、1792通过、41失败；新增9项全部通过，失败名称与修改前完全相同。不能将此记录理解为全项目测试全绿。[核心战斗文件和原剑气斩渲染器的前后哈希](integration/gameplay-preservation.json)保持不变。

## 原审核版效果（保留）

- [单贯动画](attempt-02/yixiantian-single-preview.mp4)：1280×720、24fps、48帧、2秒，黑底、无音频。首帧为主击，约0.92秒后全空。
- [青石底单贯／二贯／三贯](attempt-02/yixiantian-cadence-stone.mp4)：1280×720、60fps、4秒。展示360／450／510长度、固定28宽、间隔0.16秒的连续施放。它是按游戏契约制作的合成审核片，**不是已经接入游戏的录像**。
- [主击静帧](attempt-02/impact-black.png)、[透明主击图](attempt-02/impact-rgba.png)、[关键帧总览](attempt-02/contact-sheet.png)。
- [三种底色的透明边缘](attempt-02/alpha-proof.png)、[旋转方向检查](attempt-02/direction-proof.png)。

表现重点是单条窄长锋芒的快速贯通。每段只有一次亮度峰值；二贯、三贯保持同一剑路，依靠分别播放形成节奏，不在单张素材里画额外平行剑气。

## 来源与保留

旧原片位于 `design/xianxia-vfx-asset-library/source/yixiantian-2026-10-30-asset_EiryPFybxa4us2A1dp29At74.mp4`，Scenario ID 为 `asset_EiryPFybxa4us2A1dp29At74`，历史生成费用为15 CU。该文件及旧版资产均未修改。

此版使用源视频第12～35帧的横向320～1020像素区域，保留原有白芯和青焰纹理；根据逐列白芯中心矫正倾斜，再以收束的窄锋轮廓重新取样。流光、细丝、消隐及亮度约束由 `prepare_review.py` 在本地编排，不能称为模型原样生成的结果。

- `attempt-01` 保留第一次制作的动画、透明帧、候选图集及脚本快照。其起点较平直，合成预览因字体路径不存在而中断。
- `attempt-02` 收束起点、增加轻微柔光，并完成全部合成审核片；脚本快照一并保留。
- `attempt-03-long-tail` 保留本次延尾的透明帧、预览、对比、运行时契约及导出脚本快照。复用原图集，仅修改游戏播放曲线。
- `attempt-03-long-tail-incomplete-01` 保留本地首次延尾导出中断前的帧和脚本；整数帧重建精度断言失败后，修复到新目录完成，没有新增生成费用。
- 生成脚本要求新版本目录，禁止覆盖旧版本。所有已知素材通过[素材库](../xianxia-vfx-asset-library/README.md)检索。

新文件已上传至原项目，以下均为旧素材加工后的新资产，未覆盖原片：

| 文件用途 | Scenario资产ID |
|---|---|
| 单贯审核片 | `asset_ZBcKbZK7UVZ5pjHdhDdKJt12` |
| 透明主击图 | `asset_yZh9XpuSN7yQyFUu3vMP7ydz` |
| 透明候选图集 | `asset_4YzyrST5PiMgbQpz3NwiVZgk` |
| 青石底合成节奏片 | `asset_v3v2AdTJqjCJJdKmyavhpzqQ` |
| 本次延尾单贯预览 | `asset_3E8evfN44tNDBckzfBeJiZe3` |

原四件加工文件与本次延尾预览已加入原“一线天 · 动画审核 · 2026-10-30”集合，含原视频共6件；上传与复读记录见[原审核版记录](attempt-02/scenario-provenance.json)和[本次延尾记录](attempt-03-long-tail/scenario-provenance.json)。消散对比片因自动审批判定缺少附属素材的外传授权，未上传到云端，已完整保留本地；未重复尝试或覆盖任何旧云端资产。

## 原素材几何与接入契约

原审核版逐帧数据见 [contract.json](attempt-02/contract.json)，本次播放时序以 [runtime-contract.json](attempt-03-long-tail/runtime-contract.json) 为准。

| 项目 | 值 |
|---|---|
| 画布与方向 | 1280×720，朝右，固定俯视投影 |
| 虚拟起点／终点 | `(192,360)` → `(1088,360)` |
| 最大允许包络 | 896长、72宽；包含辉光 |
| 本版实际可见最大高度 | 48像素，未越出包络 |
| 透明序列 | `attempt-02/frames/000.png`～`047.png`，straight alpha |
| 空尾帧 | 第22帧起全空，符合1秒后全空要求 |
| 单段运行时图集 | 4096×512，4×4，单格1024×128，16帧；8MiB解码像素 |
| 单段游戏时间 | 命中效果原有0.25秒；视觉独立延长到0.33秒；后续施放仍间隔0.16秒 |
| 接入尺寸映射 | 长度按实际剑路伸缩；宽度独立映射为28，禁止随等级一起变粗 |

图集使用统一裁切，不按每帧轮廓重新居中。原裁切928×116，锚点为`(16/928, 0.5)`；运行时节点位于真实释放起点，宽为实际截断剑路长度×928/896，高为命中宽度×116/72。只接管友方`sj_line`直线效果，逐ID抑制对应的几何回退。加载失败或容量不足时保留原有显示。

导出及检查：

```sh
# 新导出要求目标版本目录不存在，防止覆盖已有素材。
python scripts/art/prepare_sword_line.py
python scripts/art/prepare_sword_line.py --check
```

需要可用的Pillow、NumPy与ffmpeg；当前版本可直接运行`--check`复核。

已检查原片哈希保持不变、48帧完整、全部可见像素在包络内、亮度单调下降、空尾帧以及16格图集的透明边框。主击图在青石色、浅米色和紫色底上未见黑色矩形或明显黑边。

原审核版的[独立复核](attempt-02/independent-review.json)通过：16格图集与源帧统一裁切逐像素一致；单／二／三贯分别具有1／2／3个独立峰值，亮度谷值低于相邻较低峰值的10%。60fps预览相对0.16秒目标间隔的量化误差小于一帧。该记录保留原审核时的状态；本次接入授权与技术验收见本文开头。

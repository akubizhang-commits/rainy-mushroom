# 纵横剑气：双月牙交叉素材

本轮将原来的两道直线刃改为两道弯月刃交叉。复用已批准的单月牙 RGBA，各绕白锋中点旋转 −45°／+45°，没有重新生成、拉直月牙或增加第二次攻击。新候选已完成目视确认，并原字节复制到独立运行时资源 `sword-qi-cross-v2.png`；生产渲染与胸口高度调整由本轮主任务处理。

![旧直线十字与新双月牙对比](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-sword-qi-curved-2026-10-30/art/old-vs-curved-cross.png)

左右按相同的 384 px 横向刃线跨度展示。新图有两条可以单独辨认的弧形白锋，交点是同一次攻击的视觉中心。交叉前的两份旋转组件也独立保留，便于后续复用。

## 素材与保留记录

| 文件 | 用途 |
|---|---|
| [sword-qi-cross-v2.png](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-sword-qi-curved-2026-10-30/art/sword-qi-cross-v2.png) | 512×512 透明候选，与新运行时 PNG 字节相同 |
| [crescent-minus-45.png](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-sword-qi-curved-2026-10-30/art/crescent-minus-45.png)、[crescent-plus-45.png](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-sword-qi-curved-2026-10-30/art/crescent-plus-45.png) | 两道刚性旋转的独立月牙 |
| [几何覆盖图](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-sword-qi-curved-2026-10-30/art/curved-cross-geometry.png) | 验证两条碰撞中心线沿月牙白锋弯曲；辅助线没有写入运行时图 |
| [变换契约](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-sword-qi-curved-2026-10-30/art/geometry-transform-contract.json) | 原素材哈希、旋转矩阵、24 段归一化坐标、前缘锚点 |
| [复制记录](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-sword-qi-curved-2026-10-30/art/runtime-copy-receipt.json) | 目视确认后的新资源及 `.meta`，旧 PNG／meta 校验 |
| [像素与变换检查](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-sword-qi-curved-2026-10-30/art/pixel-and-transform-check.json) | 在内存中重现组件和合成 PNG，全部 SHA-256 相同 |
| [制作脚本](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-sword-qi-curved-2026-10-30/art/prepare_curved_cross.py) | 固定源图、参数、预乘透明度重采样和对比图制作 |

源月牙为 `cocos-pilot/assets/resources/tower-skill-fx/sword-qi-crescent-v1.png`，SHA-256 为 `48deef02cb8e6f9a6c0bde45561615990becd00fdba335970bc3087e33af7b89`。它与此前批准的 160×512 月牙组件字节相同。

旧直线十字 `sword-qi-cross-v1.png`、旧 `.meta`、原月牙和此前整个已封包目录均未覆盖。本轮新 PNG 的 SHA-256 为 `21ae2f4769b8b356f417f911b7fcc7145fb5570c6a67f4b47eb2e9c077df5f36`，131,235 字节。新增模型调用 **0**、生成费用 **0 CU**、上传 **0**。

## 渲染与几何契约

世界坐标沿发射方向为 x 正方向，垂直于发射方向为 y。源图白锋中段的全白区域为 x=114–124，选用白锋中点 **(119,256)** 作为两道月牙共同旋转中心；新画布交点为 **(288,256)**。

两道月牙共用理论中心线：

```text
theta ∈ [-π/4, π/4]，每道均分12段
x = 0.7 × (cos(theta) - 1)
y = 0.5 × sin(theta) / sin(π/4)
分别绕 (0,0) 旋转 -π/4 和 +π/4
```

旋转后整体高度 `unionHeight=0.9970562748477141`，最前缘 `frontMaxX=0.20857864376269047`。给定技能横向宽度 W，将两条弧线统一变换为：

```text
X = (rotatedX - frontMaxX) / unionHeight × W
Y = rotatedY / unionHeight × W
```

最终归一化范围为 x∈[−0.7091944547408298,0]、y∈[−0.5,0.5]；两道白锋交点在 **(−0.2091944547408298×W,0)**。碰撞需要这两条弯曲中心线，不能继续用连接四端点的直线 X。

运行时纹理参数：

| 参数 | 值 |
|---|---|
| PNG 尺寸 | 512×512 |
| 源月牙参考跨度 | 474 px |
| 新双月牙参考跨度 | 472.60467427781646 px |
| PNG 前缘锚点（左上原点） | (386.8662771435153,256) |
| Cocos 锚点（左下原点） | (0.7555981975459283,0.5) |
| 非零透明度边界（右／下不包含） | [59,27,407,485] |
| 大于128透明度边界 | [68,36,395,476] |

原月牙的微弱光晕可越过中心线；四条画布边缘透明度均为零，没有裁断光尾。上移至角色胸口是渲染位置调整，不能烘焙进旋转纹理或改写这些碰撞坐标。本图始终只代表一发合成剑气，不增加出手次数或目标受击次数。

## 重现

制作脚本遇到任何已有输出会直接停止，避免覆盖付费来源和历史版本。需要重新导出时，将脚本原样复制到另一个全新的 `design/<新目录名>/art/` 下再执行；源素材路径仍从项目根目录读取。使用 Pillow，版本记录在变换契约中：

```sh
/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 design/<新目录名>/art/prepare_curved_cross.py
```

本轮已在内存中重新渲染两份旋转组件和合成纹理，输出编码后的 PNG 哈希与保存的候选及运行时纹理一致。这里仅整理本轮美术输出，不封闭整个技能修订目录；玩法、界面、构建和实机验收由主任务继续归档。

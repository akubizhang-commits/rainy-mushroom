# 锁妖塔十二兽族普通形态 · 静态母稿

2026-10-28。本目录完成本地素材整理与造型检查，不表示已接入游戏、完成动画或通过战斗验收。

## 本次交付

- `source-a.jpg`、`source-b.jpg`、`source-c.jpg`：用用户指定的最新下载件替换旧的 1024 方图；现为 **2048×2048、RGB、不透明 JPEG**，复制时保留下载文件的完整字节。
- 11 张普通形态 PNG：每张 **1024×1024、RGB、无 alpha**，直接切出一个 2×2 象限，不缩放、不补画、不锐化、不去背景。PNG 是 JPEG 解码像素的无损保存，不是原生无损生成图，也不是透明精灵。
- 第十二族野猪直接引用 `../xianxia-monster-sample-2026-10-28/ironback-boar.png`，没有复制、重命名或修改。目录正式名为 **铁鬃妖猪**；既有样片标题“铁背妖猪”不是新的运行时名称。
- `contact-sheet.png`：每只按 256×256 像素展示；`contact-sheet-128.png`：每只按 128×128 像素展示。两者含全部十二族、目录正式名称和普通形态 ID；仅供造型比较，不表示战斗中的体型比例。
- `manifest.json`：十二族映射、源图/成品 SHA-256、裁切坐标、尺寸、现有野猪引用、预览及空格说明。
- `provenance.json`：三批来源、原始下载路径、asset/job ID、报价、源图与提示词哈希。
- `verification.json`：11 张裁片与 JPEG 解码区域逐像素一致的检查结果，以及重现环境。
- `prepare-assets.py`：确定性本地处理脚本。未进行新生成、联网、浏览器操作、运行时接入或构建；不写 `review.html`。

保留原有 `prompt-*.txt` 与 `scenario-batch-*.png`，实际裁切输入只使用上述三张 `source-*.jpg`。`review.html` 归 Turing 维护。

## 批次与正式名称

格序为左上、右上、左下、右下；名称、ID、普通形态身份取自 `docs/xianxia/sect-tower-v1/data/beast-catalog.json`。

| 批次 | 普通形态 | 文件 |
|---|---|---|
| A 左上 | 青风妖狼 `wolf_normal` | `wolf.png` |
| A 右上 | 岩背妖熊 `bear_normal` | `bear.png` |
| A 左下 | 斑纹妖虎 `tiger_normal` | `tiger.png` |
| A 右下 | 灰岩妖猿 `ape_normal` | `ape.png` |
| B 左上 | 赤鳞妖蛇 `snake_normal` | `snake.png` |
| B 右上 | 青鳞妖鳄 `crocodile_normal` | `crocodile.png` |
| B 左下 | 青甲妖蝎 `scorpion_normal` | `scorpion.png` |
| B 右下 | 铁背妖蜈 `centipede_normal` | `centipede.png` |
| C 左上 | 墨纹妖蛛 `spider_normal` | `spider.png` |
| C 右上 | 灰翼妖蝠 `bat_normal` | `bat.png` |
| C 左下 | 灰羽妖隼 `falcon_normal` | `falcon.png` |
| 既有 | 铁鬃妖猪 `boar_normal` | 外部引用 `ironback-boar.png` |

C 右下为空白，不导出第十二张新图。每格裁切坐标采用左闭右开：`[0,0,1024,1024]`、`[1024,0,2048,1024]`、`[0,1024,1024,2048]`、`[1024,1024,2048,2048]`。

## 来源与报价

图像生成方为 Scenario；Meowa 技能的 Python/Pillow 环境只用于本地处理。

| 批次 | asset ID | job ID | 用户提供的报价 |
|---|---|---|---|
| A | `asset_3r4L6Y5GqrTG9vzSFsUz583M` | `job_4GsyskMPozxKMgZa5Y8Nm6dt` | 5 CU |
| B | `asset_5G4sAcfs1AC269Rw9Mib16eZ` | `job_BCMJHYrAvAvqSZzQ3nBauKBo` | 5 CU |
| C | `asset_BDRXcPacStSBiwqNVC48yFsH` | `job_Pd4BgpSnEMCPUBgtL9ReqNNk` | 5 CU |

三批合计报价 **15 CU**，不含既有野猪；此处记录用户提供的报价，未独立核对账单。实际输入为 Downloads 中对应 asset ID 后缀 ` (1).jpg` 的文件。旧版 source-a/b/c 的 1024 分辨率不再作为切分依据；本次没有把 1024 输入放大成 2048。

## 原尺寸与 128px 检查

已查看全部 11 张原尺寸 1024 PNG、既有野猪原图，以及每只实际占 128×128 像素的对照图。

- **裁切**：未见象限裁切线截断主体或带入相邻格怪物；蛇尾、蜈蚣触角和两只飞禽翼尖均保留。C 右下确为空白。
- **较紧的边距**：蝎尾顶部、蜘蛛右侧足尖、虎尾右侧，以及蝙蝠/隼的翼尖接近格边，部分仅有几十像素。当前静态图未截肢，但不具备四周约 10% 的动画伸展余量；后续动作制作不能直接以当前画布为运动极限。
- **肢体检查边界**：四足兽有透视遮挡的远侧腿；蛛、蝎的足根和口器也有交叠。蜈蚣的细足及节段需在动画制作前逐节确认。本次没有把静态可辨认轮廓视作足数、关节连接或绑定拓扑合格。
- **128px 可读性**：十二族仍能由长吻/短吻、身躯、尾部、足展及翼形区分；蛇与蜈蚣、膜翼蝠与羽翼隼的区别保留。蛛蝎足根、蜈蚣小足、眼睛和鳞羽纹理会合并；蝙蝠脚爪在小图中很弱，隼的飞行姿态没有提供清楚的落地爪部参照。
- **风格与尺度**：低饱和自然色、左上光和手绘体积总体延续野猪参考。熊、猿的石甲和狼的硬鬃较强，普通形态与未来精英的外形差异仍需后续把关。不同格主体占比并不一致；接入前还需统一显示尺度、脚点和碰撞核。此处没有为凑齐大小而重排原图。
- **仍是不透明母稿**：宣纸浅底与软投影已烘焙在 RGB 像素中。直接用作战斗贴图会显示方形纸底；没有自动抠图或伪造透明通道。本次也未提供行走、攻击、受击、死亡或多方向帧。

## 重现与校验

第一次导入指定下载件并重新生成所有派生文件：

```sh
/Users/zhangnu/.codex/skill-runtimes/game-assets/.venv/bin/python \
  design/xianxia-monster-pack-2026-10-28/prepare-assets.py --import-downloads
```

之后仅从本目录 2048 原图重现，无需 Downloads：

```sh
/Users/zhangnu/.codex/skill-runtimes/game-assets/.venv/bin/python \
  design/xianxia-monster-pack-2026-10-28/prepare-assets.py
```

脚本拒绝非 2048×2048 RGB JPEG 或异常 EXIF 方向的输入，并在写入前检查三张原图。每张成品都重新解码，与源图对应区域逐像素比较。预览缩小采用 LANCZOS；正式 1024 裁片没有重采样。使用固定系统中文字体，字体 SHA-256 和 Pillow 版本写入检查记录；在相同输入、字体和环境下，重复运行的派生文件字节相同。

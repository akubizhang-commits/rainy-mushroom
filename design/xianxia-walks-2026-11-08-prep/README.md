# 明日三条行走请求已备好（2026-11-07 晚，0 CU）
蟒王/蛇女、蛛姬、蝠妖的行走。三条都复用已验收的 1024 透明母图，没有重画。

## 参考图
- 每张放到 #00FF00 绿底上：主体高 80%，脚底在 90%，水平居中。生成脚本见 `references.json` 的记录。
- 白虎 v1 吃过参考图透明空洞的亏，所以三张都先查了被包住的透明区域（`holes.py`，标红图 `*-holes.png`）：
  - 蛇女：头发和背之间约 1.4k px。
  - 蛛姬：头发和蛛腹之间、左侧蛛腿下方，共约 7k px。
  - 蝠妖：15 px。
- `fill_holes.py` 用邻近不透明像素的颜色向内填补，连带边缘 6px 内半透明或偏绿的像素一起重填。补前版本保存为 `*-reference-green-holes.png`。

| 形态 | 参考 asset | seed | 请求 | dry run |
|---|---|---|---|---|
| snake-lady | asset_a3gfcgGDVP14LaphGjdtPRkf | 202611081 | `snake-lady-request.json` | 10 CU |
| spider-lady | asset_sid94dPNmSttouv8DCeD5zKo | 202611082 | `spider-lady-request.json` | 10 CU |
| bat-humanoid | asset_QKDPGAGzk63QanMt5L4jCGaq | 202611083 | `bat-humanoid-request.json` | 10 CU |

参数都是 P-Video 2 Pro、480p、5 秒、首尾帧同图、mode cost、promptUpsampler 关。

## 风险
- 蛛姬有八条腿，视频模型容易多腿、少腿或腿互相穿插。出片后要逐帧数腿。
- 蛇女的尾巴可能在循环中段伸直（低阶妖蛇出现过）。
- 蝠妖的翅膀张得很宽，迈步时翅尖可能出画。

## 提交方法
北京时间 08:00 后先查 usage。并发上限 2，所以先交两条，第三条等一条完成后再交。导出时在 `../xianxia-walks-2026-11-07/export.py` 的 JOBS 里加一条，按鳄王、白虎的方式接入并实机验证。

## 同时做的检查
- 全量测试 2382/2386（`tests-full.tap`）。
  - 3 项是之前就失败的旧测试。
  - 新增 1 项失败：`tower entry completed campaign selects ninth floor and readonly disables entry`，查的是塔入口的奖励名称显示，和怪物美术无关。
  - 之前另一会话造成的 32 项技能测试失败已经消失。
- 猪妖前摇偏缩：没有改动。根据源帧轮廓数据判断，后缩和下蹲集中在源帧 9–20，这一段就是前摇的主体，挪窗口会删掉蓄力。这个判断没有导出试片验证过。

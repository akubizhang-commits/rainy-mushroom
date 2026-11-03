# 剑修 v4 单侧图集

本轮已获主审准予接入，非最终美术/八方向验收。此目录只包含美术、导出资源与离线审阅工具，没有运行时改动。

- 接入：`export/sword-side-v4.png` + `export/sword-side-v4.json`；固定契约见 `RESOURCE-CONTRACT.md`。
- 交互：既有本地服务器 `http://127.0.0.1:8876/v4/`；直接播放导出的PNG图集。
- 对比：`comparison.png`、`review-board.png`。
- 80u：`80u-dark.png`、`80u-forest.png`。
- 连续录像：`atlas-playback-12s.webm`，独立Chrome录制，1.7Hz播放，含左向、右向镜像及两段独立idle。直接切idle，未伪装成收步动画。
- 测试：`motion-checks.json`、`atlas-checks.json`、`export-checks.json`、`browser-checks.json`、`recording-info.json`。
- 来源：`ASSET-ORIGIN.md`、`PROVENANCE.json`。
- 接入边界和后续精修：`QA.md`。

## 重建顺序

使用既有带Pillow/Numpy的Python环境运行 `refine-layers.py`，然后Node运行 `export-poses.mjs`，Python运行 `build-atlas.py`。Node运行 `verify-motion.mjs`，Python运行 `verify-atlas.py`。`verify-browser.cjs` 使用既有Playwright/Chrome验证本地审阅页并录制视频。

重建仅写本目录；输入读取v3，保留v3锁定文件。保持96×168 cell、(48,160)脚底锚点、768×840 atlas、32 walk + 1 idle不变。引擎按建议1.4–2Hz范围映射移动速度，不用speed/visualStride产生过快步频。

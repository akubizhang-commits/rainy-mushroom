# 剑气爆裂新图标接入

2026-10-31，用户批准验收后要求直接接入。使用用户提供的《四剑汇聚的魔法星爆.png》，保留原始1254×1254 RGB PNG与旧石门图标。

按已验收方案缩放为184×184，居中放入256×256宣纸色画布（36px留白），避免圆形遮罩裁掉四剑剑柄。输出已替换 `cocos-pilot/assets/resources/tower-skill-icons/sj_gate.png`，原meta和加载路径保留。未修改战斗效果或数值。加载失败时的历史矢量回退未在本次改动范围内。

- `original.png`：用户原图，字节不变。
- `previous-icon.png`、`previous-icon.png.meta`：接入前资源备份。
- `sj_gate.png`：运行时成品。
- `icon-review.png`：新旧圆裁及88/64/48px对比，已人工检查。
- `prepare-icon.py`、`manifest.json`：可复现处理与来源哈希。
- `tests.log`：9项图标加载测试全部通过。
- `build.log`：首次沙箱内Creator未成功启动的记录。
- `build-retry.log`：沙箱外Cocos Web构建通过。
- `build-asset-check.json`：打包PNG与运行时PNG哈希一致，meta未变。

本次未重新录制游戏实机画面；验收包括离线圆裁与小尺寸目视、加载单测、正式Web构建与打包资源字节核对。无模型生成、云端上传或新增生成费用。

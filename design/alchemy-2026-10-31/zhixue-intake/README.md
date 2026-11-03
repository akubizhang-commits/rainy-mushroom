# 止血丹来图验收

结论：瓶身美术通过；原图为1440×1440 RGB灰底图片，经本地透明处理后接入。未调用Scenario或其他生成服务。

- 造型：白瓷瓶、朱红布塞、红叶纹样与止血丹设定一致；和青色回春丹能清楚区分。
- 处理：保留source.png；提取完整瓶身，角落标识留在原图；master.png为透明母版。prepare.py记录确定性处理与导出过程。
- 缩小验收：size-review.png包含40、64、128像素、深浅背景及回春丹对照。未发现明显灰边、主体缺损或纹样不可辨问题。
- 运行图：128×128 RGBA，alpha边界(25,1,103,126)，主体78×125；不调整装备格子尺寸。
- 接入：TowerStoneArt加载列表、背包图标选择、TowerLibrary图鉴资源；资源名pill_zhixue。
- 校验：item_icon.py --check通过47张物品图及37张阅读插图；图鉴9项测试通过。

原始文件哈希与参数见intake.json。运行图位于cocos-pilot/assets/resources/tower-stones/pill_zhixue.png。
- 最终构建通过；844×390、1280×720实际背包图标加载与详情截图通过，见ui/ui.json及zhixue-inventory截图。
- 初次复用完整炼丹脚本被工作区新增的首层通关门槛挡住；随后缩小为本次图标接入专项，并补齐背包初始化。未修改游戏规则以适配测试。

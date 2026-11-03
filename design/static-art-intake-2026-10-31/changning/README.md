# 破妄宝戒验收与接入

2026-11-02，用户提供image_140134037565937.png，1024×1024 RGB PNG；原字节保存在source.png。验收通过：烟晶窗状细纹、低矮包镶和深色金属戒圈符合设定。戒面略大，作为本版偏差接受；128／64／40px深浅底预览戒面和圈形清楚，小尺寸晶内细纹自然淡化。

macOS Vision本地去背，原始遮罩与脚本保留，prepare.py仅调整透明边缘，烟晶和金属保持完整，内孔透明，不改原图RGB。画外标记随背景排除。未上传、未使用Scenario额度。preview.png与dark-preview.png为合成预览，未真机验收。

item_icon.py导出128px及512px，98%主体占比等比居中。eq_ring_changning已加入背包／装备、炼器／抽奖展示及图鉴白名单。83张物品图标、67张图鉴插图检查通过；图鉴测试10/10通过。构建及打包像素校验见verification.json。

本次补齐后，现行EQUIPMENT_ROSTER中fa法器装备全部有独立运行时PNG。下一件转向宝器下品听雨剑eq_sword_tingyu，未找到对应素材。提示词见next-prompt.txt。

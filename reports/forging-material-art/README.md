# 炼器材料图验收与接入

验收通过：玄铁、灵木、妖兽皮、灵蚕丝。用户提供原图，全程本地处理，无 Scenario 调用或付费制图。

- 玄铁：深灰矿石与银色矿纹清楚，轮廓完整。
- 灵木：年轮、木皮与嫩叶保留，48px 下可识别。
- 妖兽皮：皮卷、卷层与束绳保留，适合作为基础兽皮材料。
- 灵蚕丝：银白双环与青色束带保留；两个环孔为真实透明。原图灰底已分离。

所有原图均无透明通道。保留原文件及 SHA256；本地背景分离只保留连通主体，画外文字未进入运行时图。细小游离毛丝不作为图标主体。128px 图标按 scripts/art/item_icon.py 导出，主体最长边125px，等比居中；另导出512px藏经阁插图。

## 接入

背包使用 tower-stones/pill_forge_{xuantie,lingmu,yaopi,lingsi}；藏经阁目录沿用同图，阅读页使用同名 tower-library-items 高清图。材料ID、掉落、配方与价格未改变。

原图与透明母版：design/forging-materials/intake/，处理脚本 prepare.py，溯源 manifest.json；深浅背景128/48px预览 acceptance-preview.png。

## 验证

- item_icon.py --check：66张物品图、50张阅读插图全部通过。
- xianxia-library.test.mjs：9/9通过。
- npm run cocos:build：成功。
- scripts/verify-forging-material-art.cjs：844×390及1280×720真实构建验证四种SpriteFrame已加载，四张512px阅读图资源加载成功，无页面错误。独立内存存档，不读写玩家存档。
- ui/ 保存材料列表、玄铁详情截图及机器验证结果。高清图验证为资源加载检查，未逐张打开藏经阁阅读页面。

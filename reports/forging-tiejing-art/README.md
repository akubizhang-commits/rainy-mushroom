# 铁精素材验收

用户原图保留于 design/forging-materials/intake/tiejing/original.png，SHA256与主体边界见同目录manifest.json。prepare.py本地提取主体，保留内部高光，去除背景、画外文字及投影；无付费服务调用。透明母版master.png，深浅底色128/48px对照preview.png。

造型、完整轮廓与小尺寸辨识度验收通过。寒晶砂按粗晶砂表现，保留主砂堆，排除不与主体连接的散粒。

背包图：tower-stones/pill_forge_tiejing.png（128px，125px主体）。藏经阁图：tower-library-items/pill_forge_tiejing.png（512px）。材料ID、配方、掉落与价格未改。

图标统一规范检查通过；藏经阁真实资源引用专项测试通过。完整藏经阁测试有一项既有铁剑攻击数值断言失败（eq_sword_iron），本次不修改装备数值或该断言。最终构建成功。联合实测见 ../forging-hanjingsha-art/ui/：844×390及1280×720下七种材料SpriteFrame与512px阅读资源全部加载成功，无页面错误；独立内存存档。阅读图验证为资源加载，非逐张阅读页截图。

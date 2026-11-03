# 红帽蘑菇 · 参考稿矢量版

用户提供蘑菇.png。reference.png保留原稿；mushroom.svg为透明背景的可编辑彩色路径稿；preview.png为SVG渲染预览。通过现有OpenCV背景分离、VTracer轮廓描摹制作，未嵌入位图，不包含原图角落标记。

build.py生成SVG及MushroomReferenceData.ts。运行关卡采用同一SVG的曲线采样数据，经ForestCampaignScenery.ts映射至已有菌盖碰撞轮廓。旧场景mushroom-platform图集也使用此SVG。

区别：参考稿比例保留在SVG中；关卡内按已有蘑菇宽度、高度和可踩踏上沿适配，因此高大蘑菇的菌柄更长、菌盖较扁。压缩和回弹沿原规则，未改变跳跃高度或关卡布局。水彩纹理转换为色块，非逐像素保留。

验证：11项蘑菇生长/踏面/孢子弹跳/图集测试；浏览器实景；构建结果见项目交接。未进行手机真机性能测试。矢量路径只在初始化和蘑菇压缩回弹时重绘，后续应在真机核对重绘开销。

复现：/tmp/rainy-vector-venv/bin/python design/mushroom-reference-vector-2026-09-24/build.py；随后按项目导出图集和构建流程运行。

Cocos复合路径填充差异通过mapbox-earcut 2.1.0预三角化内孔解决。SVG仍保留原始贝塞尔路径，运行采样数据单独生成。

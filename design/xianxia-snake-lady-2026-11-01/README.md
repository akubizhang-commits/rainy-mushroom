# 五阶·赤鳞蟒王半人形母图验收

2026-11-01。用户提供《赤黑金鳞甲蛇女.png》，原图已归档 original.png。

结论：静态母图通过并接入第5层第20波。女性头脸、双臂、躯干与单条蟒身相连，无人类双腿、无额外蛇头；腰尾连接可读，盘曲的前后遮挡自然，尾尖完整。暗赤黑鳞与浅腹鳞区分清楚，符合4–6阶半人形规则。

## 资源

prepare.py 本地提取灰底，保留发丝、双手、尾尖和盘曲。extracted-alpha.png 为原尺寸透明图，reference-alpha.png 为1024参考，size-review.png为256px三底色检查。运行素材为 cocos-pilot/assets/resources/tower-monsters/snake-lady.png，256×256 RGBA；显示画布220，落地锚点0.9。原图未修改，未使用Scenario额度。

仅 snake_boss 映射到 snake-lady，snake_normal 与 snake_elite 继续使用原 snake 资源，既有图像和meta未覆盖。没有改变名称、五阶品阶、属性、掉落、碰撞或波次。原有M03汲灵回生、M16摆首妖息、M11寒瘴泥沼保留，无狂暴机制。

## 验证

Cocos web-mobile构建通过；52项素材、机制与独立Boss相关测试通过；内容表生成检查通过。scripts/verify-snake-lady.cjs 使用smoke内存存档在编译引擎内推进到第5层20波，确认实际Boss及其技能，再暂停清理其他对象检查素材。入口UI显示演武场，实际fixture楼层和技能见 game-review/report.json。

1280×720和844×390：确认256贴图、220画布、赤鳞蟒王五阶标签、暂停稳定、死亡移除及单次击杀记录；无页面错误。人工查看两张截图，盘曲落地、主体和尾尖完整、背景透明。未做微信真机验收或完整战斗平衡测试。

本轮完成静态形象接入；未制作移动、攻击、受击或死亡专属序列，不将静态位移说成动画完成。

# 天地一剑 · 正式接入

2026-10-30，用户批准将 `attempt-04-long-tail` 延长消散版接入游戏。当前 Tower 已使用新 `SwordTiandiArt` 和正式资源 `tower-skill-fx/sword-tiandi-v1`；本目录记录正式构建验证，不再是临时注入候选素材的预演。

## 接入表现

- 特效播放窗口为 **0.75秒**。源动画最初0.0625秒保持原速，后续0.4375秒的消散素材用0.6875秒播放。
- 保留原有0.45秒蓄势、末段起点与方向锁定、单次伤害及人物动作。战斗效果记录仍在0.25秒结束，尾光由独立视觉记录完成，不增加伤害次数。
- 两阶均按实际命中矩形的起点、终点及宽度绘制，保留柱体与边界截断。只在对应图片实际绘制成功时隐藏同一次程序特效；加载失败仍有原来的可见效果。
- 暂停保持当前帧；画面重建继续同一消散阶段；退出、死亡、时间回退和销毁清理尾迹。

## 资源与代码

正式图集来自 `../attempt-03/tiandi-candidate-atlas.png` 的原始字节，4096×768、4×4共16格，每格1024×192。SHA-256：

`f5744f08482319e788e7b262d6614284528cc41176cb3ecf22c8d066ae3232e2`

锚点为 `(16/928, 0.5)`，长度映射 `实际剑路长度 × 928/896`，宽度映射 `实际命中宽度 × 160/128`。正式打包后的PNG哈希相同。

- [渲染器](/Users/zhangnu/WeChatProjects/rainy-mushroom/cocos-pilot/assets/scripts/SwordTiandiArt.ts)
- [正式图集](/Users/zhangnu/WeChatProjects/rainy-mushroom/cocos-pilot/assets/resources/tower-skill-fx/sword-tiandi-v1.png)
- [游戏显示层接线](/Users/zhangnu/WeChatProjects/rainy-mushroom/cocos-pilot/assets/scripts/TowerView.ts)
- [程序特效回退](/Users/zhangnu/WeChatProjects/rainy-mushroom/cocos-pilot/assets/scripts/TowerSkillEffects.ts)

本轮没有改动 `TowerRun`、`TowerSkillForms`、`TowerCharacterArt`、`SwordLineArt` 或 `SwordArcArt`。所有原片、旧图集、审核版本和旧归档索引保留。没有模型生成、没有新增生成费用、没有云端上传。

## 验证与录像

- [两阶正式游戏原速录像](browser-attempt-02/tiandi-production-ranks-realtime.mp4)：4.70秒、141帧、1280×720、30fps，生产 `update(dt)` 驱动，每阶只发生一次真实命中；原始WebM及分段MP4保留在同目录。
- [浏览器验证](browser-attempt-02/browser.json)：1280×720、844×390两种横屏，18个真实战斗场景；验证各阶范围、多种方向、柱体和边界、移动锁定、单次命中、暂停、尾光及清理。实际加载的图集哈希与审核源一致。
- [录像导出记录](browser-attempt-02/video-export.json)与[画面采样](browser-attempt-02/tiandi-production-video-contact.png)。
- [正式构建记录](build-summary.json)：`npm run cocos:build` 通过。首次沙箱内原生Creator启动退出，改用允许的本地原生进程后构建成功；两次日志均保留。
- [完整测试对照](tests.json)：基线1845项，1804通过、41失败；接入后1854项，1813通过、41失败。新增9项均通过，41项失败名称与基线完全相同，无新增失败。此结果不表示全量测试全部通过，具体旧失败名称与日志在对照文件中。

每个常规场景的88个特效和人物样本均与批准的延尾预演对照通过；人物动作也与延尾前基线一致。额外验证了消散中重建、退出再进入，以及资源404时的程序特效回退。浏览器错误为0，验证期间源码和资源哈希未变。

第一轮 `browser-attempt-01` 同样通过，全部产物原样保留。归档前发现共享工作区另一次构建更新了网页入口，本轮技能代码、战斗、人物和图集哈希没有变化。为确认当前入口可用，重新完成第二轮验证及录像；最新入口SHA-256为 `877fe41f8503916f8373768d66691baa9d67ba23a2ef4f9aab4d77639530d15f`，第二轮运行前后均一致。具体变化记录在 [shared-build-refresh.json](shared-build-refresh.json)，两份Creator构建日志也分别保留。

第二轮验证结束后，共享工作区的其他工作又更新了 `TowerRun` 的配装校验及 `TowerView` 的错误文案；本次特效渲染、资源和接线没有被这些改动改变。本报告中的测试、源码哈希和录像对应各次验证时的构建，不表示之后的共享工作区始终不变。[后续变化记录](post-validation-workspace-change.json)明确保留了这一区别；本次没有覆盖或撤回他人的改动。

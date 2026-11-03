# 御剑术逐把生成与按血量派剑验证

- 数值复核：`../../design/balance/balance-check-yujian-2026-10-31.md`
- 针对性回归：`related-tests.log`，218/218通过；包含蓄剑、低血量保留、在途预留、转目标、暂停恢复、装备冷却、进化、伤害显示和共享源码同步。
- 全量：`full-suite-final.log`，2269项中2100通过、169失败。失败名字完整列于`full-suite-failures.md`；主要涉及菜单测试缺少drawMenuClose、旧角色资源测试、试玩资源和掉落测试。未宣称全项目全绿。
- `measure.mjs`可重跑120秒静止靶测量，结果为`measurements.json`。不是九层通关或移动设备帧率验收。
- Cocos Web构建日志：`build-final.log`。
- 浏览器真实演武场已启动，观察到御剑出击后剩余剑继续悬停；详情显示0.5秒生成间隔与按血量分配说明。浏览器控制台未观察到本次技能运行错误；存在引擎废弃API告警。
- 未生成、删除或改写历史美术源素材。

# 浏览器验证交付说明

2026-10-28。**聚合25个通过场景、231次实际指针点击，浏览器总错误0。** 正常组三尺寸3项/102次点击，加最终构建22项/129次点击；未重复执行已通过正常组。

## 交付入口

| 证据 | 通过场景 | 实际指针点击 | 浏览器错误 |
| --- | --- | --- | --- |
| `ui-browser-natural-first.json`：正常剧情390×844、360×640、1280×800 | 3 | 102 | 0 |
| `ui-browser-final.json`：最终功能与故障保护矩阵 | 22 | 129 | 0 |
| 聚合 | 25 | 231 | 0 |

错误0分别指pageerror、console error、HTTP错误均为0，不是删除历史测试断言失败。自然组与最终组是不同构建的真实证据，原各自源码指纹完整保留；不声称25项在同一构建重测。README预留的最终文件名保持 `ui-browser-final.json`，机器聚合索引为 `ui-summary.json`，详细功能过程见 `ui-report.md`。

覆盖：16节点树与锁定详情，真实购丹及第1/3波教学，暂停加点/恢复不重置战斗，三套武器配装，经卷/研习/重修，合法第9层1/6心法真实死亡，普通↔体验、实际×3时钟和无伤Boss抽样，以及三个尺寸的启动seed写失败隔离只读/重试、camp同步失败后同页按钮恢复、refreshVitals体验标识保留。

## 原失败记录归档

原始JSON保留原名、原失败状态与原错误，不覆盖为成功，不删除、不混入最终通过数量。

- `ui-browser-playtest-first.json`：**测试口径调整**。原整轮往返普通raw逐字节不变过严。主线程依据用户既定场外休养规则细化测试：体验运行及刷新期间raw不变；返回普通仅允许真实墙钟1%maxHP/分钟引起hp/restAt恢复，其余所有字段严格不变。修正后独立复跑及final均通过，未修改生命规则迎合断言。后续证据为 `ui-browser-playtest-recovery-policy.json`、`ui-browser-final.json`。
- `ui-browser-fixtures-first.json` 的 aura1：**夹具压力不足**。高进度夹具第1层真实站桩通关，无法证明死亡行为。改用合法解锁第9层与真实伤害，三尺寸1/6心法均真实死亡通过，未伪造HP。后续证据为 `ui-browser-auras-floor9.json`、`ui-browser-final.json`；原文件中的经卷成功项也保留。

处置索引在 `ui-issues.json` / `ui-issues.md`，当前无未解决功能测试失败。旧聚合中间报告 `ui-report-before-final.md`、`ui-summary-before-final.json` 仅为历史，不作为最新统计。

## 目视复核与类型修正

主线程助手已目视技能树、六光环及实际IAB体验工具面板；尚未取得用户对视觉质量的验收。代理先前光环对比度观察保留为可读性备注；暂停弹窗遮挡、未捕获独立死亡战斗帧仍属于证据边界，不把主线程目视冒充自动化像素验证。未操作用户现有IABgame标签或主线程截图。

主线程说明最后仅把TowerView的 `const next=new TowerCampaignStore(adapter,Date.now())` 改为 `const next:any=...`，以解决共享JS类属性的TypeScript推断；据主线程说明无运行时语义变更。**旧/新TS发射JS完全一致证据与后续构建由主线程提供，本交付不宣称已独立收到或验证。** 按主线程协调保留final22证据，不重复浏览器矩阵；不混写源TS哈希相等。

## 本轮边界

仅聚合本目录 `ui-*` 交付文档和索引；未修改runtime、UI、回归脚本、README或handoff，未再执行浏览器。测试始终使用隔离context；fixture与辅助体验记录不当作自然养成、真人难度或真机性能结论。

主线程最终补证：type-only-bridge.json已核对final报告中的旧源码指纹（该验证脚本以Buffer JSON计算哈希），旧/新TypeScript发射JS逐字一致；补类型后的tsc零诊断、9项宿主回归及web-mobile最终构建通过。

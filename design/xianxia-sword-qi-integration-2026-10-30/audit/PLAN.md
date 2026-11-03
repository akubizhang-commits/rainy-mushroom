# 剑气斩与纵横剑气独立检查计划

2026-10-30。此文件只记录检查边界，不代表任何测试已经通过。

## 容易遗漏的接入位置

- TowerRun：growth-only `sj_cross` 的 casts 验证不得继续依赖 classic `S` 表；友方 projectile 白名单、武器/戒指单轮账本与 castContext 须同时扩展。
- 飞行投射物：保存方向、尺寸、形态、速度、命中账本及消散状态；恢复不补发、不重复命中，不将消散重置为有效攻击。
- 范围：arc 高级形态不能仍只在近身半径内索敌；刃面扫掠需处理大步长、沿途多敌、墙柱和六边形战场边界。镜头边缘不终止投射物。
- 动作：三发月牙对应一次人物出手，后续通知不能重启挥剑帧；新十字需要合法的动作映射。
- 文案：`sj_cross` 独立境界门槛、3→4/6→7/9→10升级提示；TowerView经典表查名处不能泄露 `sj_cross` ID。
- 学习：1–3级需要炼气巅峰，4–6级筑基初期，7–9级筑基中期，10级筑基巅峰。失败购买原子性、合法保存、降级返还应覆盖。

## 真实浏览器入口

采用现有 `scripts/verify-sword-line.cjs` 的 `installFixture`，它以 `smoke=1` 在独立浏览器上下文使用内存存储。`window.__towerTest.host` 可取得实际编译后的 TowerView；只设置训练装配、敌人位置和冷却，攻击由真实 TowerRun 释放。

网址由本地只读服务器提供：`/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`。

Playwright：`/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright`。浏览器：`/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell`。

## 构建完成后检查

- 横屏1280×720和844×390。
- 月牙1/4/7级，十字1/4/7/10级；单发/三发计数、实际形状与大十字1.5倍范围。
- 四向或斜向释放、前方远敌、离镜头继续飞行、墙柱阻挡、地图边缘消散。
- 暂停、重建图层、退出/重入；资源HTTP 404时清楚的几何回退。
- 技能树新增节点、名称、阶段限制与升级文案。UI使用detached state，不写玩家资料。
- 捕获原速实录使用canvas.captureStream，实际TowerView.update(dt)驱动；逐帧调试不能充当原速录像。
- 记录构建与源码哈希，检查前后不变，所有输出用新attempt目录。

参考上一轮 `design/xianxia-tiandi-v1-2026-10-30/integration/browser-attempt-02/verify-sword-tiandi.snapshot.cjs`。该文件是快照，ROOT和相对require路径不可直接在原目录执行；应写本轮独立入口或使用项目scripts里的实际入口。

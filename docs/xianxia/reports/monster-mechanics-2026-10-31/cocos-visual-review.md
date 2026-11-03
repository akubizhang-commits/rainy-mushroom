# Cocos 怪物机制视觉验收

当前状态：**通过。最终构建、六场浏览器检查及六张实图人工检查均已完成，包含最后一轮小屏文字避让。**

## 范围

- 实际 Creator web-mobile 构建，Chromium 实际 WebGL 渲染。
- 1280×720、844×390 两种横屏；每种包含几何预警、安全门、临时实体／血怒三个合成暂停场景。
- 脚本：`verify-cocos-mechanics.cjs`，结果：`cocos-browser.json`。
- 合成场景仅用于渲染验收，不代表机制调度、真实战斗平衡、真机性能或最低移速通路已验证。

## 已验证

- 圆形保持完整半径；扇形方向、环形安全缺口、胶囊凸端正确。
- 安全门有双边界和明确“安全门区”文字，透明危险底色不会盖掉安全区；辨识不依赖颜色。
- 镜魄半透明，血怒显示体型放大20%；本体、灵核、结晶、机关柱、卵、锁柱及召唤物有可辨识标识和血条。
- Boss HUD 增加机制状态行；临时实体保留类别和血条，移除拥挤的重复数字。
- 所有预警层级高于友方效果；暂停重画复用相同节点，不修改模拟状态、宗门存档或持久存储。
- 本轮六个浏览器场景无 pageerror 或 console.error。

## 实際发现并修复的问题

最初命令记录测试未模拟 Cocos `Graphics.arc()` 的新子路径行为，实际画面出现互补扇区、窄环片和内凹胶囊端。现改为连续采样 `lineTo()` 多边形；新增基于填充区域内外点的断言，验证环心和安全缺口不属于危险区。首次截图保留为 `*-before-path-fix.png`，首次机器PASS已改标为 `FAIL_VISUAL_INSPECTION` 并存入 `cocos-browser-before-path-fix.json`。

第二轮截图发现844×390的预警文字仍与波次栏／小地图重叠。最终源码增加视口安全上界与横向边距，临时实体上方名称若进入HUD则改到其下方；最终重新构建并重拍六张图片，确认预警标题、镜魄名称和HP条均可见。

## 构建与测试

- 首次沙箱构建无法启动编辑器；正常桌面权限后构建成功。
- 一次重建在MD5后处理阶段缺少 `src/polyfills.bundle.js`，疑似共享输出冲突；保留 `cocos-build-md5-failure.log`。随后确认无编辑器构建进程并重试成功。不能将此错误归因于TypeScript。
- 当前 `cocos-build.log` 记录最近成功构建。
- 渲染测试7/7、宿主实际接入测试1/1通过。
- 完整TypeScript检查仍被既有 `TowerCharacterArt`、`TowerEnvironmentArt`、`TowerInventoryPanel`、`TowerMenu` 错误阻塞；当前 `TowerView` 与 `TowerMonsterMechanicsView` 无错误，详见 `cocos-typescript.log`。
- 库存独立测试补齐真实 `TowerMonsterArt` 依赖，49/50通过；剩余 `pill shop 844x390: buy without healing, then consume from inventory` 因既有“丹霞主殿 y”边界失败，不在本轮修改UI。

## 最终产物

| 场景 | 1280×720 | 844×390 |
| --- | --- | --- |
| 四种几何预警 | `geometry-1280x720.png` | `geometry-844x390.png` |
| 六门避劫 | `safe-gates-1280x720.png` | `safe-gates-844x390.png` |
| 临时实体／血怒 | `entities-1280x720.png` | `entities-844x390.png` |

最终复跑结果：`cocos-view-tests.log` 7/7；`cocos-host-view-tests.log` 1/1；`cocos-browser.json` 6/6，错误列表为空。对六张截图逐张检查，确认轮廓、缺口、文字避让及目标类别；未进行真机FPS或手机触屏操作验收。

## 最终HP同步

在完成上述视觉验收之后，仅更新了授权的精英／Boss HP中心值。对应147项回归全部通过（`final-hp-regressions.log`），并再次完成web-mobile构建；`final-hp-build-check.json`记录最终bundle路径、SHA-256及九层编译HP表，均与canonical表一致。

六张图片保留自相同几何和标签代码的上一构建，因此其中的示例HP文字不代表最终平衡表；预警、标签避让、透明度和体型检查结论不受HP更新影响。

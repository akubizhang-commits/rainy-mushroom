# 胸口高度与交叉双月牙：实机验收

本轮结果为 **PASS**。验收对象是冻结的 Cocos web-mobile 构建，42 个实机场景检查全部通过；原速演示、干净截图、带参考线的诊断图和原始数据均已保留。本目录只记录验收，没有修改业务源码，也没有调用付费生成服务。

## 结果与演示

- 最终机器报告：`browser-attempt-02/browser.json`，`failures=[]`、`errors=[]`。
- 原速五段演示：`overview/sword-qi-curved-overview.mp4`，11.5 秒、H.264、1280×806、30 fps。游戏画面保持 1280×720，字幕另加在画面下方，不遮挡 UI，也没有加速或慢放。
- 演示内容依次为：剑气斩 4 级向右、4 级向左、7 级三道月牙；纵横剑气 1 级近身双月牙、7 级大型飞行双月牙。
- 演示静帧：`overview/contact-sheet.png`；剪辑来源与参数：`overview/manifest.json`。
- 原始五段 `GameCanvas.captureStream(30)` 录像及 WebM/MP4：`browser-attempt-01/*-realtime.*`。
- 最终干净截图及场景逐帧记录：`browser-attempt-02/`。`*-diagnostic.png` 是另存的参考线版本，不进入演示视频。

演示使用独立训练数据，技能档位对应合规角色境界。浏览器独立上下文和存储拦截确保没有写入玩家存档。

## 覆盖范围

共 **42 个实机场景**：1280×720 下 27 个，844×390 下 15 个。

- 两种尺寸均检查剑气斩 1/4/7 级与纵横剑气 1/4/7/10 级。
- 两种尺寸均检查月牙与双月牙向左、向上及两种斜向飞行，向右由基础场景覆盖。抬升始终沿世界竖直方向，不随刃体旋转发生错位。
- 1280 下额外检查离屏飞行、地图边界、出生位置受阻、柱体遮挡、小型/大型覆盖范围、曲线命中、旧直线位置空隙、交点单次命中、悬浮向上/向左施法及移动施法。
- 真实近身与延迟飞行命中、三发约 0.16 秒间隔、单次挥剑动作、消散阶段不追加伤害、离屏后继续按世界范围飞行均通过。
- 交叉双月牙采用 24 段弧形碰撞，与新纹理对应；两刃交点共享每敌一次命中，弧线之间的空隙不造成伤害。7 级宽度为 4 级的 1.5 倍。
- 两种尺寸均通过缩放重建、离开/重进和清理检查；报告中有 2 组完整生命周期记录及 2 条最终清理记录。
- 技能 UI 覆盖两种尺寸各 9 组等级/境界学习条件，共 18 组；保留新节点和当前/下一阶段说明截图。
- **2 项真实 PNG 404 回退**在 844×390 下分别拦截月牙与双月牙原生资源请求；验证程序回退的每段弧线、世界竖直抬升、无精灵残留及只读绘制。

## 性能观测

对象是 1280×720 下真实生产更新循环自动释放的 **7 级剑气斩（三发）**。先预热 40 个 rAF，再采样 240 个 rAF：

| 指标 | 本次观测 |
| --- | --- |
| rAF 间隔 p50 | 16.7 ms |
| rAF 间隔 p95 | 33.4 ms |
| 最大 rAF 间隔 | 50.0 ms |
| 同时活跃 qi actor 上限 | 3 |
| 回收池最大节点数 | 3 |
| 全程不同节点数 | 3 |
| 明确记录的节点复用 | 6 次 |

环境为开发机 Headless Chromium 155，`hardwareConcurrency=10`。这些是本次浏览器运行的观测值，不能据此承诺手机或所有设备稳定 60 fps。原始 240 个间隔及复用 ID 存在机器报告中。`collision-performance.json` 是另行记录的合成碰撞微测，不能与本表混作整机帧率。

## 冻结构建与复跑说明

实际加载路径：`/private/tmp/xianxia-qi-curved-final-CVzfeN`。

构建内容 SHA-256：

```text
7305081a4b02b827524251501c524c519b3b2a285b59eb2fbd57578fb416e833
```

报告中 `fixedBuildUnchanged=true`。本轮运行期间其他并行工作改变了共享目录中的 `TowerRun.js`、`TowerGrowth.js`、`TowerSkillForms.js`、`TowerSkillPresentation.js`，因此 `sourcesUnchanged=false`；这些变化没有进入冻结副本。此验收结论针对上述固定构建，不代表之后的共享工作区或全量测试全部通过。

第一轮的业务场景、五段原始录像和性能采样已正常完成，但额外诊断参考线使用了没有导出到全局的 `cc.UITransform`，使该轮报告失败。修正验收脚本后，第二轮完整重跑全部场景、UI、生命周期和 404；五段录像及性能数据按相同构建 SHA 校验后复用。`reusedCapturesFrom` 明确记录该来源，第一轮所有文件保留。

复跑命令：

```sh
QI_BUILD_ROOT=/private/tmp/xianxia-qi-curved-final-CVzfeN \
QI_REUSE_CAPTURES=design/xianxia-sword-qi-curved-2026-10-30/qa/browser-attempt-01 \
node design/xianxia-sword-qi-curved-2026-10-30/qa/verify-sword-qi-curved.cjs
```

如需重新录制与性能采样，省略 `QI_REUSE_CAPTURES`。每次执行会新建 attempt 目录。`QA_PLAN.md` 是改动前的准备记录；本文件和最终机器报告为完成后的结论。

## 基线与保留

- 改动前已备份 16 个相关源码、测试和资源文件，详见 `baseline/manifest.json`。
- 改动前专项测试 31/31 通过，详见 `baseline/specialist-tests.log`。最终源码测试由主任务另行记录，本目录不把该基线当作最终版本测试。
- `static-art-preflight.json` 留存弧线与 PNG 白芯对齐的检查依据。
- 本次结束时再次校验旧集成封包全部 **305 个文件**，没有缺失或 SHA 变化，详见 `preservation-final-check.json`。旧封包、直线十字图、既有付费原图/视频及不满意版本均未由本验收任务删除或覆盖。

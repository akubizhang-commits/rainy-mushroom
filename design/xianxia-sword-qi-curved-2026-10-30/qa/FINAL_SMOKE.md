# 最新合入版本：释放位置复验

2026-10-30，结果 **PASS**。本轮针对 `swordQiReleaseOffset(form)` 合入后的版本补充实机验收，上一轮 42 场景报告和演示均保留，没有覆盖。

## 最终文件

- 报告：`final-smoke-attempt-02/browser.json`
- 当前版本原速演示：`overview-current/sword-qi-curved-overview.mp4`
- 当前版本演示静帧：`overview-current/contact-sheet.png`
- 当前版本原始五段 WebM/MP4：`final-smoke-attempt-02/*-realtime.*`
- 实景截图与逐帧记录：`final-smoke-attempt-02/`
- 复验脚本：`verify-sword-qi-final-smoke.cjs`

演示为 11.5 秒、H.264、1280×806、30 fps，字幕放在原 1280×720 游戏画面下方。五段均为当前构建重新录制：月牙向右、向左、三连发；近身双月牙、大型飞行双月牙。没有修改播放速度，录像中的角色境界与技能等级对应。

## 实际验收范围

共 **15 个场景**，全部通过：

- 1280×720 与 844×390 各检查剑气斩 4 级向右、4 级向左、7 级三发，以及纵横剑气 1/4/7 级，共 12 项。
- 1280×720 额外检查地图边界、双月牙出生位置受阻、近身双月牙交点仅命中一次，共 3 项。
- 另在 844×390 下分别拦截月牙和双月牙原生 PNG 请求，2 项真实 404 程序回退均通过。
- 两种尺寸退出清理、独立训练状态和实际玩家存储未写入检查均通过。

验证内容包括实际命中次数、飞行命中的延迟、弧形碰撞、胸口竖直抬升、三发不重复挥剑、完整刃体遇边界停止、消散不移动，以及释放坐标与共享 helper 一致。近身交点靶位直接由 helper 和弧形深度推导。出生受阻的玩家位置为 `(930,-60)`，目标为 `(930,100)`，人物和目标中心合法，但朝上的刃体右翼越出右墙，因此不得出生飞行体或结算伤害。

当前 helper 实测合同：

| 纵横剑气等级 | 刃面宽度 | 前缘释放偏移 | 交点距人物 |
| --- | --- | --- | --- |
| 1 | 180 | 127.65500185334938 | 90 |
| 4 | 180 | 127.65500185334938 | 90 |
| 7 | 270 | 146.48250278002408 | 90 |

本轮没有重复全量 UI、性能或全工作区测试；这些不是本轮 15 场景通过结论的一部分。前一轮 240 帧性能记录仍保留，属于前一冻结构建，不作为当前构建的新增测量。

## 构建与保留

冻结目录：`/private/tmp/xianxia-qi-curved-current-JcmCQJ`。

构建内容 SHA-256：

```text
bf5f3b045665b2627a3605212c817f9eb5aca4015ed39e7165ae733de634b83a
```

`sourcesUnchanged=true`、`fixedBuildUnchanged=true`、`errors=[]`、`failures=[]`。实际结果对应当前合入代码的固定构建。

第一次启动因普通沙箱禁止监听本机端口而退出，保留在 `final-smoke-attempt-01/`。允许本机服务后第二次运行完整通过，未修改业务源码或增加付费生成。

开始补验前已有的 273 个 QA 文件在结束时逐一复核，全部 SHA 未变，见 `final-smoke-attempt-02/prior-qa-preservation.json`。旧报告、旧视频、原图及不满意版本继续保留。

复跑：

```sh
QI_BUILD_ROOT=/private/tmp/xianxia-qi-curved-current-JcmCQJ \
node design/xianxia-sword-qi-curved-2026-10-30/qa/verify-sword-qi-final-smoke.cjs --final-smoke
```

# Silver hover 独立 QA

日期：2026-10-26。范围：当前 v7 修仙试玩表现接入。用户已批准预览；本次不重新设美术审批门槛，不修改运行时、build、共享交接或其他人的测试。

## 结果

**18/18 定向测试通过，0 失败、0 跳过，204.580125ms。** 其中独立新文件 10 项，工程 Motion/Atlas 测试 8 项。本次未发现可复现的运行时接线阻断。测试执行期间四个生产 TS 文件及 v7 PNG/JSON 哈希均未变化。

命令：

```sh
node --test tests/survivor-hover-independent.test.mjs \
  tests/survivor-character-motion.test.mjs \
  tests/survivor-character-atlas.test.mjs
```

完整输出为 `independent-qa.txt`，执行前后源码及资源哈希为 `independent-qa.json`。独立测试执行真实 BattleArt 方法及实际 Motion/Atlas 代码，仅替换 Cocos 节点与资源对象；不是浏览器渲染测试。

## 契约与检查

- **仅修仙、开局即用：** View 的 `ruleset=xianxia` 开关传给 `art.load`；BattleArt 同时检查 `run.ruleset==='xianxia'` 和资源可用。新建一级 Run 首次渲染直接使用单个 `xianxia:hover`，无境界/御剑被动解锁条件。首帧渲染前后完整 Run 快照相同，不发放玩法解锁。
- **实际位移驱动：** 仅输入而位置不变不会改变倾斜和朝向；向左输入但实际向右位移时，倾斜跟随右移。向左移动后使用原图，向右使用镜像；纯上下保留最近朝向。工程测试另覆盖方向抖动阈值及不同采样率下匀速结果。
- **起伏职责：** bob 按有效 simulationTick 推进，闲置也悬停，幅度 1.5u；它不是位移累计量。该行为符合已批准预览的静止悬停描述。倾斜依据水平实际速度，最大目标 2.6°；停止后逐渐回正。
- **冻结和重开：** 重复同 tick 渲染不推进姿态；paused、levelup 中反复传入非零渲染 dt，角色位置、镜像、倾斜及无受伤时的颜色仍保持。恢复位移可继续更新；换新 Run 重置历史位置及姿态。工程测试另验证冻结期间重定位不会在恢复时变成速度尖峰。
- **受伤反馈保留：** 单角色正常受伤 RGB=255/145/135；减闪为255/200/195。普通、减闪无敌、闪烁无敌及死亡 alpha 分别覆盖255/153/89/110；受伤染色按原时钟衰退，不被 hover 覆盖。
- **经典隔离：** 经典只请求 `survivor-battle`、`ground`，不请求新图片或 JSON。仍用 `player` 帧，保留原输入翻转与步行 bob，角度为0。
- **加载失败：** v7 图片失败、JSON失败、非法字段、图片与元数据尺寸不一致均回退可见旧 player，ready 正常完成。销毁时仍在等待资源的回调不会复活视图；持有图片引用释放至0。
- **资源尺寸：** PNG 实际头部尺寸与 JSON 的312×416一致；bodyHeight=335.25，按人物高度96u缩放；源图顶原点锚点转换为 Cocos 底原点比例。与原始1248×1664、人物1341px、锚点650/1409的四分之一缩放契约相符。
- **逻辑隔离：** 经典/修仙各180步真实 Run 对照，穿插重复渲染后完整可序列化状态及引用结构相同，包括 RNG、事件、背包和对象池。

首轮独立测试有一项夹具错误：将旧地面资源名写为 `survivor-ground`，实际为 `ground`。只修正独立测试预期后重跑通过；不计为生产缺陷。

## 未验证与交接

- 没有操作浏览器、build/sync 或完整平衡矩阵。真实 Cocos/平台加载、缩小后银发白袍轮廓、边缘灰晕、移动观感及最终截图由主线程验收。
- 冻结结论针对 hover 姿态。既有受伤染色和震屏使用表现层 dt，暂停中可能继续衰退；本次没有把“姿态冻结”扩大为“所有战斗反馈冻结”，也未改变旧反馈策略。
- 新资源仍为整个人物与剑的一张图片，没有新增正背面、独立衣发或关节动画。预览目录 README/EDIT-BRIEF 含历史“尚未接入/尚未生成”状态，不作为当前运行时证据；本报告以哈希记录的实际源码和资源为准。
- 未改 CODEX_HANDOFF.md 或 DEBUG_HANDOFF.md，遵守用户文件所有权要求。

## 本轮文件

- `tests/survivor-hover-independent.test.mjs`
- `reports/hover-integration-2026-10-26/independent-qa.md`
- `reports/hover-integration-2026-10-26/independent-qa.txt`
- `reports/hover-integration-2026-10-26/independent-qa.json`

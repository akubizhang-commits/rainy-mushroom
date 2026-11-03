# 两仪剑阵 · 原生游戏审核预演

最终视频为 [liangyi-ranks-realtime-review.mp4](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-liangyi-v1-2026-10-30/rehearsal/liangyi-ranks-realtime-review.mp4)：21 秒，1280×812，30fps，630 帧。五段各 4.2 秒，依次展示 1／3／6／10 级完整施法与消散，以及 10 级人物移动、剑阵留在原地。1280×720 游戏画面未裁切，底部另加 92px 字幕；没有加速、慢放或以合成动画替代游戏画面。

这是待用户审核的候选。剑阵画面只在本次浏览器会话临时替换，未正式接入生产源码或资源。

## 预览与证据

- [四阶同尺度接触表](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-liangyi-v1-2026-10-30/rehearsal/liangyi-contact-sheet.png)
- [20 张原生录像抽帧](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-liangyi-v1-2026-10-30/rehearsal/liangyi-timeline.png)：首击、第二击、末击和消散后段。
- [最终核验说明](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-liangyi-v1-2026-10-30/rehearsal/verification-final.json)
- [媒体清单](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-liangyi-v1-2026-10-30/rehearsal/media-manifest.json)：视频参数、源片、抽帧、SHA-256 和编辑方式。
- [原始运行收据](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-liangyi-v1-2026-10-30/rehearsal/attempt-03/browser.json)与[补充检查](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-liangyi-v1-2026-10-30/rehearsal/attempt-03/supplement.json)。

最终主片 SHA-256：`90d79f5843d8db424ea396834cea448ae9d166161718feaca2538bedc9cf75db`。

## 真实合同与核验

| 等级 | 真圆半径 | 同敌脉冲数 | 末击表现 |
|---|---:|---:|---|
| 1 | 110 | 6 | 按顺序单眼引动 |
| 3 | 120 | 6 | 按顺序单眼引动 |
| 6 | 140 | 6 | 按顺序单眼引动 |
| 10 | 160 | 7 | 双眼合鸣，仍只结算一次 |

真实 `TowerRun` 负责施法、命中和角色回调。每次施法仅一次原生 `seal` 动作通知，不在每次脉冲重启人物动作。前摇为 0.12 秒；在本次 60Hz 夹具中，施法于 0.016667 秒开始、剑阵于 0.15 秒生成。落阵后 0.5 秒首击、3 秒末击：

- 1／3／6 级实际脉冲时刻：`0.65, 1.15, 1.65, 2.15, 2.65, 3.15`。
- 10 级实际脉冲时刻：`0.65, 1.066667, 1.483333, 1.9, 2.316667, 2.733333, 3.15`。

时间取自真实 `_growthZonePulse` 生成的 effect，而非录像采样回调时刻。原生录像各运行了约 4.25～4.283 秒，再按原速选取前 4.2 秒。

阵心锁定施法开始时选中的目标坐标 `(33,-60)`；人物移动、相机跟随后，阵心世界坐标不变。512×512 动态画布显示宽高为 `2.24×R`，居中锚点为 `(0.5,0.5)`，世界缩放为 1；画布逻辑圆半径 `512/2.24` 因而准确映射到真实半径 R。双眼固定在阵心上、下 `0.66R`，未将真圆压扁或加角色胸口偏移。

所有脉冲共用每次 8 个目标的上限，不按两个阵眼重复结算。独立夹具放置 9 个阵内敌人，逐跳最多且实际命中 8 个；圈外敌人的整个碰撞圆位于边界外 6 单位，始终无伤。另一个夹具在第二跳后让敌人离开范围，后续脉冲不再伤害它。移动和离阵属于不同检查：录像使用真实摇杆移动人物，离阵边界检查在独立步进夹具中改变敌人位置。

原生 zone 在落阵约 3.2 秒后结束，末跳 effect 在约 3.25 秒结束；适配层缓存同一真实阵的落点和时序，让纯视觉余光连续淡出至 3.68 秒，不重启动画、不延长伤害。每个存活剑阵只使用一个 Sprite 和一套重复上传的 canvas／texture／frame；帧数增加不会增加节点数。动态 SpriteFrame 设置 `packable=false`，避免初始透明画布被静态打入 Cocos 动态图集。

真实 `h.pause()`／`h.resume()` 会重建战场节点，本轮在移动后比较新旧绑定的阵心、大小、inspection、canvas 像素和上传次数，结果一致。暂停经过墙钟时间后，视觉与模拟时间保持不变。死亡移除候选节点，退出移除轨迹并销毁候选资源。存档内容不变，运行期间存储写入 `[]`；Cocos 启动时自身的存储可用性探针单独记录，没有算作游戏存档写入。

## 冻结构建与工作区变化

所有录像和检查均运行 `/private/tmp/xianxia-orbit-integrated-orjfhas9`。完整冻结构建及四份候选资源的前后哈希保持一致，运行时检查与视觉核验通过。

`attempt-03/browser.json` 的原始整体状态仍为 **FAIL**：执行期间当前工作区 `cocos-pilot/assets/scripts/TowerMenu.ts` 从 `5e4b9344978060507122779a9af814c7a4549b96fb90af12a0a90f00d2da4082` 变为 `7bfe6a2bb0c7759b0ed49405cfb7fcb5cd36cb752e71507770fa73d6f82b5260`。其余被记录源码没有变化。

该并发 UI 变更没有进入本次冻结构建，本任务没有修改该文件，也没有验证或认可这项外部变化。最终独立说明因此明确区分 `visualAcceptance=PASS`、`runtimeChecks=PASS`、`frozenBuildUnchanged=true`、`artUnchanged=true` 与 `workspaceSourceUnchanged=false`，没有改写原始 FAIL 收据。

## 完整保留的尝试

- `attempt-01`：本机服务器因沙箱 `listen EPERM` 未启动，未录制视频。
- `attempt-02`：真实脉冲和几何已运行，但动态图集缓存初始空白画布导致候选不可见；原始五段录像留作诊断。暂停检查还曾误比较会随只读 draw 增长的统计计数，后续改为比较实际姿态与像素。
- `attempt-03`：最终原生片与运行时检查。第一份 `composition/` 因 ffmpeg 不接受 `.70` 的 seek 参数而中断，已保留第一段和错误说明；`composition-02/` 才是完整 21 秒合成的来源。

没有发起新的模型生成、计费加工或上传。全部素材、源码快照、原始 WebM、原生 MP4、失败记录和最终成品均保留。

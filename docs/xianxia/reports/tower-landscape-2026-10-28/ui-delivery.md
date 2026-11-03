# UI delivery — 2026-10-28

**最终 PASS；VIS-01 已关闭，已知真实未闭项为 0。** 最新 Mask 定向 3/3 通过、24 次点击、3 次拖拽、6 张截图。三阶段 delivery 合计 **13/13 自动场景、146 次真实点击、23 次拖拽、72 张浏览器截图**；不是最后 bundle 的全矩阵重跑。Parent 已目视确认主要 UI/战场/远程截图及修复后的留边，批准关闭 VIS-01。

| 构建 / 范围 | 结果 | clicks / drags / screenshots |
| --- | --- | --- |
| hex/AI delivery：1280×720、844×390、1024×768、390×844、1920×280、3840×1080；另一次真实远程发射 | 7/7 自动通过 | 100 / 17 / 54 |
| 最后 arc 修复：仅 844×390 tree/input/hex 合并场景、正上 sector、正下 sector | 3/3 通过 | 22 / 3 / 12 |
| 最新 root Mask：仅 1920×280 / 3840×1080 留边像素、844×390 树按钮/固定摇杆 | 3/3 通过；VIS-01 closed | 24 / 3 / 6 |

三阶段 runtime exceptions、console errors、HTTP/request failures、生产 Label `undefined/NaN` 均为 **0**。浏览器弃用/API/ReadPixels warnings 保留于原始 JSON，不声称 console 完全无输出。

## 实际 bundle 与 source bridge

**最新交付：`assets/main/index.02690.js`**

```text
02d66ceb5c716e0a6d05149805e361c02ae0c306842e7dc1886a792a179af2cc
```

相对下一段的 arc 构建，已跟踪 production 源码仅 `TowerView.ts` hash 变化：parent 给 root 添加 Mask，原 UITransform 仍按逻辑 width/height 更新。最新只执行指定三个定向场景，旧矩阵数据保留。

前六尺寸矩阵：`assets/main/index.272d1.js`

```text
c70cb27788d9c4952c5ed5a19b28d66c934d186fe2e6dd7045f6f86a8f6a1956
```

方向修正阶段：`assets/main/index.9d6d8.js`

```text
81f0f42bd6d98f8c745cdf625a2da2a9a9b1b0fb2cea2c7ac15b34a302c7dee8
```

从 hex/AI 到方向修正阶段，已跟踪 production 源码仅 `TowerView.ts` hash 变化；parent 明确唯一功能改动为 sector `atan2` 的 `||` 改 `??`。两次 source bridge 均记录在 JSON；前六尺寸证据保留。

方向修正 bundle 实际 world `Graphics.arc`：

| 警示 | faceX / faceY | 半径 | 起止角 | 中心 / 张角 |
| --- | --- | ---: | --- | --- |
| 正上 | 0 / 1 | 123 | 20° → 160° | 90° / 140° |
| 正下 | 0 / −1 | 123 | −160° → −20° | −90° / 140° |

sector 使用新 Campaign attempt、真实生成的虎妖，由 Run 生成并锁定警示，再经真实 Campaign checkpoint 校验编码。隔离摆位/CD 为明确标记的 UI fixture；没有伪造警示 zone。浏览器拦截仅观察自然暂停帧的实际 Graphics 参数，未调用 draw、未改变 snapshot/save。

## 已覆盖

- 844×390 圆图 75% 半径真实点击、Mask 外点击不响应；同页固定详情；camp +/− 即时点数、实际退款文字和选中/滚动保留。
- 新 attempt 的 `arenaVersion=1`、实际 world/HUD 六顶点路径、右上全图指示。
- 六尺寸固定摇杆真实拖向斜边：player/enemy 碰撞圆保持六边形内；×3 采样视野与角色精确对齐；松手、右侧空白、暂停/恢复无残余移动。
- 暂停技能页 − 禁用、＋按规则生效；输入清理、完整 snapshot/CD 冻结；旋转往返、reload 和普通 raw save 隔离。
- 正常伤害 run 实际生成的 `feather` 弹体在截图前后持续存在。只主张这次真实飞羽发射，不主张浏览器穷尽全部 12 族或三种远程样式。

## 关键图名

- [最新 Mask phone 树按钮](ui-delivery-mask-844x390-mask-mask-tree-input.png)
- [最新 Mask phone 固定摇杆](ui-delivery-mask-844x390-mask-mask-fixed-stick.png)
- [最新 1920×280 留边裁剪](ui-delivery-mask-1920x280-mask-letterbox-wall-clipped.png)
- [最新 3840×1080 留边裁剪](ui-delivery-mask-3840x1080-mask-letterbox-wall-clipped.png)
- [最终 phone tree](ui-delivery-arc-844x390-hex-tree-current-build.png)
- [最终 camp 点击/退款](ui-delivery-arc-844x390-hex-camp-pointer-preview.png)
- [最终斜边与 minimap](ui-delivery-arc-844x390-hex-hex-diagonal-wall.png)
- [真实远程飞羽菱形](ui-delivery-ranged-1280x720-ranged-real-ranged-emit-1.png)
- [正上 sector](ui-delivery-arc-844x390-sector-up-compiled-vertical-sector.png)
- [正下 sector](ui-delivery-arc-844x390-sector-down-compiled-vertical-sector.png)

## 旧失败与 VIS-01 闭环

旧 `ui-browser-landscape-final/phone-final` 的 9 个失败属于 **superseded initial harness**：4 个惯性滚动旧坐标、4 个暂停历史 input 断言、1 个未建立非零横向 pan 的前置条件。仅修 QA 后 initial 8/8 通过；原始失败/截图保留并显式标 superseded，详见 [分类报告](ui-superseded-initial-harness-failures.md)。

**VIS-01 CLOSED。** 修复前地板/墙线越过游戏 root；原标线证据保留：[1920×280](ui-delivery-letterbox-overflow-1920x280.png)、[3840×1080](ui-delivery-letterbox-overflow-3840x1080.png)。

最新 root Mask 构建通过真实摇杆到达原外溢斜边位置，以干净宗门画面作基准比较 PNG。排除 mask 边缘外侧 2px 栅格过渡区后，1920×280 检查 **357,280** 留边像素、3840×1080 检查 **1,475,280** 像素；共 **1,832,560 像素完全相同，最大 RGB 差为 0**。已目视两张新截图；parent 也确认 1920×280 留边无地面/墙线，可关闭。844×390 树内真实加点成功，固定摇杆拖动移动、松手停止，位置未重定位。

完整 counts/actions/hash bridge：[ui-delivery-summary.json](ui-delivery-summary.json)。最新闭环：[ui-mask-closure-summary.json](ui-mask-closure-summary.json)；原始记录：[ui-browser-delivery-mask.json](ui-browser-delivery-mask.json)。旧截图、失败记录、前两份 bundle 数据均保留。

QA 交接完成，所有测试浏览器均已关闭。使用独立非持久 Playwright contexts，未触碰用户 liveIAB，未修改 production，未自行 build/sync 或重跑项目全量测试。

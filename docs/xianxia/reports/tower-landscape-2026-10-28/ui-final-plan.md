# Final build 定向浏览器验收

状态：**已按明确 build-ready 完成 delivery 六尺寸、arc 定向及 Mask 定向闭环，VIS-01 closed，见 `ui-delivery.md`。以下为保留的验收计划。** 未 build、未 sync、未改 production。

首轮 common UI 证据作为布局基线保留。final 重点验证新增行为，不再无条件重复 16 节点全量点击矩阵。

## 计划尺寸

- 1280×720、844×390、1024×768、390×844：新 attempt 的战场、固定摇杆、暂停/恢复和 mini-map。
- 844×390：补查真实圆图边缘点击、Mask 外不响应、camp +/−、生产退款文字、选中与滚动位置保留。
- 1920×280、3840×1080：1280×560 SHOW_ALL letterbox、UI/弹窗完整边界、摇杆坐标映射、实际可见战场。
- 旋转往返继续比较暂停时完整 HP/RNG/time/progress/save，区分正在运行时正常推进。

## Hexworld

1. 每场景使用新隔离 Playwright context，内存构造 Campaign 并通过真实 Campaign 编码/校验。
2. 通过真实 UI 开始新 attempt；只读断言 `snapshot.arenaVersion === 1`，不改旧 snapshot 字段。
3. 检查实际场景六边形边界绘制与右上六边形全图指示，保存战场和 minimap 截图供 parent 目视。
4. 固定摇杆正常拖向斜边，使用实际 run actor 半径检查角色整圆在六边形内。通过自然帧推进到边界，不注入 player 位置。
5. 松手、暂停、恢复后坐标不跳变；实际碰撞结果和场景显示分别记录。
6. 以真实工具按钮切换 ×3，验证视野随每个 fixed tick 更新；不把一次帧尾对齐当作所有离屏攻击都被穷尽证明。
7. 旧无 arenaVersion attempt 的 rect 兼容行为保持独立；不得为追求 hex 截图将旧 run 强改为 version 1。

生产名称/geometry helper API 以 final 源码和实际场景为准，准备时不猜测 selector。出现真实 failure 先保留 screenshot、state、pointer log 和 bundle hash，向 parent 报告，不替 parent 修 runtime。

## 证据与隔离

- 每场景实际 clicks/drags/keys/resize、截图、runtime/console/network errors、主 bundle SHA-256。
- 所有生产 Label 拒绝 `undefined` / `NaN`；退款预览内容与实际提交结果对照，不能只测试 Node quote。
- 所有高经验、技能点或 assist 均标为 UI fixture，不作自然养成/掉落平衡证据。
- 不连接用户 liveIAB；不使用用户浏览器 profile；普通存档隔离检查保留。

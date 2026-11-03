# 机缘抽奖结果交互修复

## 修改

- 新机缘抽奖提交成功后打开结果弹层，支持逐件查看、跳过至总览、详情返回和确认关闭。
- 最近一次已保存的抽取可从“查看本次结果”重新打开，不重新抽奖、扣券或发奖。
- 总览与背包共用 `TowerInventoryPanel.drawCell` 和 `gridMetrics`：每行8格、同样的格子与图标尺寸、品阶边框、不可装备底色和新物品标记。
- 装备不显示数量角标；丹药和材料角标显示本次获得数量。名称与属性在点击详情后查看。
- 保存失败不打开成功弹层。

## 验证

- `focused-tests.log`：20项抽奖事务、失败原子性、去重、结果导航及格子一致性测试全部通过。
- 格子一致性覆盖1280×720与844×390，包括装备格子的绘制结构、大小、颜色、线宽及子节点。
- `tests.log`：抽奖与背包扩展测试共125项，117项通过，以下8项未通过，不能视为整套通过：
  - hall skill shortcut returns to its entry via button after refresh
  - hall skill shortcut returns to its entry via escape after refresh
  - swordPeak skill shortcut returns to its entry via button after refresh
  - swordPeak skill shortcut returns to its entry via escape after refresh
  - equipment detail hierarchy and lore 1280x720
  - equipment detail hierarchy and lore 844x390
  - compact comparison cards and external actions 1280x720
  - compact comparison cards and external actions 844x390
- 上述8项在抽取格子改为共用绘制之前的扩展测试中也已失败；本次未修改这些断言或其对应功能。
- `reveal.png`、`overview.png`为第一轮结果交互恢复截图；最终格子对齐截图单独保存为 `backpack-grid-*.png`，避免混淆。
- 最终版独立输出 `cocos-pilot/build/web-mobile-mixed-ui` 构建成功，Creator退出码36且包含完成标记，无TypeScript编译错误。常规输出目录曾与其他构建并发冲突，最终验收使用独立输出；完整日志为 `build.log`。
- 实际Cocos网页运行：十连总览为8+2排列，格子75.875×75.875设计单位；已走通点击物品详情→返回总览→确认关闭，并比较前后存档状态完全一致。`backpack-grid-runtime.png`是最终运行截图；测试工具的窗口尺寸被宿主调整，截图不作为1280×720或844×390的实机证明，这两个尺寸由自动化场景图测试覆盖。

# Host 测试失败的本轮前后对照

结论：**这3项失败在本轮保存的基线中已存在，未由本轮双月牙与胸口高度改动引入。**

同一组7项测试在临时当前副本与临时基线副本中均为 **4通过／3失败**，逐项结果与原 `host-render-regression.log` 一致。失败断言均为 `ordinaryUnchanged` 第560行：正式存档写入次数实际1、期望0；存档内容断言位于前一行，未在这里失败。

| 测试 | 当前副本 | 本轮前基线 | 相同失败 |
|---|---|---|---|
| skill pane uses shared weapon damage once after equipping an affix instance | 失败 | 失败 | `ordinaryUnchanged:560`，实际1、期望0 |
| skill form, next-rank and future motion details fit the independent scroll (1280x720) | 失败 | 失败 | `ordinaryUnchanged:560`，实际1、期望0 |
| skill form, next-rank and future motion details fit the independent scroll (844x390) | 失败 | 失败 | `ordinaryUnchanged:560`，实际1、期望0 |

其余4项（被动技能只读绘制、角色动作图集、角色悬浮、无效图集回退）在两侧均通过。

对照方法：复制当前 JS 依赖、Host 读取的生产 TS、角色素材与测试到 `/private/tmp`，再建立相同的第二份副本，将 `qa/baseline/manifest.json` 中的16份本轮前文件逐字节替换到第二份。所有16份均按原清单复核SHA-256，其余依赖在两侧相同。

基线清单未包含Host测试文件，而当前Host测试为了新高度函数新增了 `swordQiVisualLift` 导入和VM注入。基线模块尚无该导出，因此仅从**临时基线测试副本**移除了两处 `, swordQiVisualLift`，没有改断言、辅助函数、行数或业务文件。两种Harness哈希及确切适配记录在JSON中。

```sh
node --test --test-name-pattern='skill form|passive skills|character atlas|character flight|skill pane uses' tests/xianxia-tower-host-tools.test.mjs
```

该对照限定于本轮16份快照，不是整个项目的历史检出；它确认这些失败早于本轮视觉修订，不单独证明其他聊天存档改动的具体根因，也没有修复那些改动。工作区和旧封包未被覆盖。

- [完整对照数据](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-sword-qi-curved-2026-10-30/qa/host-baseline-comparison.json)
- [基线实跑日志](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-sword-qi-curved-2026-10-30/qa/host-baseline-isolated.log)
- [当前隔离副本日志](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-sword-qi-curved-2026-10-30/qa/host-current-isolated.log)
- [重现脚本](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-sword-qi-curved-2026-10-30/qa/compare-host-baseline.py)

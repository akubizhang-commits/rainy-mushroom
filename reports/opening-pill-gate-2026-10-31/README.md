# 首层修为丹解锁验证

报告：`../../design/balance/balance-check-opening-pill-gate-2026-10-31.md`。

`summary.json` 包含三种调整后路线及同版本混合路线对照。每组原始JSON记录交易与全部战斗，`.final-campaign.json`为最终存档。`snapshot`是冻结后的实跑版本；`control-snapshot`仅取消修为丹获取/使用门槛，用于同版本对照。每组自己的hashes对应其实际快照，`manifest.json`记录复制来源。

复现时在对应快照目录执行（使用新输出路径，禁止覆盖已有报告）：

```sh
node scripts/verify-alchemy-natural.mjs --route=qi --alchemy=mixed --seed=101 --attempts=20 --research=all --output=../rerun-mixed.json
```

`alchemy`支持`buy`、`craft`、`mixed`。`craft`仅禁止购买修为丹，不禁止购买回血/突破药。所有存储均为进程内独立新档，不操作用户存档。

`targeted-final.tap`是20项专项最终结果，`affected-tests.tap`包含横屏菜单测试及旧失败，`tests-before.tap`和`tests-final.tap`是全仓基线/最终结果，`test-comparison.json`对比失败名称。`build-final.log`为最终成功构建记录。

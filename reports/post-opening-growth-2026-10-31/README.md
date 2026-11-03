# 首层调整后完整成长复查

结论和边界见 `../../design/balance/balance-check-post-opening-growth-2026-10-31.md`。

- `snapshot/`：冻结运行源码、适配后的自然成长入口（未修改游戏运行时）。
- `source-manifest.json`：复制前原始模块和入口脚本哈希；各结果的 `hashes` 保存适配后实际运行哈希。
- 六组 `*-101.json` / `*-211.json`：交易和逐战原始数据；相邻 `.log` 为进度输出。
- `.campaign.json`：最后一次战斗结算存档；`.final-campaign.json`：包含战后研究/学习的最终存档。
- `summary.json`：由 `python3 reports/post-opening-growth-2026-10-31/summarize.py` 重新生成。
- `opening-acceptance.json`、`targeted-tests.tap`：专项验证。

复现（从 snapshot 目录执行，必须使用新的输出路径，入口拒绝覆盖）：

```sh
node scripts/verify-alchemy-natural.mjs --route=qi --alchemy=mixed --seed=101 --attempts=20 --research=all --output=../rerun-qi-mixed-101.json
```

路线为 qi / array / mixed；alchemy 为 none / buy / craft / mixed。craft仅限制修为丹必须自炼，其他药允许购买；none不吃修为丹，仍用回血与突破丹。使用独立内存存储，不读写用户游戏存档。

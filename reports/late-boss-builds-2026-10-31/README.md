# 后期Boss构筑对照

报告：`../../design/balance/balance-check-late-boss-builds-2026-10-31.md`。

主样本：qi、array、mixed、tiandi、sixiang 五份JSON，共45场。entry-qi、entry-array、entry-mixed为第9层较低资源对照，共9场。smoke-qi及failure-replay是重复验证，不计入独立样本。

在`snapshot`目录复现（使用新输出文件）：

```sh
node scripts/late-boss-builds.mjs --route=qi --seeds=101,211,307 --output=../rerun-qi.json
node scripts/late-boss-entry.mjs --route=array --output=../rerun-entry-array.json
```

`summary.json`由`python3 reports/late-boss-builds-2026-10-31/summarize.py`生成。`fixtures.json`含完整配点、装备、预算与学习交易。每份报告自己的hashes对应实际执行文件；source-manifest对应工作区复制源。

所有测试为明示的合成固定配装，不读写用户存档，不证明装备自然获取，不代表人类通关率。

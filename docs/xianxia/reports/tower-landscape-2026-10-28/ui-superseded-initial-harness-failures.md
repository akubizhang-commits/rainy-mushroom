# SUPERSEDED — initial harness failures，非 hex / monster final 验收

**结论：两份旧 FAILED 报告中的 9 个失败场景全部归为 harness 问题，没有由这些断言确认的 production failure。** 仅修验收脚本后，同一主 bundle 四尺寸 8/8 有效场景通过。

| 旧报告 | 失败数 | 分类与原因 | 后续证据 |
| --- | ---: | --- | --- |
| `ui-browser-landscape-final.json` 的 tree | 4 | Harness 坐标时序：真实拖拽后的惯性还在移动图标，点击用了稍早读取的坐标。844×390 点击 x≈319.21，之后图标中心已到 x≈281.01，选择保持御剑术。 | 等待自然惯性停止再取点；四尺寸各 16 节点真实点击全部通过。 |
| 同报告的 input | 4 | Harness 断言语义：暂停 snapshot.input 保留最后一次历史输入；`Run.setInput` 在 paused 时无操作。不能据此断言角色仍移动。 | 宿主 touch/keys/stick 清零；暂停完整 snapshot 不变；恢复前输入清零且位置不跳，四尺寸通过。 |
| `ui-browser-phone-final.json` 的 tree | 1 | Harness 前置条件：首个进化可以在横向 offset=0 时访问，脚本却直接要求 x/y 都非零。 | 先通过真实 drag 建立横向 offset；844×390 非零横纵 pan、独立详情 pan 与加减点保留全部通过。 |

`ui-browser-phone-final.json` 中 **input 条目本身是 PASS**，继续作为 initial 输入证据使用；superseded 的是它的失败 tree 条目，不能把整份报告的 input 误归失败。

两个旧 JSON 顶部已增加：

```text
buildClassification: INITIAL_PRE_HEX_MONSTER
failureDisposition: SUPERSEDED_HARNESS_FAILURES
notFinalAcceptance: true
```

原始 `status: FAILED`、error、actions、checks、results 和截图路径保留，以免改写失败历史。新增未注释前报告 SHA-256 可供追溯。没有改 production 来让测试通过，没有重跑当前未 ready 的 hex/monster 构建。

替代结论见 [ui-initial-report.md](ui-initial-report.md) 与 [ui-initial-summary.json](ui-initial-summary.json)：8/8、141 clicks、164 drags、44 screenshots；runtime exceptions / console errors / HTTP errors / request failures / undefined / NaN 均为 0。

本 initial bundle 为 `index.4b436.js`，SHA-256 `e26afe867fd2aba74053be7d7c3de765c5170a4a6c5cf0563fa73c831ea26438`。此结果早于 hex/monster 集成，也不覆盖 parent 独立 review 已确认并正在修复的极扁 frame / fixed-tick viewport 问题。

Parent 已明确目视确认 `ui-phone-final-844x390-tree-initial-tree.png` 可读、布局符合要求。后续报告命名使用 `ui-final-hex-monster-*`，须在新完整 build-ready 后生成；旧文件名中的 `final` 不赋予最终验收含义。

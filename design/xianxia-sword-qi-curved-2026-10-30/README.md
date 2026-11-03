# 剑气斩胸口对齐与纵横双月牙

2026-10-30。按用户反馈修正已接入的两项效果；复用已有月牙素材，本轮模型生成 0 次、生成费用 0 CU、云端上传 0 次。

- **剑气斩飞行**：整片月牙沿画面竖直方向抬高 64 个设计单位，中心对齐人物胸口。向左、向右、上下与斜向使用同一投影规则。御剑悬浮时额外计入每发释放瞬间的悬浮高度，飞出后不随人物上下摆动。
- **纵横剑气**：替换为两道真正弯曲的月牙交叉，使用独立 `sword-qi-cross-v2.png`。近身、小型飞行、大型飞行均使用双月牙；说明与后备图标同步更新。
- 本轮修正没有调整伤害数值或学习门槛，剑气斩 4 级飞射/7 级三连，以及纵横剑气 4 级飞行/7 级扩大范围保持既定阶段。纵横剑气的两刃仍组成一发，交点只命中一次，消散尾光没有伤害。验收期间另有并行任务调整技能数值与出生位置，已保留并纳入当前构建复核，详见下文。

最终当前版：[11.5 秒原速实录](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-sword-qi-curved-2026-10-30/qa/overview-current/sword-qi-curved-overview.mp4) · [实景联系表](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-sword-qi-curved-2026-10-30/qa/overview-current/contact-sheet.png)。

当前合入版本的 34 项专项测试、15 个实景场景、2 项原生 PNG 加载失败回退及两种横屏退出清理全部通过。源码与测试用构建在最终实景核验前后保持稳定。此前录像、失败尝试和旧封包均保留。

## 实际接入

`TowerSwordQi.js` 为双月牙提供 24 段共享曲线。美术素材将现有单月牙绕白锋中点分别旋转 ±45°，与判定轮廓一致。以 180、270 的整体横宽分别用于普通与大型十字。

双月牙前后深度为横宽的约 0.7092 倍。初次固定构建采用交点在人物前方半个横宽处；后续并行任务加入 `swordQiReleaseOffset(form)`，将大小两种十字的交点统一固定在人物前方 90 单位。最终当前构建保留这一调整，曲率、胸口高度和整体横宽不变。曲线之间的空隙不造成伤害。高速飞行使用连续扫掠，仍在地形阻挡或地图边缘停止。

胸口高度只影响显示投影，不把地面战斗路径向地图北方平移。精灵和资源加载失败时的线条后备共用高度与曲线。+64 来自当前正式人物图集的胸口测量；未将比例不同的程序人物后备宣称为同等精确的胸口匹配。

运行时资源：

```text
cocos-pilot/assets/resources/tower-skill-fx/sword-qi-crescent-v1.png
cocos-pilot/assets/resources/tower-skill-fx/sword-qi-cross-v2.png
```

旧的 `sword-qi-cross-v1.png`、原始月牙、已归档的视频及所有不采用版本都原样保留。旧封包表示其归档时的历史状态，本次另立修订包。

## 证据与复现

- `art/README.md`：像素来源、透明边缘、旋转/缩放和锚点契约；本地重渲染哈希一致。
- `anchor-audit/ANCHOR_REVIEW.md`：人物释放帧、胸口测量、旧实景标线及图标检查。
- `qa/geometry-review.md`：独立代码复核，曲线、出生点、命中去重和显示投影一致。
- `qa/build-final-receipt.json`：第一版正式 Cocos `web-mobile` 构建，对应 42 场景完整验收。
- `qa/build-current-receipt.json`：并行技能改动合入后重新构建，9 份源码在构建前后哈希稳定；最终当前版复核使用这一冻结构建。
- `source/source-index.json` 与 `source-current/source-index.json`：两轮构建时的源码副本及 SHA-256。前一轮快照原样保留。
- `verification-summary.json`：最终专项测试、实景、性能与已有工作区问题的汇总。
- `preservation-before.json`：旧 1,632 个媒体、231 份文档/脚本和 8 份目录索引的逐项哈希核验。

专项回归：

```sh
node --test tests/sword-qi-art.test.mjs tests/tower-skill-effects.test.mjs tests/xianxia-sword-qi-flight.test.mjs
```

首次固定构建对应的 34 项全部通过，覆盖各方向高度、悬浮释放快照、双月牙空隙、交点一次命中、高速穿透、边界/柱体、尾光、存读档及资源失败后备。该阶段另有 143 项关联测试通过，说明和等级规则复查 25 项通过；不同测试组存在重叠，不累计宣称独立测试数量。

并行任务曾短暂把交点改为 30，随后改为最终的 90；期间一次中间代码检查有 2 个位置夹具失效，原日志保留在 `qa/current-concurrent-focus.log`。本任务未回退并行代码，仅让交点夹具读取当前出生契约，并将出生受阻夹具改成角色和目标均合法、但整片气刃确实越过东侧边界的场景。最终当前版检查与录像以 `verification-summary.json` 记录为准，不用初次构建的报告冒充后续版本。

补充 host 检查 7 项中有 3 项既有存档隔离断言失败，均是 `ordinaryUnchanged` 预期写入 0 次、实际 1 次。将本轮前 16 份源文件/测试/资源恢复到独立临时副本后，得到完全相同的 4 项通过、3 项失败。本轮未修改这些存档行为；详见 `qa/host-baseline-comparison.md`。因此不宣称整个共享工作区全量测试通过。

封包程序 `archive-revision.py` 仅在最终实景报告通过后执行。它复核旧文件，建立本次目录索引，并向素材库追加新资源和修订包；既有条目及历史文件保持不变。

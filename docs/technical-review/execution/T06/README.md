# T06 资源发行清单与分组：本地部分完成

已实现可选择的干净 staging 构建；最终 QA Web 与普通 Tap 小游戏均真实构建成功。尚无 Tap 账号和设备，因此没有平台导入、平台包体上限、真机、弱网及所有楼层/技能路径的验收结论。没有实现物理资源分包、远程资源或按技能延迟加载；战斗仍按原有路径预加载特效。

## 已完成的行为

`--staged-assets` 在新的临时工程复制 assets/settings/package/tsconfig 与存在的构建配置、模板、扩展和包，不复用 library/temp/build。它只排除 `release/asset-policy.json` 中两项精确路径及其 metadata：旧版 `tower-skill-fx/flight-stream-v2.png` 和 `tower-monsters-motion/boar.png`。原文件、替代版本、付费原始素材均保留。

策略固定被排除文件的 SHA-256、meta 哈希、UUID、保留的替代路径，并检查文本路径/UUID引用。全部脚本、场景和 prefab 选择逻辑使用人工审查后固定的摘要；变化即拒绝沿用旧审查。最终摘要为 `ea59163e13c7cbc4d930a4da2bea3d1e433d93819234687dfcbb7736ca78c979`。这不是可证明任意程序可达性的静态分析，未来改变加载逻辑必须重新审查。

构建前后核对全部 staging 文件集合和字节，包括可选输入；拒绝新增脚本、变化、丢失和符号链接。构建后验证 Cocos 真实 typed resource path 与 UUID（兼容调试和压缩配置）；只有成功才写 `asset-release.json`。有效构建配置及资源策略进入发行指纹，输出路径在清理旧候选前检查符号链接。默认不加参数的全资源构建保留，便于对照。

共享 `TowerResourceGroups` 提供启动、宗门、战斗、怪物和特效的逻辑标签，供清单与 QA 采样复用；没有通过新命名改变加载时机。

## 字节与包体

| 口径 | 全资源历史对照 | 本轮最终 |
|---|---:|---:|
| 源运行资源文件数 | 380 | 378 |
| 源运行资源字节（不含meta） | 129,023,940 | 119,979,319 |
| Tap ZIP字节 | 129,717,349 | 120,781,438 |
| Tap解压总字节 | 133,123,274 | 124,433,845 |
| Tap主包字节 | 1,819,812 | 2,161,716 |
| Tap resources分包字节 | 129,077,898 | 120,032,738 |

两张旧图的精确原始资源减少为 **9,044,621 字节（8.63 MiB）**。历史对照与最终包还含 T07 和 UI 修复差异，不能把整个 ZIP 差值都归于图片。ZIP、解压字节、平台真实首次下载、纹理解码/GPU驻留是不同口径；最后两项没有由此测得，也未声称满足未知的平台上限。

逐张根据 UUID 找到最终原生输出并比对 SHA-256：**QA 和 Tap 各 363/363 张保留图片与源文件逐字节一致**。两张被排除旧图也仍在源码且哈希不变。没有降分辨率、重编码、减少动画帧或削弱技能效果；这项字节检查不能替代所有动作的真机视觉验收。详细路径和哈希见 `final-image-byte-audit.json.gz`。

## 验证与复审

- 专项115/115、0跳过，包括完整输入篡改、输出符号链接、配置变更、debug缺UUID和官方转换真实路径；原始红绿日志保留在本目录。
- 最终命令：`npm run cocos:build -- --profile=qa --staged-assets`；使用锁定官方插件1.2.2的 `npm run cocos:build:tap -- --staged-assets`，均退出0。
- 最终产物 `run-PNJNNY`，Tap ZIP SHA-256 `055f488cac000775b3fb1cf3aa374ab81c6418452ee3defd6bd5e9d83337869f`；插件转换16个JS成功、0跳过、0失败，ZIP和解压树一致。无网络和子进程尝试。Tap身份为空，`releaseEligible=false`。
- QA/production所有运行脚本仅 `TowerBuildCapabilities.ts` 不同；最终真实QA包2项和production包1项权限测试通过。当前 production 源码与Tap输入指纹再次匹配。
- `t06_review`专项复审及`final_integration_review`集成复审通过。最终全量结果及已知失败见[最终验证](../final-validation/README.md)，真实浏览器回归见[T07最终短测](../T07/browser-final/README.md)。

全部归档 `.gz` 无损；`evidence.json`同时记录原始与压缩后的哈希。保留此前构建失败、复审发现及修复证据，最终结论仅依据对应的最终日志和manifest。

# 剑修十六技能图标

2026-10-28。16 个技能图标已生成、导出、接入 `TowerMenu`，并进入已验证的 web-mobile 构建。风格为用户选择的 A「宣纸玉青」：纸色底、工笔轮廓、玉青与淡金，少量朱砂点缀。

本次范围是技能图标与异步显示接入。没有修改技能数值、学习阶段、点数或经卷价格、掉落规则、存档格式或迁移规则；已有存档和操作权限保护继续保留。

## 来源与导出

| 项目 | 记录 |
| --- | --- |
| 生成服务 | Scenario |
| Asset ID | `asset_gHwjUj6bsJd76cXQ5fwFTPdz` |
| Job ID | `job_iyDuRodFR4fzWAAVr5iTRwu7` |
| 来源文件 | [source-sheet.jpg](source-sheet.jpg)，2048×2048 JPEG，4×4 图表 |
| 来源 SHA-256 | `2bf72fc48ac884bd77d53406c81c8347d68baa97cd408f0534b223c3f6ce4c8c` |
| 生成记录 | [prompt.txt](prompt.txt)、[scenario-proof.png](scenario-proof.png) |
| 加工脚本 | [prepare-assets.py](prepare-assets.py) |
| 逐图坐标及哈希 | [manifest.json](manifest.json) |
| 资源合同 | [asset-contract.json](asset-contract.json) |

每格按清单裁取 512×512，再用 Lanczos 缩至 256×256，保存为 RGB PNG。PNG 是裁切、缩放后像素的无损编码；来源仍是 JPEG，不应称为模型直接输出的无损或透明 PNG。

16 张图均有不透明纸色背景，没有 alpha 通道。运行时由 UI 的圆形 Mask 裁剪，透明圆角不烘焙进素材。统一资源路径为 `cocos-pilot/assets/resources/tower-skill-icons/<id>.png`，loader 请求 `tower-skill-icons/<id>` 的 `ImageAsset`。

## 16/16 覆盖

| 类别 | ID | 技能名 |
| --- | --- | --- |
| 功法 | `sj_yujian` | 御剑术 |
| 功法 | `sj_arc` | 剑气斩 |
| 功法 | `sj_wanjian` | 万剑诀 |
| 功法 | `sj_line` | 一线天 |
| 功法 | `sj_shadow` | 剑影分光 |
| 功法 | `sj_formation` | 两仪剑阵 |
| 心法 | `sj_heart` | 剑心通明 |
| 心法 | `sj_mark` | 青萍剑意 |
| 心法 | `sj_bone` | 剑骨 |
| 心法 | `sj_gate` | 剑开天门 |
| 心法 | `vajra` | 金刚诀 |
| 心法 | `magnet` | 聚灵阵 |
| 进化 | `evo_wanjian` | 万剑归宗 |
| 进化 | `evo_tiandi` | 天地一剑 |
| 进化 | `evo_wuwo` | 无我剑境 |
| 进化 | `evo_sixiang` | 四象剑阵 |

六功法、六心法、四进化均有独立文件，16 个 PNG 哈希各不相同。图表排列用于素材加工，技能树继续按既有九阶段规则归组。

## 实际接入与图像证据

- [game-skill-icons.png](game-skill-icons.png)：主线程提供的真实游戏截图，1280×720；可见金刚诀、聚灵阵的圆形素材、等级角标、小加减按钮及右侧固定详情。该文件沿用 `.png` 名称，实际编码是 JPEG。它证明这张画面的接入状态，不等于逐节点或全视口浏览器验收。
- [skill-icons-preview.png](skill-icons-preview.png)：16 图标加工预览，不是游戏截图。
- [review.html](review.html)：素材评审页。
- [scenario-proof.png](scenario-proof.png)：Scenario 生成界面证明，不是游戏截图。

[TowerSkillIcons.ts](../../cocos-pilot/assets/scripts/TowerSkillIcons.ts) 按菜单生命周期缓存图片，校验 256×256 尺寸后创建纹理与 SpriteFrame。素材放入 88×88 圆形 Mask；原 96×96 点击区、边框和 32×32 等级角标在裁剪外，角标绘制在素材上方。加载中或失败时保留简笔占位；重绘取消旧节点订阅，销毁释放已持有资源并忽略迟到回调。

既有交互保持：横屏／竖屏加减可见底分别为 32／44 logical，触控区为 72／88；塔内暂停技能页仅展示加号，减点与全洗仅限宗门藏经阁。

## 验证记录

本 README 整理已有日志及本轮只读检查，没有再次构建或打开浏览器。

| 检查 | 结果与证据 |
| --- | --- |
| 定向测试 | **70/70 通过**，`/tmp/tower-icon-tests.log`；包含 62 项 host-tools 和 8 项 loader 测试 |
| Creator TypeScript | 主线程报告退出 0；`/tmp/tower-icon-tsc.log` 无诊断输出 |
| `npm run check` | 通过，`/tmp/tower-icon-check.log` 记录语法及依赖检查成功 |
| web-mobile 构建 | 主线程报告退出 0；`/tmp/tower-icon-build.log` 记录同步 46 个共享模块及构建成功 |
| 源码 loader 宿主回归 | **62/62 通过**，无失败、无跳过 |
| 编译后 loader 宿主回归 | **62/62 通过**，执行实际 bundle 的 loader 与 Babel helper；引擎资源边界仍使用受控 stub |
| 反例检查 | 仅在测试进程内恢复旧 `[].concat(entry.waiting)`，两项异步图标用例均捕获 `ready is not a function`；未修改构建文件 |
| 打包资源 | **16/16 ID、16/16 PNG 通过**；UUID 与源 `.meta` 对应，均为 256×256，CRC、解压及与源文件逐字节比较通过；总计 938,925 字节 |
| 全量测试首轮 | **1257/1258 通过**；唯一失败是旧 `survivor-host` 将整个 `resources` 目录视为已删除资源 |
| 全量测试修正后 | **1258/1258 通过**，`/tmp/tower-icons-full-tests-final.log`；主线程仅放行 `tower-skill-icons`、其目录 meta 与 `TowerSkillIcons.ts`，原已删除目录保护保留 |

测试覆盖图标到齐前后的点击、圆形裁剪节点与角标层级、加减后的选中及滚动保留、缺图占位、旧节点与销毁后的回调、塔内合法升级和减点禁止，以及原有存档、拖动和暂停保护。host/stub 证据不替代 GPU 渲染或真机触摸验收。

复跑命令（仓库根目录）：

```sh
node --test tests/xianxia-tower-host-tools.test.mjs tests/xianxia-tower-skill-icons.test.mjs
TOWER_HOST_BUNDLE="$PWD/cocos-pilot/build/web-mobile/assets/main/index.1ed4a.js" \
  node --test tests/xianxia-tower-host-tools.test.mjs
```

普通模式不依赖构建产物；设置 `TOWER_HOST_BUNDLE` 后读取已有 bundle 及同次构建的 `src/chunks`，不触发构建。

## Array.from 编译修复与产物标识

Creator 的数组专用展开转换曾把 Set 展开变为 `[].concat(entry.waiting)`，让 Set 本身进入回调数组；原生 Node 的展开语义无法暴露这个问题。修复显式使用 `Array.from(entry.waiting)`，在清空订阅集合前取得真正的回调快照。

已检查 [index.1ed4a.js](../../cocos-pilot/build/web-mobile/assets/main/index.1ed4a.js) 中的 `TowerSkillIcons` 模块：保留 `var waiting = Array.from(entry.waiting);`，不存在旧的 `[].concat(entry.waiting)`。上述编译后行为回归和反例检查均针对这一产物。

- Bundle SHA-256：`f3b09cdb53c58bcba39c336a67cc8c044ea4762e04546c3aed059d64dc16f55d`
- 资源配置：[config.fd3be.json](../../cocos-pilot/build/web-mobile/assets/resources/config.fd3be.json)
- 资源配置 SHA-256：`59611ccbb17dc7bc7f3954e363aca00787e2367ff432d7ba6ef86c27c327036f`
- 构建记录时间：`2026-10-28T10:13:32.405Z`，来自 [release-build.json](../../cocos-pilot/build/web-mobile/release-build.json)

构建目录和 `/tmp` 日志属于本地验证证据，不保证随源码仓库分发；素材来源、清单、加工脚本及截图保存在本目录。

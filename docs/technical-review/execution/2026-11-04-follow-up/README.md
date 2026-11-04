# 2026-11-04：HUD 与合法装备夹具跟进验收

已执行用户的两项确认：[保留横向经验条、按现行规则重建合法装备测试配装](../../decisions/2026-11-04-hud-and-equipment.md)。本轮只改测试和文档，没有改生产源码、数值、技能时序、图像或视频。

全量 **2253 项：2250 通过、3 失败、0 跳过/取消/TODO**；`npm run check` 通过。相对上一轮的 2246 项，新增 3 项 HUD 检查、4 项装备合法性检查；四项旧 HUD 冲突按用户决定更新后通过。**T02 仍未达到全绿验收，T01–T09 不能整体标记完成。**

## 本轮落实

- **HUD**：战斗底部横向经验条保持当前布局；升级归零、修为瓶颈及总上限满条，宗门顶部不显示经验条。覆盖三个横屏尺寸、异常输入、图片加载失败、重绘与销毁；保留旧玉龙独立绘制器测试和所有素材。[HUD 定向报告](../T02F/2026-11-04-hud-update/README.md)包含迁移对应关系及五组负向探针。
- **装备**：原 50 行均通过正常 Campaign 学习和重读验证，完成 150 个装备样本及 42 个初始三件套基准样本。29 行原合法配置与 87 个样本保持原值；只对其余 21 行执行事前固定的裁剪/封顶，未放宽原目标或 ±10% 容差。
- **实际预算**：40 行达标、10 行偏离目标，完整保留为失败。17 行缺少原请求的周天覆盖，另 4 行周天封顶 6；不把这些准备或部分构筑称为完整流派。全部原/新配置、原因及偏差见[装备定向报告](../T02D/2026-11-04-legal-fixtures/README.md)。

## 全量及编译包复验

```sh
TAP_PLUGIN_ARCHIVE=/private/tmp/t03-tap-minigame-official-1.2.2.zip \
TAP_PLUGIN_DIR=/private/tmp/t03-tap-plugin-readonly/taptap-minigame-tools npm test
npm run check
```

插件使用上一轮锁定的官方离线副本；没有因缺少环境变量跳过转换测试。精确命令、时间、退出码与原始日志 SHA-256 见 `full-test-result.json`、`check-result.json`；完整输出见对应 `.log.gz`。全量退出码 1、check 退出码 0。

三项失败名称：

1. `conservative three-slot coefficient screening can certify the6x ceiling without claiming full-combat proof`：保守系数筛查最大 8.40291387189434，不能据此认证 6 倍上界，也不能将该系数当作实测 DPS。
2. `all50 legal three-slot cases measure150 samples and satisfy their approved180s DPS target within10percent`：50 行合法、10 行实际输出超差；原 3 项超差不变，新增 7 项来自 Lv4 准备构筑。
3. `one level 1 sword-line volley completes one character action without rewinding on its 1 hits`：60 Hz 下最后观察帧为 12，断言要求 13；断言和生产显示代码均保持。

另外直接加载既有编译包进行权限复验：QA **2/2**、production **1/1**，均退出 0。原 T04 权限、编译包加载器与 Cocos 延迟销毁回归均未被 HUD 迁移改动。精确包路径、包 SHA-256 与命令记录在 `qa-capabilities-result.json`、`production-capabilities-result.json`。

独立只读复审 `followup_independent_review` 对 HUD、装备两项均判定通过，没有发现需要修正的缺陷。审查员另跑 HUD 等相关定向 15 项（14 通过，保留原剑线失败）、装备合法性 5/5，核对了精确补丁、证据哈希、全部样本及受保护测试。该通过仅指本轮测试基准迁移，不代表预算或剑线验收通过。

## 当前画面检查

复用上轮最终 QA Web 包 `index.38d85.js`，在本机浏览器以 1280×720、844×390 横屏检查。采用内存存档，正常进入一层并通过战斗获得经验；没有为本轮画面检查人工发放经验或资源。

- 宗门经验节点隐藏，角色信息面板继续显示修为。
- 战斗经验条直接挂在战场 HUD 根节点，宽 1248、高 4，水平居中；逻辑坐标保持距屏底中心 24 单位。1280×720 时 y=-336；844×390 的逻辑高度 591.4691943127962，y=-271.7345971563981。
- 两张 PNG 已人工查看：底部轨道及已有经验填充可见，头像、气血和灵力仍在顶部；没有新增遮挡。截图是 QA 包，保留其调试显示，不能作为生产包或全特效画质验收。
- 观测顺序为宗门 → 战斗 1280（暂停读取，XP=2）→ 战斗 844（暂停读取，XP=9）→ 返回宗门角色面板（XP=15）。截图在恢复战斗后取得，因此不以截图填充长度反推暂停记录的 XP。
- 原始控制台 **1 条错误：favicon.ico 404**；未观测到游戏运行错误。另有 **66 条警告：63 条弃用、3 条窗口尺寸设置不支持**。资源记录中 242 项返回 200，唯一 404 为 favicon。完整日志保留，不将浏览器总错误数写为 0。

`hud-decision-checks.json.gz` 保留构建戳、节点状态、资源状态与采样器信息；`hud-decision-console.txt.gz` 为原控制台。两张截图为 `hud-decision-1280.png`、`hud-decision-844.png`。这些是桌面浏览器短时功能检查，不是手机、弱网、完整战斗性能或全路径验收。

## 构建与剩余边界

本轮没有运行新的 Creator 构建，因为没有改变任何构建输入。`build-verification.json` 确认当前生产输入与既有 Tap `run-PNJNNY` 指纹完全匹配：inputDigest `b45a5705a868531c5c9a0abfca01bd8a1600c60073b82705f313d7cd2f840a20`；浏览器读到的 QA 构建戳也与磁盘包一致。QA/production 的原有配置差异和资源字节证据见[上轮 T06](../T06/README.md)。

单发剑技经只读复核属于尚待明确的离散显示采样契约：释放在第 22 tick，结束在第 27 tick，五次有效采样得到 8、9、10、11、12；末帧 13 的连续时间窗中没有 60 Hz 采样点，结束时刻本身没有提前。现有证据不足以把它直接判作生产提前截断或无效测试。本轮两项用户确认不包含新的动作端点优先策略，因此没有改变动作、延时或放宽断言。

仍无 Tap AppID/账号及目标设备；T03 平台导入、T06 平台包体与全路径/弱网、T07 设备性能基线待补。T08/T09 继续按测量证据触发，未实施缓存淘汰、快照或排序重构。

## 证据保存

CSV 交付文件统一为 LF 换行；逐单元格校验与原导出完全一致，数值未改，转换记录见 `integration-checks.json`。

本目录 `result.json` 汇总实际结果；`two-slot-budget.json.gz` 是全量生成的诊断文件原字节副本。各文件的压缩/原始 SHA-256 见 `evidence.sha256.json`。旧报告保留其当时结论，当前状态以[任务板](../../TASK_BOARD.md)、本次决策与本报告为准。

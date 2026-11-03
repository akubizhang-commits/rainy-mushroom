# 横屏真实浏览器验收准备

**DELIVERY 已完成 — 最新 Mask 定向 3/3 通过，VIS-01 closed，已知真实未闭项 0；最新 hash 与完整 source bridge 见 `ui-delivery.md`。以下保留 initial 阶段准备记录。**

2026-10-28 首轮四种常见尺寸 8/8 场景通过，141 次真实点击、164 次拖拽、44 张截图。当前实际主 bundle 为 `index.4b436.js`，SHA-256 `e26afe867fd2aba74053be7d7c3de765c5170a4a6c5cf0563fa73c831ea26438`。汇总以 `ui-initial-report.md` 为准。后续包含 hexworld 的 final 构建尚未收到 build-ready。

所有现有 `ui-*-final-*` 文件名均属于此 **initial build**，不是后续修复的最终验收。保留原路径便于已有截图引用，不覆盖、不删除旧证据。`ui-browser-landscape-final.json` 和 `ui-browser-phone-final.json` 中失败分别涉及验收脚本的惯性滚动、暂停快照历史输入及非零横向 pan 前置条件；不能据此报告 production 缺陷。修正仅发生在 QA 脚本。

独立脚本：`scripts/verify-tower-landscape-ui.cjs`。只读复用既有 Campaign/Playwright 模式，不依赖旧 UI 脚本的执行，也不修改它或 production。

## 已完成预检

- Node 语法检查通过。
- 当前源码 selector 合约检查通过。
- 两个内存 Campaign fixture 经过真实校验与编码往返；技能/经卷/进化使用 `Campaign.act` 购买。人为设置的经验、通层、妖丹等来源单独标注为 UI fixture。
- 12 项基础技能和 4 项进化的定义数量、进化退点成本及可加点条件检查通过。
- `--check` 不加载/启动浏览器，不访问预览服务器，不 build、不 sync。
- 未提供 `--check` 或 `--build-ready` 时，脚本拒绝执行。

## 矩阵

1280×720、844×390、1024×768、390×844 fallback，每个尺寸两类独立上下文，共 8 个预计场景。

| 场景 | 覆盖 |
| --- | --- |
| `tree` | 左树右固定详情 / 竖屏上下 fallback；16 个真实圆图点击可访问；等级徽标左下；名称和固有 CD/命中间隔/常驻；炼气与金丹各自同排；真实二维拖拽；独立详情滚动；基础与进化 +/− 保留选中、树横纵 offset、详情 offset；全洗弹窗 bounds；分配存档 reload |
| `input` | 真实左下摇杆 drag/hold/release；摇杆不移位；右侧空白拖拽不移动；握住鼠标时按 Escape 暂停并清理 touch；按住 D 时真实点击技能入口，清理按键并冻结完整快照/CD；旋转往返保留 HP/RNG/time/wave/掉落/进度及 activeRun；工具/暂停/reload 弹窗 bounds；reload 后继续挑战；普通 raw 存档隔离 |

输入场景通过真实按钮开启独立体验档和无敌工具，避免移动检查被死亡/伤害干扰。角色移动与计时仍由真实浏览器帧驱动；不注入位置、敌人、伤害、击杀或进度，不是平衡证据。

旋转比较在暂停技能页进行，避免将正常游戏推进误判为 resize 污染。报告同时记录完整快照 hash、HP、RNG、time、wave、clearedWaves 和 activeRun hash。此项证明暂停状态的精确保留，不夸称覆盖任意战斗中旋转竞态。

## 执行方式

收到新 build-ready 后：

```sh
UI_CHROMIUM_EXECUTABLE=/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell \
UI_RUN_PHASE=initial \
node scripts/verify-tower-landscape-ui.cjs --build-ready
```

可用 `UI_CASES=tree`、`UI_SIZES=844x390`、`UI_RUN_TAG=rerun` 缩小复测。默认预览地址沿用 `127.0.0.1:8767` 的 web-mobile；可由 `PREVIEW_URL` 覆盖。

后续 final build 不重复无关旧布局全矩阵；重点复查 844×390，以及新增 1920×280、3840×1080 的 SHOW_ALL / 1280×560 letterbox、弹窗边界和实际视野同步。收到 parent 新 build-ready 前不跑极端尺寸旧构建。

每场景新建非持久 Playwright context；使用请求的 bundled Playwright 与已安装的 Playwright headless executable。无 CDP、无用户 profile、无 liveIAB。

## 报告

预计产生 `ui-browser-<tag>.json`、`ui-<tag>-<尺寸>-<场景>-*.png` 及对应 scene/geometry JSON。

JSON 记录真实点击/拖拽/按键/resize、各次状态检查、截图、实际响应 bundle hash、runtime exceptions、console errors/warnings、HTTP/request failures 和无效生产文字。自动断言通过后还需查看圆图绘制、连接线、固定详情和弹窗截图，不能仅凭 Graphics 组件存在声称视觉通过。

当前 selector 对照见 `ui-selectors.md`，可由 parent 转发给 Linnaeus。

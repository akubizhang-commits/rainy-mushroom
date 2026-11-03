# 横屏 UI initial build 浏览器验收

**本轮 8/8 场景通过，73 项场景检查；不是后续 hexworld / viewport 修复的 final 验收。**

目录中旧 `FAILED` 的即时分类见 [ui-superseded-initial-harness-failures.md](ui-superseded-initial-harness-failures.md)：9 个失败均为 harness，保留原始失败内容；两份 JSON 已增加显式 superseded 元数据。Parent 已目视确认 844×390 首张树截图可读且布局符合要求。

实际输入共 **141 次 pointer click、164 次 pointer drag、8 次单独 release、16 次键盘事件、8 次 viewport resize**。保存 **44 张场景截图**及对应只读场景/Label/geometry JSON。汇总和完整实际操作列表见 [ui-initial-summary.json](ui-initial-summary.json)。

| CSS viewport | 树场景 | 输入场景 | 实际 clicks | 实际 drags | 截图 |
| --- | --- | --- | ---: | ---: | ---: |
| 1280×720 | PASS | PASS | 35 | 40 | 11 |
| 844×390 | PASS | PASS | 35 | 55 | 11 |
| 1024×768 | PASS | PASS | 35 | 26 | 11 |
| 390×844 fallback | PASS | PASS | 36 | 43 | 11 |

## 构建与错误

实际响应主 bundle：`assets/main/index.4b436.js`

SHA-256：`e26afe867fd2aba74053be7d7c3de765c5170a4a6c5cf0563fa73c831ea26438`

八个有效场景的主 bundle 首次响应 hash 一致。reload 中出现的 304 无 body 条目保留在原始报告，属于缓存响应无法再次抓取 body，不是网络请求失败。

- Runtime page exceptions：0。
- Console errors：0。
- HTTP errors / request failures：0 / 0。
- 生产 Label 中 `undefined` / `NaN`：0。
- Console warnings：148 条，保留未忽略。包括 getFrameSize 弃用 88、setFrameSize 弃用 24、window size unsupported 24、截图 ReadPixels GPU stall 12。它们没有令场景断言失败，不声称 console 完全安静。

## 已验证行为

四个尺寸各真实点击 16 个圆图，通过左右/上下拖拽访问全部节点。12 基础节点同一炼气行，4 进化节点同一金丹行；圆形绘制、左下等级徽标、名称与技能固有节奏均有实际场景证据。横屏左树右固定详情，竖屏上树下详情；点击名称/圆图仍在同一技能树页面。

844×390 初始逻辑树 viewport 为 820×297.47、详情 viewport 为 364×281.47。前四列 8 个 +/− 控件完整位于 Mask 内，每个 52.75×52.75 CSS px；底部约余 0.97 CSS px。此轮实际点击采用控件中心，圆图边缘命中与 Mask 外点击负例留到 final 定向补查。

各尺寸均真实执行 `sj_line` 加点/退点、`evo_wanjian` 退点/加点，确认点数即刻更新、可变退款与 Campaign quote 一致、永久经卷保留、选中技能与树 x/y offset、详情 y offset 保留。进化场景明确使用非零横纵树滚动，并先真实滚动详情再执行加减点。升级后控件中心仍可点击，固定详情边界不移动。

844×390 进化操作前后树 offset 为 `(-90.9948, 608.5947028436019)`，详情 y 为 `221.42220284360212`，两次操作均保持。390×844 进化截图可直接读到实际生产退款预览“立即返还4技能点 / 万剑归宗 2 → 1级”，没有旧版 `undefined→undefined`。

输入场景通过实际按钮进入独立体验档并开启无敌工具：固定左下摇杆真实 drag/hold 产生移动，release 清空 touch/stick 且停止位移；右侧空白 drag 不产生移动。持有摇杆时 Escape 暂停清理宿主输入，恢复前 run 输入清零；持有 D 时进入技能页清理按键并冻结完整战斗快照/CD。

旋转往返比较暂停时完整 snapshot 与 persisted activeRun，HP/RNG/time/wave/掉落/进度均保持。各场景 reload 后可继续战斗，普通 raw 存档未改变。所有工具、暂停、reload、全洗预览弹窗均通过边界检查；全洗只打开预览并关闭，没有提交。

## 给 parent 的截图

- [844×390 初始树：圆图、首四列加减点、固定详情](ui-tree-initial-844x390-tree-initial-tree.png)
- [844×390 进化加减点后：选中/双轴 pan/连接线](ui-tree-initial-844x390-tree-pan-and-selection-retained.png)
- [844×390 固定左下摇杆](ui-phone-final-844x390-input-fixed-joystick.png)
- [844×390 暂停弹窗](ui-phone-final-844x390-input-pause-modal.png)
- [1280×720 初始树](ui-tree-other-initial-1280x720-tree-initial-tree.png)
- [1024×768 全洗退款预览](ui-tree-other-initial-1024x768-tree-respec-modal.png)
- [390×844 上下分栏 fallback](ui-tree-other-initial-390x844-tree-initial-tree.png)
- [390×844 进化退款实际文字与连接线](ui-tree-other-initial-390x844-tree-pan-and-selection-retained.png)

已目视抽查圆图/徽标、正常 ScrollView 裁剪、同页固定详情、连接线、摇杆及弹窗。没有确认的新 production failure。超长详情在自身 ScrollView 内裁剪，属于可滚动内容；首屏之外的技能通过真实拖拽访问。

## 原始记录与 superseded 证据

有效记录：

- `ui-browser-tree-initial.json`：844×390 tree。
- `ui-browser-tree-other-initial.json`：其他三个 tree。
- `ui-browser-phone-final.json`：仅 844×390 input 条目有效。
- `ui-browser-input-final.json`：其他三个 input。

**所有现有文件名中的 `final` 都是旧命名，构建分类统一为 initial。** 保留路径供已有引用使用，不把这些记录算作后续构建验收。

`ui-browser-landscape-final.json` 的八个早期失败场景已 superseded：脚本在惯性滚动未停时使用旧目标坐标，以及把暂停快照的历史 input 误当仍活动的宿主输入。`ui-browser-phone-final.json` 的 tree 失败是脚本尚未建立非零横向 pan 就断言前置条件。只修 QA：观察自然惯性停止、拖后停手再 release、真实建立横向 pan，以及比较宿主 controls/暂停冻结/恢复清零。没有修改 production。

## 边界与下一轮

使用用户指定 bundled Playwright、独立非持久 headless Chromium 155.0.8059.12 contexts。fixture 为人工高经验/已通层 Campaign，经真实校验编码及 Campaign.act 购买技能/经卷；这是 UI 验收，不是自然养成或平衡结论。没有使用用户 profile/liveIAB；没有 build/sync 或 runtime 编辑。

本轮是 CSS viewport 下真实鼠标/键盘输入，不等同实体手机触摸硬件。CD 文案目前为固有节奏，非动态剩余倒计时；暂停冻结通过完整 snapshot 验证。

极端 1920×280 / 3840×1080 的 SHOW_ALL、×3 fixed-tick viewport、六边形新 attempt、斜边整圆 containment、右上全图指示均待新 build-ready；不能以本轮结果宣称通过。定向计划见 [ui-final-plan.md](ui-final-plan.md)。

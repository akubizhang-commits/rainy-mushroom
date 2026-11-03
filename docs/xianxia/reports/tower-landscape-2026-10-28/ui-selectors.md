# 横屏 QA selector 对照 — 给 Linnaeus / parent

状态：**initial 8/8；delivery 六尺寸 7/7、arc 定向 3/3、Mask 定向 3/3 完成，VIS-01 closed，详见 `ui-delivery.md`。** 旧文件名中的 `final` 不代表后续构建通过，旧 harness 分类继续保留。

已读 Linnaeus 的 `menu-design.md` 最终交接，selectors 一致。844×390 将特别验证逻辑树 viewport `820×297.47`、详情 viewport `364×281.47`，并在首次平移前检查前四列 +/− 的完整可见性、底部像素舍入及至少 48 CSS px 点击区域。也会验证重选同一技能不重置详情滚动。

QA 仅拥有 `scripts/verify-tower-landscape-ui.cjs` 与本目录 `ui-*`；未修改 production。无需给用户 IAB 添加钩子或刷新。

## 当前源码约定

| 用途 | Node 名称 / 读取字段 |
| --- | --- |
| 左侧树面板 | `技能树面板` |
| 二维树 viewport | `技能树二维卷轴` |
| 树 content | `境界技能树内容` |
| 固定详情面板 | `技能详情固定栏` |
| 详情独立 viewport | `技能详情独立卷轴` |
| 详情 content | `技能详情栏内容` |
| 技能圆图 / 等级徽标 | `技能图标-<id>` / `技能等级-<id>` |
| 技能名称点击区 | `技能节点-<id>` |
| 加点 / 退点 | `learnSkill-<id>` / `decreaseSkill-<id>` |
| 当前选中技能 | `TowerMenu.detailId`，只读观察 |
| 树横纵 offset | `TowerMenu.scroll.getScrollOffset()`，只读观察 |
| 详情纵向 offset | `TowerMenu.skillPaneScroll.getScrollOffset()`，只读观察 |
| 固定左下摇杆 hit area | `移动摇杆`，当前为 224×224 design units |
| 塔内快捷技能入口 | 横屏战场内 `技能树` |
| 暂停弹窗技能入口 | `技能树 · 可用N点` |
| 暂停 / 工具弹窗 | `对话面板` |
| 全洗弹窗 | `全洗退款预览`（仅打开检查 bounds，不提交全洗） |

目前准备按以下真实源码行为验收：

- 12 项基础功法/心法图标在炼气同排，4 项进化在金丹同排。分组表示首次学习的大境界，不新增筑基解锁条件。
- 图标是圆形绘制、左下角为等级徽标；名称同时显示固定 CD、命中间隔或“常驻”。**当前源码是固有技能节奏，不是动态剩余 CD 倒计时。** 如设计改为倒计时或移动了文字，请通过此报告/parent 告知。
- 横屏左树右详情；390×844 fallback 为上树下详情，两者独立滚动。
- 点击圆图或名称选中；+／−保留 `detailId`、树 x/y offset、详情 y offset。QA 在非零横纵 pan 下验证。
- Cocos 树 `getScrollOffset().x` 左移时可能为负。QA 比较真实前后值，不把正负号误作错误。
- 固定摇杆仅自身 hit area 接收移动输入；右侧空白真实拖拽不得移动角色或重定位摇杆。

请尽量保留这些稳定名称。当前脚本不依赖 `__towerTest.action()`，不触发 Button.emit，也不直接修改 scroll/state；所有操作通过 Playwright 的鼠标、拖拽或键盘。

## 如 selector / 布局还有变化

可直接由 parent 转发变更，也可在本报告之外写一个由你拥有的交接文件让 parent 告知路径。QA 会在新 build-ready 后先确认当前源码/实际场景，再执行验收。

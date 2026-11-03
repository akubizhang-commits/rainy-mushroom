# 藏经阁接入计划

**Goal:** 按已提供的布局和交互说明继续完善正式藏经阁。
**Architecture:** 保留 TowerLibrary 只读数据和 TowerLibraryPanel 原生 Cocos UI；阅读偏好独立保存，不接触角色事务。
**Tech Stack:** Cocos Creator 3.8.8 / TypeScript / Node test / Playwright。
**Spec:** design/library-ui-review/interaction-spec.md、art-prompts.md。

- [x] 核对现有功能、物品数据与素材；数据基线 9/9 通过。
- [x] 完善键盘焦点、目录章节恢复、品质说明；真实浏览器输入验证。
- [ ] 按六张必需图的 Prompt 制作并检查 Alpha、尺寸与风格，保留原图和生成记录；接入正式场景。用户决定自行制作素材，已交付 art-production-pack.zip；资源加载接口已预留，待原图到位校准与验收。
- [x] 在 1280×720 和 844×390 验证，构建并记录结果。

约束：仅横屏；正文至少16px；按钮至少44px；阅读不修改角色存档；复用既有物品图标，原素材不覆盖。
风险检查：搜索输入方向键不翻页；Tab不进入隐藏页；首尾不越界；目录关闭回原条目；损坏偏好不阻塞阅读。

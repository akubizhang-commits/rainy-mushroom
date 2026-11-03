# 加载页插画 · 2026-11-02

用户提供 image_268823313895527.png 并授权验收后接入，随后明确要求本地移除右下角标识，不使用 Scenario 付费额度。

- 原始文件：source/user-original.png，完整保留用户提供的千问生成图。
- 修补母图：loading-keyart-clean.png，2560×1440 RGB，未裁切、未缩放。
- repair.py：仅在标识区域提取亮色笔画蒙版，再使用邻域谐和插值修补。未调用模型、网络生成或付费服务。
- repair-report.json：输入输出哈希与变化范围；6037 个像素改变，范围 x=2320..2517、y=1353..1396，其他像素保持一致。
- repair-detail.png：局部放大验收图。
- prepare-runtime.py：保留母图，另导出 1920×1080 JPEG；在底部添加连续的柔和暗部，供加载文字使用。
- 运行图：cocos-pilot/assets/resources/loading/keyart.jpg，438326 字节，约 428 KiB。

画面验收：少女剑修、飞剑、石阶与妖塔能表达御剑与闯塔玩法。塔顶有意超出画面可接受；较宽的横屏采用底部对齐 cover，保住脚底、飞剑和门口。标题放左上，加载状态、进度、重试按钮放右下。

已接入 HTML 启动层和 Cocos 游戏加载层。HTML 仅在 Cocos 插画准备好或出现可交互失败界面后移除；资源失败可重试。图片加载期间维持原有战斗冻结机制。

本次 Scenario 调用 0 次，付费生成调用 0 次。
验收截图与测试记录见 reports/loading-keyart-2026-11-02。

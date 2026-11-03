# 天地一剑消散延长：游戏内候选预演

## 审核文件

- **有效合并视频：** [attempt-02/tiandi-tail-ranks-realtime-review.mp4](attempt-02/tiandi-tail-ranks-realtime-review.mp4)
- 两阶分别原速录制：[一阶](attempt-02/rank1-realtime.webm)、[二阶](attempt-02/rank2-realtime.webm)。合并视频来自这两段原始 Cocos Canvas 录制，只叠加阶段说明，没有整体降速。
- [验证报告](attempt-02/browser.json)、[有效导出记录](attempt-02/video-export-corrected.json)、[画面采样](attempt-02/tiandi-tail-video-contact.png)。
- [浏览器预演脚本快照](attempt-02/rehearsal.snapshot.cjs)、[视频导出脚本快照](attempt-02/export_review.snapshot.py)、[实际使用的配置](attempt-02/candidate-config.json)。

有效视频为 1280 × 720、30 fps、139 帧、4.633333 秒，包含一阶和二阶各一次释放。游戏场景、角色与动作由真实 Cocos 运行时绘制；候选特效仅通过浏览器临时注入，尚未正式接入游戏。

## 调整与验证

沿用原 `../../attempt-03/tiandi-candidate-atlas.png` 的相同字节，未重新生成像素。特效窗口由 0.5 秒延长到 0.75 秒；前 0.0625 秒保持原速度，其余帧改用以下源时间：

```text
sourceAge = age                                      (age <= 0.0625)
sourceAge = 0.0625 + (age - 0.0625) * 0.4375 / 0.6875 (age > 0.0625)
```

18 个原有场景夹具（两种视口）及 2 个清理检查全部通过，共 20 项；浏览器错误为 0。验证包括两阶各单次命中扣血、原有 0.45 秒前摇与 0.30 秒方向锁定、移动与障碍物表现、暂停冻结、范围与绘制区域，以及 0.25 秒逻辑效果结束后仍可按 0.75 秒视觉窗口收尾。

独立按上述公式验证特效帧索引：前 0.0625 秒与原版一致，0.5 秒后仍存在非空尾光。每个常规夹具有 88 个角色姿态与动作帧样本，同上一轮原速候选预演逐点一致。新视频画面已抽帧检查，包含实际释放和消散阶段，没有菜单或加载画面。

报告确认运行前后生产源码与资源哈希不变；本轮未改动生产源码、资源或构建产物，未调用付费生成，也未上传云端。

## 保留的过程记录

- `attempt-01/`：首次启动被本地沙箱阻止监听 localhost，未启动浏览器，原因保存在 `startup-error.log`。
- `attempt-02/video-export.json` 标记 **FAIL**：第一次静态字幕合成使用 `shortest=1`，误使两个 MP4 各仅一帧。无效文件 `rank1-realtime.mp4`、`rank2-realtime.mp4`、`tiandi-long-tail-ranks-realtime.mp4`、`tiandi-long-tail-video-contact.png` 和 `concat-files.txt` 已原样保留；**不要用它们审核效果**。
- 修正后输出采用不同文件名，原始 WebM 录制未变。有效文件是本页首项 **`attempt-02/tiandi-tail-ranks-realtime-review.mp4`**，对应 `video-export-corrected.json` 的 PASS 结果。

旧图集、旧预览、历史记录均保留，供后续复用。

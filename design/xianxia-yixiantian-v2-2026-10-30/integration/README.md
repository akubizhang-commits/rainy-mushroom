# 一线天接入验证

实际 Cocos web-mobile 构建验证通过。用户预览使用 `runtime-three-hit-preview.mp4`（1280×720，3.4秒），截取 `runtime-demo-realtime.mp4` 的1.8～5.2秒，展示素材加载完成后的两轮 Lv10 三次贯穿，未改变播放速度。

完整的 `runtime-demo-realtime.mp4`（5.2秒）和原始录制 `runtime-demo-realtime.webm` 均保留。这是演武场中由生产 `TowerView.update(dt)` 实时驱动的录制，先运行 Lv1 单次贯穿，再运行两轮 Lv10 三次贯穿；完整短片开头包含短暂素材加载过程。`runtime-demo-realtime.json` 记录每段墙钟时间与模拟时间、真实释放、场景状态与零存档写入。

- `browser.json`：16 组真实 `TowerRun.advance` 释放用例，1280×720 和 844×390 两种横屏；Lv1 四方向、Lv6 两次贯穿、Lv10 三次贯穿、柱体截断、边界截断均通过。
- 核对真实贴图 HTTP 响应 SHA-256 与运行时 PNG 相同，完整 16 帧，原点锚点、长宽独立映射、方向与实际终点均匹配。
- 同轮移动角色后起点与方向保持；暂停与相机移动保持帧相位；横屏尺寸重建保持相位。
- 源效果在 0.25 秒后移除，逐 ID 视觉轨迹持续到 0.33 秒播放窗口后清理。原图最后帧本身逐渐接近透明，0.33 秒是播放窗口，并不表示最后时刻仍有强亮光。
- 新浏览器环境中将实际贴图请求返回 404，逐 ID 矢量回退仍正常，已加载贴图没有重复矢量描画；场景退出清理与零存档写入通过。
- `tests.json`：修改前 1824 项 / 1783 通过 / 41 失败；修改后 1833 项 / 1792 通过 / 41 失败，失败名称完全一致，新增 9 项通过。

`rank1-right-tail-unobstructed-1280.png` 是重建视口后的无遮挡尾段证据：测试仅隐藏暂停菜单节点，模拟时间仍冻结，具体操作记录在 `browser.json.resize.pauseOverlayHiddenForScreenshot`。原被菜单遮挡的 `rank1-right-tail-1280.png` 也保留。

`diagnostic-frame-step.webm` / `.json` 为先前逐帧诊断录制，会随浏览器帧率慢放，仅作诊断保留，不作为实时预览。

独立代码复核范围：SwordLineArt 的仅 sj_line 过滤、时序映射、逐 ID 缓存、容量回退、异步加载与销毁；TowerView 建层/绘制/清理；TowerSkillEffects 逐 ID 抑制。未发现本轮阻塞项。无游戏伤害、范围、释放次数等逻辑修改。

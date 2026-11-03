# 天地一剑 · 消散延长审核版

2026-10-30，用户认可原效果并希望消散慢一些。本版沿用第三版素材，只调整播放时间，等待用户审核；尚未正式接入游戏。

视觉播放窗口由 **0.50秒延长到0.75秒**。最初0.0625秒保持原速，后续0.4375秒的素材用0.6875秒播放，使剑身收窄、余光停留和裂光合拢更缓。人物的0.45秒蓄势、挥剑和收势速度保持原样，实际仍只命中一次。

## 预览

- [延长消散的慢放审核片](tiandi-long-tail-preview.mp4)：2秒、24fps，沿用既有2.5倍慢放审核比例。
- [原速前后对比](tiandi-tail-comparison.mp4)：上方原版0.50秒，下方调整后0.75秒；同一图集、同一出手时间，青石背景合成示意，非游戏录像。
- [两阶游戏原速预演](rehearsal/attempt-02/tiandi-tail-ranks-realtime-review.mp4)：浏览器会话临时加载候选时间表，人物和战斗使用真实游戏更新；并未改动正式游戏资源。
- [逐帧检查](retiming-check.json)、[独立复核](independent-review.json)、[Cocos检查](rehearsal/attempt-02/browser.json)。

## 复用与接入契约

继续使用 [第三版透明图集](../attempt-03/tiandi-candidate-atlas.png)，没有复制或重新生成图集。其SHA-256保持为：

`f5744f08482319e788e7b262d6614284528cc41176cb3ecf22c8d066ae3232e2`

资源尺寸、锚点、长度和宽度映射均与第三版一致。新的时间映射和16格起始时间记录在 [runtime-contract.json](runtime-contract.json) 与 [candidate-config.json](candidate-config.json)：

```text
sourceAge = age <= 0.0625
  ? age
  : 0.0625 + (age - 0.0625) * (0.4375 / 0.6875)
frame = min(15, floor(sourceAge / 0.5 * 16))
visual lifetime = 0.75 seconds
```

战斗效果记录仍按原有0.25秒寿命结束，独立视觉尾光不改变伤害或次数。48张新RGBA审核帧采用预乘颜色插值后转回非预乘alpha，避免透明边缘出现黑边；前4张审核帧与旧版逐像素一致，范围没有扩张，亮度总量单向下降，末尾透明。

本轮模型调用0次，新增生成费用0，云端上传0次。原片、第三版图集、旧审核视频、既有归档索引及本轮中间输出全部保留。本目录使用新的独立包索引，不改写旧证据。

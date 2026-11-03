# 新增动作参考矢量稿

2026-09-24。用户提供腾空.png、起跳.png、攀爬.png，分别作为跳跃腾空、起跳/落地屈膝、攀爬的参考。原图保存在references/，本轮未改原图或运行资产。

## 文件

- `svg/airborne-spread.svg`：张开双臂、双腿后收的腾空姿势。
- `svg/jump-compress.svg`：侧身屈膝姿势，作为起跳蓄力/落地缓冲共用的造型参考；是一张姿势，不代表已制作两段动画。
- `svg/climb.svg`：分离绳索后的攀爬人物。
- `svg/climb-rope.svg`：参考中可见的绳索片段；人物遮挡处没有补画整条绳。
- `svg/climb-with-rope.svg`：两个独立分组组成的完整参考姿势；组ID为climb-rope和climb，可分别编辑/隐藏。
- 同名透明PNG位于preview/；三张并排对照为preview/additional-actions.png。
- `additional-actions-manifest.json`记录源图SHA256、裁切坐标、尺寸、缩放和路径数。

## 制作与验证

沿用上一轮OpenCV分离纸底、VTracer色块/轮廓样条描摹；细节参数与上一版一致。新增脚本`build_additional_actions.py`，渲染脚本`render_additional.mjs`。`build_vectors.py`增加main入口保护以复用分割函数，不重复导出旧八张资产。

攀爬绳索按可见轮廓分离，再清理离散绳屑。握绳下手的手腕原本被绳子遮挡，人物层中用一块独立路径延续手腕，放在衣服和手掌后面，避免去绳后手掌悬空；该补绘路径名为climb-reconstructed-hidden-wrist，可以单独调整。攀爬人物、绳索与组合稿共享443×1024画布，组合不需重新定位。

五个SVG都是纯路径，没有嵌入位图、脚本或外链。保持透明边界，检查三张并排图及森林底色上的人物。尚未拆分全身骨骼、没有做连续攀爬/跳跃动画，也没有替换游戏运行图集。后续可用这三张姿势确定动作方向，再补中间帧、手脚锚点与真实位移测试。

复现（依赖沿用requirements.txt）：

```sh
python build_additional_actions.py
node render_additional.mjs
```

旧`airborne.svg`/`takeoff.svg`/`landing.svg`保留原先参考稿版本。本轮新文件采用明确名称，不覆盖它们。

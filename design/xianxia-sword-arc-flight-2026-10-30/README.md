# 剑气斩 · 飞行月牙形态审核

2026-10-30。按用户提出的1／4／7级变化制作：近身月牙、单发飞射、连续多发。七级暂以三发预演，属于建议数量。

本轮为旧素材复用与合成形态审核，未接入游戏；无模型生成、无云端上传，新增生成费用0 CU。完整中英文制作规格见 [NEXT_VFX_PROMPT_JIANQIZHAN_FLIGHT.md](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-skill-review-2026-10-30/NEXT_VFX_PROMPT_JIANQIZHAN_FLIGHT.md)。

- [三阶段原速合成预演](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-sword-arc-flight-2026-10-30/attempt-01/sword-arc-flight-form-preview.mp4)：1440×810、60fps、6.4秒，两轮。
- [三行关键姿态图](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-sword-arc-flight-2026-10-30/attempt-01/contact/preview.png)：各行取不同时间，便于同时比较轮廓。
- [技能说明同步稿](/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-sword-arc-flight-2026-10-30/SKILL_COPY.md)：当前等级描述、升级预览与正式接入时需同步的代码位置。

## 形态

| 等级 | 本轮审核内容 |
|---|---|
| 1–3级 | 一次近身开口月牙，复用已批准动画 |
| 4–6级 | 一枚月牙保持形状向前飞行，穿过沿途示意假人 |
| 7–10级 | 三枚同形月牙依次飞行，暂拟间隔0.16秒 |

飞行体按同一方向发出，离手后独立移动；在示意战场边界结束，留下约0.36秒尾光。预演距离、速度与假人位置服务于展示，没有确定正式战斗数值或取消现行目标上限。

大型十字另作独立技能候选，本轮不制作，也不将其安排为剑气斩进化。

## 审核边界

合成片用占位点表示人物，不能用于判断人物出手、受击反馈、真实碰撞或运行性能。后续正式接入应只对剑气斩引入4／7级阈值，并同步调整其飞行判定、逐发去重、旧伤害分摊逻辑和升级文案。其他技能仍保留各自现有阶段。

真实动作预演时，三发只启动一次完整身体动作，不能重现后续剑气让人物动作反复重启的问题。

## 来源与保留

- 来源为 `design/xianxia-sword-arc-v2-2026-10-30/review/usable-blade-frame.png` 与已批准的 `review/frames/*.png`。
- `attempt-01/` 单独保留本地制作脚本、派生主体、预演与测量记录。
- `preservation-before.json` 记录制作前已验证的1456个媒体文件、84份其他文件和6份索引的原路径、字节数与哈希。
- 本轮最终索引与保留复核另存于本目录。此前未满意版本和原片不删除、不移动、不覆盖。

# 已认可剑气斩：生产接入只读核验

2026-10-30，用户认可胸口对齐的飞行剑气斩并允许接入。核验确认：**当前生产代码已经使用这一版本，无需重新生成或再次替换月牙素材。**

- `SwordQiArt` 引用 `sword-qi-crescent-v1.png`；其 SHA-256 仍为 `48deef02cb8e6f9a6c0bde45561615990becd00fdba335970bc3087e33af7b89`，与已认可素材一致。
- 精灵与资源失败后备均沿画面竖直方向加 64 个设计单位。御剑悬浮时另加 `18 + 2*sin(startedAt*3)`；每发使用施法快照和释放时间，飞出后不随人物摆动。
- 1–3 级一次近身月牙；4–6 级一道飞行月牙；7–10 级连续三道，间隔 0.16 秒。`TowerView` 已将实时飞行体交给该渲染器，近身效果保留原 `SwordArcArt`。
- `TowerSwordQi`、`TowerRun`、`TowerSkillForms` 三份 Cocos shared 模块与当前 JS 源码完全同步。

一次定向测试运行 **34/34 通过**：

```sh
node --test tests/sword-qi-art.test.mjs tests/tower-skill-effects.test.mjs tests/xianxia-sword-qi-flight.test.mjs
```

此项核验没有重新跑工作区全量测试，也没有改动业务源码、运行时图像、旧封包或主素材库。核验前后 11 个生产文件哈希一致。详见 `receipt.json` 与 `focused-tests.log`。

旧素材库已逐文件核对：**1856 个媒体、423 份其他文件，共 2279 个唯一文件，另有 9 份旧目录索引**；原路径、SHA-256 与字节数均匹配，总文件字节数为 774,939,420。制作前主 manifest、README 及 9 份索引副本保存在 `library-before/`；`verification.json` 保存全部核验记录，方便最终追加新预演包时再次比较。

用户尚未认可纵横剑气的交叉角度。本轮新的同向月牙候选应作为审核预演保留，不能把这份剑气斩批准记录当作新纵横剑气的批准。当前运行时 cross-v2 在本核验中未被覆盖。

新增模型调用 0，新增生成费用 0 CU，云端上传 0。

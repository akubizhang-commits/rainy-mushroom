# 妖蛇咬击、熊妖拍地已接入（2026-11-07，Scenario 20 CU）

两条提交时直接用了昨晚备好的请求（`../xianxia-snake-bite-scenario/request.json`、`../xianxia-bear-humanoid-slam-scenario/request.json`），没有改参数。
- 妖蛇：job_p31daUkjvVRwjCChQdokm2my，视频 asset_LZyap3Yxf8ySXfudMs7rtzEs。
- 熊妖：job_N9mg2MqEqFzygGLx4uqB4Jaj，视频 asset_3kSXJa3Y6pJbWLBnrnZPrq7M。
- 每条 10 CU。原片和逐帧都在各自的请求目录里。

导出脚本 `export.py`：
- 两族都切成 20 帧，前摇 9、生效 3、收招 8。原有的行走帧逐字节保留，图集 2880²。
- 妖蛇用 480 原生格子，再用 displayScale 1.6335 / anchor [.5458,.8729] 换算到和行走一样的盘身大小和接地点。
- 熊妖脚底贴在 y=432，不缩放。

接入（`TowerMonsterArt.ts`，改前副本 `TowerMonsterArt.before.ts`）：
- 妖蛇只在 bite 时播放；吐毒（shot）仍保持立绘，发射点不变。
- 熊妖的 bite 和 slam 都用 slam 片段；M02/M04/M07/M09 技能仍保持原表现。

验证：
- 测试更新后，定向测试 97/97 通过。
- 构建成功。
- `verify.cjs` 按真实攻击计时实测，共 24 组通过：snake_normal_r2/r3 的 bite，bear_normal_r4 的 bite 和 slam，第 6 层精英和熊王的 slam，每项 × 左右 × 双横屏。每段都播满 20 帧，暂停、击杀清理和存档也都正常。

已知问题（先接入，以后优化）：
- 熊妖举拳到最高点的那几帧（源帧 37–45）拳头碰到源片上边缘，裁掉约 1px。
- 844 宽屏幕上熊王举拳时会压到顶部的 Boss 血条。
- 熊妖下砸之后蹲伏的那几帧，脸转成了接近正面。
- 真机没有验证。

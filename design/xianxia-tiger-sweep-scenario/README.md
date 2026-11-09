# 低阶斑纹妖虎普通挥爪 · 2026-11-05

已接入第7层实际出场的 tiger_normal_r3。复用此前已验收母图和本地透明参考，每侧加64px留白；Meowa余额0后按用户授权切换Scenario，一次生成耗10 CU，无重试生成、无后台任务。

## 素材与动作

- 原片 `original-v1.mp4`：480×480、24fps、124帧，完整保留；全部原帧 `raw-v1/` 与本地去绿帧 `keyed-v1/` 保留。所有帧不透明边缘像素检查为0，已检查伸爪极限帧的完整爪部与尾尖。
- 21攻击帧：10帧前摇、3帧命中、8帧收招，匹配原有1秒/0.18秒/0.9秒。原片较慢的动作和停顿按阶段采样，未改伤害与判定。选帧索引见 `final/final_outputs.json`。
- 旧15帧行走逐像素保留，与21帧攻击合并为2880×2880 RGBA图集；每帧原生480，未先缩小再放大。单份未压缩31.64 MiB，未验证手机显存。
- 新攻击图较多留白使主体较小，使用固定displayScale约1.226与固定脚底anchor校准，避免动作切换体型缩水；未逐帧缩放或拉伸。渲染器增加可选帧布局元数据，验证有限倍率与锚点范围，销毁时清理缓存。默认帧行为保持。
- 仅低阶tiger的普通sweep启用；已有爪痕仍使用原时序。机制阶段、未交付的攻击类型仍回退，高阶tiger-humanoid/white-tiger不套用。静止/暂停/死亡逻辑保持。

## 验证

- 39项动画/正式Boss/投放专项通过；独立代码审查无重要问题，运行图和final哈希一致，旧行走RGBA像素一致。
- Cocos构建通过；独立副本与3份生产文件验收前后哈希一致，见 `build-snapshot.json`。
- 实际Cocos引擎中，正式投放的tiger_normal_r3、tiger_normal_r4、tiger_boss_zhenyan × 双向 × 1280×720/844×390，共12组通过。真实AI触发攻击，检查三个阶段、暂停、21帧遍历、15帧行走、机制回退、真实击杀单次账本和localStorage不变。
- 近身首轮截图有玩家遮挡，补拍了玩家分离的三个阶段；确认方向、脚爪、尾尖和现有爪痕。额外视图只用于展示，不声称该站位重新触发攻击。过程中高阶静态图被Cocos动态合图，使GPU纹理尺寸发生变化；已保留误判报告 `dynamic-atlas-check-failure.json`，暂停断言改为核对模拟状态和实际姿态，保留低阶动画纹理的尺寸验证。最终重跑通过。
- 全仓 `node --test tests/*.test.mjs`：2268项，1924通过/344失败；相对上轮牛魔王失败名无新增。共享工作区其他变化造成的减少不归因本轮。未宣称全仓通过，见 `tests-full.tap`、`full-test-comparison.json`。
- 尚未微信真机验收或发布，未Git提交。

## 归档

Scenario集合 `col_t39KqgA8v2hbHC4TUJJHwXSz`：参考图asset_GpEVweKHfq9qzyeaihrmPzs9、视频asset_XMxrtdgfbBoFwq9CzyCqwMTF、最终图集asset_DThDvPHM4GQYb2K6yhJCF5Gp。原始参数见 `request.json`，哈希和任务记录见 `production.json`。原母图、原行走包及所有付费源片均保留。

后续只按正式投放怪物的真实动作缺口排期。妖猿/蝎/蜈蚣目前未投放，不作为下一项；蟒王仍等左右关键帧，M08回旋继续暂缓。DEBUG_HANDOFF未改：本轮没有新游戏缺陷；测试夹具修正已在本报告记载。

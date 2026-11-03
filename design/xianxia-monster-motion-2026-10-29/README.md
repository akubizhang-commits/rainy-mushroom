# 妖化野猪动作样片 — 2026-10-29

**已生成并验收；蓄势、拱击、收势已接入游戏。步行循环未通过，继续保留静态移动外观。**

打开 [review.html](review.html) 可播放原视频、切换透明审阅帧、查看固定110px画布效果与接触表。

- Job：`job_k3nbPaTgmeGqDu1VM9vGGHvu`，服务端状态 `success`。
- 输出 asset：`asset_Jk6jAHSPBz7KGuUdkdgtNsrh`。
- 已批准原画：`asset_XrHbEDvQ4E4tdToscywYDvzv`；本地输入来自原1024px野猪图，仅去浅底和固定缩放留边，未用变换伪造动作。上传绿底输入：`asset_Z6pDa8pEvDzDkqFd4pYZM2BM`。
- 模型：`model_pruna-p-video-2-pro`，cost，480p，5秒请求；dry-run报价10 CU，成功job实际10 CU。任务上限15 CU，未追加生成，未改账单。
- 当前周期消费接口前后为35→45 CU；它是消费量，不是团队余额。成员／项目没有单独消费上限。
- 原视频实际：480×480，24fps，124视频帧，5.1667秒，有音轨。审阅副本按12fps提取62帧，不重定位身体；本地色键PNG不是原生透明输出。

## 观察与剩余工作

画面出现交替四肢屈伸、低头压身、抬头獠牙拱击及恢复，是真实生成的局部动作，主要妖化野猪特征保持。起手比请求晚，粗略为0–2.5秒步行、2.5–3.75秒蓄势、3.75–4.25秒拱击、4.25–5.17秒恢复。此粗标不能直接作为伤害触发时点。

仍需挑选完整步行循环并验证首尾、标定蓄势／接触／恢复关键帧、细查蹄部接地和局部形变、精修抠图、制作最终图集及锚点，再另行授权接入状态机。透明审阅副本有色键阈值误差；未宣称无缝循环、最终透明验收或打击同步完成。页面中整片循环播放仅方便查看。

本任务没有修改任何运行时代码、数值、战斗逻辑或正式游戏资源。全部输出位于本目录，准备脚本为 `scripts/prepare-monster-motion.py`。

## 重现本地审阅

```sh
/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 scripts/prepare-monster-motion.py --video design/xianxia-monster-motion-2026-10-29/boar-walk-gore-source.mp4
```

脚本不调用生成API，不花额度，不重发job。原始请求见request.json，固定输入来源见input-provenance.json，视频实测见video-probe.json，逐帧清单见frames.json。

## 审阅页验证

`review.html` 已验证本地文件链接、逐帧前进、拖动定位及末帧回绕；浏览器无脚本错误。1280×900 与 390×844 页面截图已保存为 `review-page-desktop.png`、`review-page-mobile.png`，窄屏无横向溢出。本次收尾没有追加生成。

## 本轮接入结果

已将审阅帧31–46、47–52、53–62分别映射至现有预警、攻击、恢复状态，仅单次播放；不改变伤害、冲刺距离或冷却。移动循环仍未通过，不使用倒放伪造步态。其余新怪物任务按用户要求暂停。

资源为 `cocos-pilot/assets/resources/tower-monsters-motion/boar.{png,json}`，视图由 `TowerMonsterArt.ts` 和 `TowerView.ts` 接入。浏览器已验证实际攻击状态中的帧推进及暂停冻结；原始图集交付说明保留作历史验收记录。

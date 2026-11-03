# 两仪剑阵正式接入 QA

最终结论：PASS。验收与最终录像均来自 `attempt-03`，冻结构建为 `/private/tmp/xianxia-liangyi-integrated-6voickd4`。

- `liangyi-integrated-realtime.mp4`：12.6 秒，1280×812，30 fps，378 帧。包含 1 级、10 级、10 级五敌三段完整原速实录；720px 游戏画面完整保留，底部另加 92px 字幕。
- `liangyi-integrated-contact-sheet.png`、`liangyi-integrated-timeline.png`、`liangyi-integrated-five-targets.png`：原生视频抽帧。
- `verification-final.json`：必要原生检查汇总及逐项证据位置。
- `attempt-03/browser.json`、`supplement.json`、`fallback.json`：原始验收记录；`media-manifest.json`：视频及抽帧哈希。

QA 未替换范围、伤害、索敌、计时、资源或渲染器。观察器只在原生绘制完成后读取 zone/effect、正伤害 hit effect 和敌人 HP 差，所有核心 run 方法引用保持不变。三张运行时 PNG 均按生产 UUID 请求并核对实际响应哈希，内容与批准 v3 原图相同。

1/10 级半径分别为 132/192，保持 6/7 次真实脉冲；新增覆盖带与新边界相交的原生敌人正常受击，新边界外完整碰撞圆始终无伤。每个边界夹具仅 4 名敌人，避免 8 目标上限干扰；另验证上限、离阵停伤。暂停场景重建保持像素和时间不变，同一帧额外绘制 20 次未增加纹理上传，池内纹理身份稳定。真实换波分支、死亡、退出和销毁均清理对应旧特效；真实资源 404 时使用原几何剑阵，范围和命中次数仍正确。

最终运行前后源码、冻结构建、批准 v3 包哈希不变，游戏存档写入为 0。启动时引擎的 Storage 功能探针单独记载。换波检查仅在私有内存会话执行一次真实非训练换波分支，并在任何 host 绘制或持久化之前恢复训练标记。

全部尝试保留：`attempt-01` 在浏览器启动前因白剑素材复用导致哈希非唯一而失败，已改为 UUID 加哈希定位；`attempt-02` 原生检查通过，但期间生产代码加入换波修复，原始总体 FAIL 收据不改写；`attempt-03` 对修复后的新构建完整通过，正式影片全部重新录制。未产生新的生成调用、生成费用或外部上传。

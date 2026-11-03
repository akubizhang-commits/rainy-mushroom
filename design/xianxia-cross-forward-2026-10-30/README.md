# 纵横剑气：双月牙同向修订

2026-10-30。用户已认可剑气斩的胸口对齐效果；纵横剑气要求两道月牙的正面共同朝向飞行前方。

剑气斩当前生产版本已经采用已批准的月牙素材和胸口锚点，无需再次替换资源。1–3级近身月牙，4–6级单发飞射，7–10级三发连射。生产接线、素材哈希和34项专项测试已核验，详见 [接入确认](approved-crescent/README.md) 与 [核验收据](approved-crescent/receipt.json)。

纵横剑气本轮选用 **C版** 进行外观审核：两片月牙共同朝前，四端向后收，交叉角约52.6度。复用原有月牙作局部仿射变换；透明组件、A/B/C候选、参数和来源哈希全部保留在 [art](art/README.md)。这次没有新增模型生成、付费调用或云端上传。

本轮纵横剑气是**待用户审核的候选**。生产资源仍保留cross-v2；新的轮廓、锚点与碰撞同步接入应在用户认可候选之后完成。实景外观预演使用独立冻结构建和临时图片响应替换，不代表新轮廓的命中判定已完成验收。

查看 [实景预演视频](rehearsal/attempt-01/overview/forward-cross-appearance-preview.mp4) 或 [四种场景对照](rehearsal/attempt-01/overview/contact-sheet.png)：依次为1级近身、4级飞行、7级大型飞行和4级向左飞行。视频约9秒，保留实际游戏速度与人物动作。临时图片向左平移74.695像素，以保持原先胸前交点；边缘完整，没有裁掉月牙。最终接入需同步采用新的美术与几何合同，不能只替换生产图片。

四种实景检查均通过，浏览器错误为0；生产文件、冻结构建和旧归档的前后哈希相同，预演没有存档写入。详见 [预演记录](rehearsal/attempt-01/browser.json)、[锚点调整](rehearsal/attempt-01/visual-alignment.json) 和 [视频记录](rehearsal/attempt-01/overview/manifest.json)。

旧素材、原片、预演和索引均保留。旧库核验记录位于 [保全证据](approved-crescent/library-before/verification.json)；本轮文件另外建立索引，不覆盖旧版。

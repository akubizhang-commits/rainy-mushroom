# 缺失技能图标制作 · 2026-10-31

当前状态：已完成核对和提示词准备，Scenario 额度耗尽，尚未生成新图。

## 核对结果

当前18个技能，15个存在PNG，3个缺失且被 TowerSkillIcons.ts 显式排除：

- `sj_cross` 纵横剑气：交叉月牙剑气。
- `sj_spirit` 凝神诀：灵眼、莲瓣与感知波纹。
- `sj_flight` 御剑飞行：人物踏剑、短云尾。

旧 `magnet.png` 不再对应当前技能，保留原文件。完整核对见 audit.json。

## 制作规格

沿用既有宣纸玉青风格：暖象牙纸色底、工笔轮廓、玉青与淡金，主体居中，适合圆形裁切。计划1024×1024原图，256×256 PNG导出，并检查88px圆形预览。技能图不适用物品图标98%主体规则。提示词和模型参数见 planned-requests.json；这些是待执行参数，不是成功生成记录。

## Scenario记录

用户已确认使用 Akubizhang’s Organization / Default Project。已查询推荐模型并检查 FLUX.2 Klein 9b 输入schema。单张dry-run为1 CU，三张同规格预估3 CU。首张纵横剑气提交返回429 PlanLimitReachedError：团队免费额度50/50。未获得job ID或asset ID，无新图片，本次费用0 CU。错误追踪和完整状态见 generation-status.json。

停止生成，不重试、不切换模型绕过额度。额度恢复或用户升级后继续。现有图标、运行时、源图与历史素材均未修改。新图完成后仍需视觉检查和原图归档；目前不能声称图标已补齐或接入。

## 更新：用户提供图片后已接入

先前Scenario额度阻塞记录保留。用户随后提供三张图片，验收与接入已完成，详见 [integration/README.md](integration/README.md)。

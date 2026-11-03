# 玩家HUD修为条与剑修标识 · 2026-10-31

用户要求优化经验条和剑修标识，采用game-ui-design与scenario-game-assets流程。

Scenario团队 team_Ur9UBLcjfvXmu2iaNKV7cFVh / 项目 proj_k6xCHLGuh1JrUQ7Vzo8vsZYV 已由用户明确确认。推荐模型 model_openai-gpt-image-2-5-sunburst，512×640/high/alpha/1张，dry run报价11CU。实际请求被429 PlanLimitReachedError拒绝（free custom-generation 50/50），没有返回asset或job；未重试或换模型绕过限制。已向用户说明。

最终标识复用项目内 `tower-library-items/eq_sword_suwen.png`，源文件副本保留在source/suwen-approved.png。prepare.py旋转、调整墨绿配色并加淡青剑气弧；合成原图sword-cultivator-composite.png保留，运行时128×144透明PNG输出到player-hud/sword-cultivator.png。此为职业标识，非背包物品，不套用物品98%填充规则。未覆盖原装备图标。

UI保持原头像/气血/境界位置。职业标识32×36，加载失败显示“剑”字，加载回调与资源销毁有测试覆盖。修为条与气血条左侧对齐，200×8，旧金进度、灰绿轨道、细边和弱高光；标签从12px“经验”改为16px“修为”。经验数据公式、成长规则、战斗底部经验条位置保持原逻辑。

用户后续确认：移除HUD进度条旁的“修为”二字；保留进度条的外观、位置与数值逻辑。已移除标签节点及战斗侧过期隐藏逻辑。

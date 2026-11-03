# 现行技能机制实施计划

范围：`TowerRun.js`、新的 `TowerSkillForms.js`、真实战斗回归测试。伤害表、独立冷却、养成成本不变，所有新段数均分原整招伤害预算。旧五级模式保留原行为。

1. 先以真实 `TowerRun` 场景写失败测试：连段数、同线锁向、固定剑影落点、圆环近身空隙与扫碰、双圈共享间隔、菱形边界、归宗暂停普通御剑与预算。
2. 建立纯共享接口 `skillForm(id, level = 1, parentLevel = 1)`。返回 `id/shape/hits/swords/eyes/radius/reach/width/angle/interval/initialDelay/duration/targetCap`；环剑补充 `innerRadius/bladeLength/bladeWidth/angularSpeed`。被动无攻击。`orbitSwordPose(form,time,index)` 返回相对玩家原点的剑柄、剑尖及朝向，战斗和渲染同用。
3. 新多段使用现有可序列化 casts/zones 调度。每个完整施法保存形态与养成快照，段内不重新读取升级后的等级；环剑每固定步用前后剑姿扫碰，同敌共用现有间隔账本。
4. 所有新区域/效果标出真实几何、`startedAt`、`pulseIndex/pulseCount`、`targetCap`。剑气每一挥取角色当时位置；一线天首发冻结射线；剑影/阵法/归宗冻结落点。
5. 延迟效果、武器有效施法账本和快照校验一起更新。归宗启动时不叠普通御剑；特技结束后普通御剑从新冷却开始，不补积压。
6. 运行新增测试及已有技能/武器/快照战斗测试；调整只因已批准行为变动而过时的断言。最后全量测试与基线比对，报告新增失败而不改无关失败。

## 实施与验证记录

- 已实现共享形态、连斩/贯穿/定点影斩、真实环剑扫碰、无我内圈、两仪/四象共享脉冲、归宗特殊施法互斥。
- 新测试按失败后实现推进：首轮16个缺失机制失败；随后分别验证快照篡改、实际暴击提示、归宗等待旧飞剑、延迟首击通知后修复。独立复核另补成长形态字段剥离拒绝、天地定式后固定起点及方向、角色朝向通知更新。最终新增41项技能战斗测试通过。
- 旧战斗/武器/敌方攻击/恢复测试及新增技能测试在最终全量中均通过。只更新因已批准连段时长、归宗互斥及新范围变化而失效的旧断言和单次施法测试准备流程。
- 最终全量 `npm test`：1808项，1760通过，48失败。基线为1757项、1710通过、47失败；唯一新增失败是最终修改后待共享同步的SYNC-02哈希/副本检查，已交渲染负责人重新同步。没有新增战斗失败。
- 全量日志：`/tmp/xianxia-skill-combat-full-final.log`；按失败名称的差异：`/tmp/xianxia-skill-combat-failure-delta-final.json`。原生产文件备份位于 `/tmp/xianxia-skill-dev-baseline/js/xianxia/TowerRun.js`。

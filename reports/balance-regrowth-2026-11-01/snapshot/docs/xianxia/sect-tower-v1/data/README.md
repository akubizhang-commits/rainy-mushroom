# 当前设计数据 v4 / 经济 v2

仓库根依次运行：

```sh
python3 docs/xianxia/sect-tower-v1/data/build-design.py
python3 docs/xianxia/sect-tower-v1/data/build-economy-v2.py
```

- beast-catalog.json：12族、38具名原型；虎3/4/6、鳄2/3/4、镇魇白虎7。
- tower-design.json / waves.csv：九层180波；第四层鳄王、第七层虎王；实际生成组含品阶。旧楼层/分钟/普通波属性倍率及旧奖励已移除。
- economy-v2.json：三类资源、商店价格、双池、修为门槛和收益规则。`tower_cultivation_boundary`记录用户确认的塔内最高金丹；`cultivation_cap_proposal`区分仍为建议的Lv27/10920修为、溢出不储存等细节。等级表含炼气/筑基/金丹及各段内部序号，不含元婴。
- income-v2.csv / wave-rewards-v2.csv：九层、180波的修为/妖丹/贡献；按首次1→9顺序及保底余数计算，首通加奖单列。
- skill-books-v2.json / skill-levels-v2.csv：12技能×5级，4进化；永久学习、升级。
- rank-attributes.json：7阶基础属性、38原型固定属性，不另乘楼层。
- rank-calibration.csv：三档角色的9层静态Boss估计与覆盖率敏感性，不是实测。
- economy-v2-report.json：示例购买流水、非负余额与无装备逐层Boss估计。
- economy-summary.json：已替换旧五币演算，当前为经济v2摘要。
- floor01-encounters.json / floor01-batches.csv：首层20波的82个出生批次，378个必杀ID、8区安全候选及固定收益预算。运行`python3 docs/xianxia/sect-tower-v1/data/build-floor01.py`生成；不修改原九层数量/经济。
- floor01-boss.json：獠王两种基础攻击、半血双冲、危险并发、可见条件、有限支援与取消规则；手工设计源，未被游戏读取。验证入口`node design/tower-floor01-2026-10-27/verify.mjs`。

所有文件是设计产物，不被当前游戏运行时读取。通过脚本只能证明表结构、数值公式和预算约束；不能宣称九层实战、存档迁移或角色素材已交付。

产出CSV的`cultivation`是封顶前预算，不是对任意存档的入账保证。实际结算建议截到塔内上限；原有高境界角色返场不得降级。具体验收场景见11号稿第7节，当前边界断言只是设计等级查表检查，不是运行时封顶/存档测试。

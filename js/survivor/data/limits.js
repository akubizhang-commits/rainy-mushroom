// Entity caps (01-gdd §10 global hard caps; 03 §7.3 pool capacities & render budget).
// Only a frozen JSON literal: no functions, no imports.
//
// hardCaps = 01 §10 全局实体上限（逻辑/规则上限，validate 用它校验波次同屏上限）。
// pools    = 03 §7.3 逻辑实体池容量（预留事件/召唤余量，敌人 202 > 硬上限 200）。
// nodes    = 03 §7.3 战斗层各层渲染节点池上限（表现层剔除后 ≤ 逻辑池）。
// spawnMarginU = 03 §1-2 刷怪半径余量（视口半对角线 + 60）。
export const LIMITS = Object.freeze({
  hardCaps: Object.freeze({
    enemies: 200,       // 01 §10 敌人硬上限
    playerProjectiles: 150,
    enemyProjectiles: 40, // 浊雾泡
    spores: 250,
    pickups: 5,         // 露珠/林风等
  }),
  pools: Object.freeze({
    enemies: 202,       // 03 §7.3 逻辑池容量（含事件/召唤余量）
    playerProjectiles: 150,
    mistBubbles: 40,
    raindropZones: 16,
    spores: 250,
    pickups: 5,
  }),
  nodes: Object.freeze({
    enemies: 160,       // 03 §6.2 渲染节点池（视口剔除后）
    playerProjectiles: 120,
    mistBubbles: 40,
    spores: 150,
    pickups: 6,
    fx: 80,
  }),
  spawnMarginU: 60,     // 03 §1-2 刷怪半径余量
})

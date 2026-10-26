// Pickup data (01-gdd §11, S3 B3). Only a frozen JSON literal: no functions, no imports.
// 孢子（经验）规则在 Pickups.js / limits.js；本表只放露珠、大露珠、一阵林风。
//
//   heal     — 拾取时回复的生命（不超过最大生命）
//   chance   — 普通敌人被净化时的掉落概率（同一次掷骰：[0, dew) 露珠，[dew, dew + wind) 林风）
//   cap      — 场上同类上限（null = 不计上限）；全部拾取物共用 limits.pools.pickups（5）个槽
//   lifeSec  — 存在秒数，到时淡出消失（孢子不消失）
//   radius   — 拾取物碰撞半径（u），渲染按它缩放
// 精英被净化时必掉 1 个大露珠 + 1 个林风（eliteDrops），不受 cap 限制，只受池容量约束。
// wind.attractSpeed：林风拾取后，场上全部孢子不论距离都以该速度飞向角色（01 §11 “全场孢子
// 立即飞向角色”；01 未给速度，开发取 1200/秒，是吸附速度 600 的 2 倍，保证数秒内入账）。
export const PICKUPS = Object.freeze({
  dew: Object.freeze({ heal: 20, chance: 0.008, cap: 3, lifeSec: 30, radius: 10 }),
  bigDew: Object.freeze({ heal: 50, chance: 0, cap: null, lifeSec: 30, radius: 14 }),
  wind: Object.freeze({ heal: 0, chance: 0.0015, cap: 1, lifeSec: 30, radius: 12, attractSpeed: 1200 }),
  eliteDrops: Object.freeze(['bigDew', 'wind']),
})

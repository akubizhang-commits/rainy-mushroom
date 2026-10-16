// Permanent upgrades (森林营地, 01-gdd §13.2). Only a frozen JSON literal: no functions,
// no imports. Meta.js reads prices/effects; SurvivorSave clamps levels to prices.length.
//
// effect = 每级加成，字段名与 Stats.readBonuses 一致：
//   maxHp（绝对生命）、might / moveSpeed / pickup（加算比例）、regen（每秒绝对值）。
export const PERMANENT = Object.freeze([
  Object.freeze({ id: 'perm_hp', bonus: 'maxHp', perLevel: 10, prices: Object.freeze([20, 40, 70, 110, 160]) }),
  Object.freeze({ id: 'perm_might', bonus: 'might', perLevel: 0.05, prices: Object.freeze([30, 60, 100, 150, 210]) }),
  Object.freeze({ id: 'perm_speed', bonus: 'moveSpeed', perLevel: 0.05, prices: Object.freeze([25, 60, 110]) }),
  Object.freeze({ id: 'perm_magnet', bonus: 'pickup', perLevel: 0.15, prices: Object.freeze([20, 45, 80]) }),
  Object.freeze({ id: 'perm_regen', bonus: 'regen', perLevel: 0.2, prices: Object.freeze([40, 90, 150]) }),
])
// 03 §5.3 sanitize：露晶余额夹到 [0, 10 000 000]。
export const CRYSTAL_CAP = 10000000

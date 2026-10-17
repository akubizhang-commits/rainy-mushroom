// Passive data (01-gdd §7). Only a frozen JSON literal: no functions, no imports.
// S2 ships might / cooldown / area / speed (08 §1 K3); regen 与 magnet 不在本表，
// 抽卡池因此自然排除它们（08 §2）。
//
// 每级效果相同、线性叠加：levels[i] = Lv(i+1) 的累计加成（写成字面量，避免浮点累加误差），
// 等于 perLevel × (i+1)，Lv5 合计见 01 §7。`stat` 指向 Stats.computeStats 合成的项：
//   might     → 伤害倍率加算（晨光菌丝）
//   cooldown  → 冷却缩减比例（湿润苔衣，合成时下限 0.5）
//   area      → 范围倍率加算（宽檐菌帽）
//   moveSpeed → 移速倍率加算（蕨叶轻靴）
export const PASSIVES = Object.freeze({
  might: Object.freeze({
    name: '晨光菌丝',
    stat: 'might',
    perLevel: 0.1,
    levels: Object.freeze([0.1, 0.2, 0.3, 0.4, 0.5]),
  }),
  cooldown: Object.freeze({
    name: '湿润苔衣',
    stat: 'cooldown',
    perLevel: 0.08,
    levels: Object.freeze([0.08, 0.16, 0.24, 0.32, 0.4]),
  }),
  area: Object.freeze({
    name: '宽檐菌帽',
    stat: 'area',
    perLevel: 0.1,
    levels: Object.freeze([0.1, 0.2, 0.3, 0.4, 0.5]),
  }),
  speed: Object.freeze({
    name: '蕨叶轻靴',
    stat: 'moveSpeed',
    perLevel: 0.08,
    levels: Object.freeze([0.08, 0.16, 0.24, 0.32, 0.4]),
  }),
})

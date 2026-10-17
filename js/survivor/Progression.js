// Progression system (03 §3.4 step 11, §3.8). Pure logic only: no Math.random
// (uses SurvivorRandom sub-stream), no Date.now, no cc/wx.
//
// - xpToNext(L) = floor(5 + 6(L − 1) + 0.15(L − 1)²) (01 §15.1 / §15.2 table).
// - Banking xp can cross several level thresholds at once; each crossing enqueues one
//   pending level-up. SurvivorRun pops the queue to drive the levelup state.
// - draftOffer(state, rng) returns three cards following 01 §8.2 (S2 scope, 08 L4/K3):
//   candidate pool = upgrades of owned, non-maxed weapons/passives (weight 10) + every
//   unowned weapon while weapon slots remain (8) + every unowned passive while passive
//   slots remain (6). Only weapons with non-empty `levels` and passives present in
//   data/passives.js qualify (S2: all five weapons, 08 K8 — with 4 weapon slots each run
//   leaves one out; once 4 are owned no new-weapon card appears); no evolution cards in S2. Weighted draw without
//   replacement; short pools are padded with fallback cards (一捧露水 / 闪亮孢子, may
//   repeat). First level-up: at least one new-weapon card (首升保底). Pure, so tests
//   can enumerate it.

import { WEAPONS } from './data/weapons.js'
import { PASSIVES } from './data/passives.js'
import { PLAYER } from './data/player.js'

export function xpToNext(level) {
  const L = level
  return Math.floor(5 + 6 * (L - 1) + 0.15 * (L - 1) * (L - 1))
}

// Fallback cards always available (03 §3.8 兜底卡). ids are stable for compliance/strings.
export const CARD_HEAL = Object.freeze({ kind: 'heal', id: 'heal_dew', amount: 30 })
export const CARD_CRYSTAL = Object.freeze({ kind: 'crystal', id: 'shiny_spore', amount: 5 })

// Progression state carried on the run.
export function makeProgression() {
  return {
    level: 1,
    xp: 0,              // xp accumulated toward the next level
    needed: xpToNext(1),
    pendingLevels: 0,   // queued level-ups awaiting a card choice
    totalLevelUps: 0,   // how many level-ups have been resolved (for 首升保底)
  }
}

// Bank xp; may enqueue multiple level-ups. Returns the number of new level-ups queued.
export function addXp(prog, amount) {
  prog.xp += amount
  let gained = 0
  while (prog.xp >= prog.needed) {
    prog.xp -= prog.needed
    prog.level += 1
    prog.pendingLevels += 1
    prog.needed = xpToNext(prog.level)
    gained += 1
  }
  return gained
}

// Card weights (01 §8.2 第 3 条).
export const WEIGHT_UPGRADE = 10
export const WEIGHT_NEW_WEAPON = 8
export const WEIGHT_NEW_PASSIVE = 6

// Build the candidate list for an offer. `state` = {
//   weapons: [{id, level}] (equipped, in acquisition order),
//   passives: {id: level},
//   weaponSlots?, passiveSlots? (default data/player.js),
// }. Returns [{card, weight}] in a stable order (owned order, then data order).
export function draftCandidates(state) {
  const weapons = state.weapons || []
  const passives = state.passives || {}
  const weaponSlots = Number.isInteger(state.weaponSlots) ? state.weaponSlots : PLAYER.weaponSlots
  const passiveSlots = Number.isInteger(state.passiveSlots) ? state.passiveSlots : PLAYER.passiveSlots
  const out = []
  const owned = new Set()
  for (const w of weapons) {
    owned.add(w.id)
    const def = WEAPONS[w.id]
    if (!def || def.levels.length === 0) continue
    if (w.level < def.levels.length) {
      out.push({ card: card('weapon', w.id, w.level + 1, false), weight: WEIGHT_UPGRADE })
    }
  }
  const ownedPassives = Object.keys(passives).filter((id) => PASSIVES[id] && passives[id] >= 1)
  for (const id of ownedPassives) {
    if (passives[id] < PASSIVES[id].levels.length) {
      out.push({ card: card('passive', id, passives[id] + 1, false), weight: WEIGHT_UPGRADE })
    }
  }
  if (weapons.length < weaponSlots) {
    for (const id of Object.keys(WEAPONS)) {
      if (owned.has(id) || WEAPONS[id].levels.length === 0) continue
      out.push({ card: card('weapon', id, 1, true), weight: WEIGHT_NEW_WEAPON })
    }
  }
  if (ownedPassives.length < passiveSlots) {
    for (const id of Object.keys(PASSIVES)) {
      if (ownedPassives.includes(id)) continue
      out.push({ card: card('passive', id, 1, true), weight: WEIGHT_NEW_PASSIVE })
    }
  }
  return out
}

// Build the three-card offer for the current pending level-up (see header). `state` is
// as in draftCandidates plus `isFirstLevelUp`. Card shape:
//   {kind:'weapon'|'passive', id, level, isNew, evolution:false} or a fallback card.
// Without the first-level-up guarantee, offer[i] is the i-th weighted draw, so the
// first card's type frequency follows the weight ratio.
export function draftOffer(state, rng) {
  const pool = draftCandidates(state)
  const cards = []
  if (state.isFirstLevelUp) {
    // 首升保底：先从新武器卡中抽 1 张（权重相同 → 均匀）。
    let best = -1
    let total = 0
    for (let i = 0; i < pool.length; i += 1) if (pool[i].card.kind === 'weapon' && pool[i].card.isNew) total += pool[i].weight
    if (total > 0) {
      let roll = rng.next() * total
      for (let i = 0; i < pool.length; i += 1) {
        const c = pool[i]
        if (!(c.card.kind === 'weapon' && c.card.isNew)) continue
        best = i
        roll -= c.weight
        if (roll < 0) break
      }
      cards.push(pool[best].card)
      pool.splice(best, 1)
    }
  }
  while (cards.length < 3 && pool.length > 0) {
    let total = 0
    for (let i = 0; i < pool.length; i += 1) total += pool[i].weight
    let roll = rng.next() * total
    let pick = pool.length - 1
    for (let i = 0; i < pool.length; i += 1) {
      roll -= pool[i].weight
      if (roll < 0) {
        pick = i
        break
      }
    }
    cards.push(pool[pick].card)
    pool.splice(pick, 1)
  }
  // 兜底卡（01 §8.2 第 4 条，可重复）：先放两张不同的，仍不足再补一捧露水。
  if (cards.length < 3) {
    const fallbacks = rng.shuffle([CARD_HEAL, CARD_CRYSTAL])
    for (let i = 0; i < fallbacks.length && cards.length < 3; i += 1) cards.push(fallbacks[i])
    while (cards.length < 3) cards.push(CARD_HEAL)
  }
  return cards
}

function card(kind, id, level, isNew) {
  return Object.freeze({ kind, id, level, isNew, evolution: false })
}

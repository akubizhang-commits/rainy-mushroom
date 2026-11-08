// Presentation-only receipt accumulator. Never writes to the battle state.
const number = value => String(Number(value.toFixed(value < 10 ? 1 : 0)) || 0.1)
const text = row => [
  row.damage > 0 ? `−${number(row.damage)}` : '',
  row.absorbed > 0 ? `吸收 ${number(row.absorbed)}` : '',
  row.outcome === 'dodge' ? '闪避' : row.outcome === 'immune' ? '免疫' : '',
].filter(Boolean).join(' · ')

export class PlayerDamageFeedback {
  constructor() { this.reset() }
  reset() { this.state = null; this.time = -1; this.seen = new Map(); this.rows = [] }
  update(s, enabled = true) {
    if (this.state !== s || s.time < this.time) { this.reset(); this.state = s }
    this.time = s.time
    this.rows = this.rows.filter(r => s.time - r.at < .9)
    // Keep receipt IDs until both their effect and visible lifetime have ended.
    for (const [id, until] of this.seen) if (s.time > until) this.seen.delete(id)
    for (const e of s.effects || []) {
      if (e.kind !== 'player_hit' || !e.id || this.seen.has(e.id)) continue
      const at = e.startedAt ?? s.time
      if (!Number.isFinite(at) || at > s.time) continue
      this.seen.set(e.id, Math.max(e.expiresAt || at, at + .9))
      if (!enabled || s.time - at >= .9) continue
      const damage = Math.max(0, e.hpLoss ?? e.damage ?? 0)
      const absorbed = Math.max(0, e.absorbed || 0)
      if (!Number.isFinite(damage + absorbed)) continue
      const outcome = e.outcome
      if (!(damage > 0 || absorbed > 0 || outcome === 'dodge' || outcome === 'immune')) continue
      const heavy = damage > 0 && damage >= (e.maxHp || s.player.maxHp) * .1
      const last = this.rows.at(-1)
      // Never merge across a heavy impact, defensive state or a fixed 220ms window.
      if (!heavy && damage > 0 && !absorbed && !outcome && last?.damage > 0 &&
          !last.heavy && !last.absorbed && !last.outcome && at - last.at >= 0 && at - last.at < .22) {
        last.damage += damage; last.text = text(last)
      } else {
        const row = {id:e.id, at, damage, absorbed, outcome, heavy}
        row.text = text(row)
        this.rows.push(row)
      }
    }
    this.rows = enabled ? this.rows.slice(-3) : []
    return this.rows
  }
  heavyPulse(s) {
    let pulse = 0
    for (const e of s.effects || []) {
      const age = s.time - (e.startedAt ?? s.time)
      if (e.kind === 'player_hit' && (e.hpLoss ?? e.damage) >= (e.maxHp || s.player.maxHp) * .1 &&
          age >= 0 && age < .25) pulse = Math.max(pulse, 1 - age / .25)
    }
    return pulse
  }
}

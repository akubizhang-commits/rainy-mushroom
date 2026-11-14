import { TowerCampaignStore, TOWER_CAMPAIGN_KEY } from '/Users/zhangnu/WeChatProjects/rainy-mushroom/js/xianxia/TowerCampaign.js'
import { checksum } from '/Users/zhangnu/WeChatProjects/rainy-mushroom/js/xianxia/Checksum.js'
import { TowerRun } from '/Users/zhangnu/WeChatProjects/rainy-mushroom/js/xianxia/TowerRun.js'
import { writeFileSync } from 'fs'
const out = { key: TOWER_CAMPAIGN_KEY, saves: {} }
function fresh() { let raw = null; const d = { getItem: () => raw, setItem: (k, v) => { raw = v } }; const s = new TowerCampaignStore(d, 0); s.act({ type: 'sync' }, 0); return { d, s, get raw() { return raw } } }
{ const f = fresh(); out.saves.fresh = f.raw
  const env = JSON.parse(f.raw); env.schema = 94; out.saves.schema94 = JSON.stringify(env) }
for (const floor of [1, 3, 6]) {
  const f = fresh(); const env = JSON.parse(f.raw); const data = JSON.parse(env.data)
  Object.assign(data, { clearedFloor: floor - 1, xp: [0, 480, 930, 1650, 3338, 4514, 6075, 8707, 10732][floor - 1] })
  env.data = JSON.stringify(data); env.checksum = checksum(env.data)
  let raw = JSON.stringify(env); const d = { getItem: () => raw, setItem: (k, v) => { raw = v } }
  const s = new TowerCampaignStore(d, 0)
  const r = s.act({ type: 'startFloor', floor, seed: 123 }, 0)
  if (!r.ok) { out.saves[`run-f${floor}`] = 'start-fail:' + r.reason; continue }
  const run = TowerRun.restore(s.state.activeRun.snapshot)
  for (let i = 0; i < 60 * 25; i++) run.advance(1 / 60)
  run.pause()
  const c = s.act({ type: 'checkpoint', snapshot: run.snapshot() }, 0)
  out.saves[`run-f${floor}`] = c.ok ? raw : 'checkpoint-fail:' + c.reason
}
writeFileSync('/tmp/saves.json', JSON.stringify(out))
console.log(out.key, Object.fromEntries(Object.entries(out.saves).map(([k, v]) => [k, v.length > 40 ? v.length + ' bytes' : v])))

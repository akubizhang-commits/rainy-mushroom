// Test-bot policies only. Never changes player skills outside Campaign actions.
// Natural paired seeds did not confirm the fixed-fixture split advantage.
// Keep the candidate opt-in; do not promote it merely because a fixture won.
export const DEFAULT_GROWTH_POLICY='legacy'
const pursuitLegacy = [
  ['sj_yujian',3],['sj_arc',3],['vajra',2],['sj_shadow',3],['sj_yujian',6],
  ['sj_bone',4],['sj_mark',4],['sj_heart',4],['sj_shadow',6],['sj_cross',3],
  ['sj_yujian',10],['sj_shadow',10],['sj_cross',6],['sj_arc',10],
]
const pursuitSplit = [
  ...pursuitLegacy.slice(0,12),
  // Keep both secondary forms; stop spending on them at this tested baseline.
  // The ordinary planner can then afford evolution rank two when unlocked.
  ['sj_arc',6],
]
export function pursuitGrowthPriorities(policy=DEFAULT_GROWTH_POLICY) {
  if (!['legacy','split'].includes(policy)) throw new Error(`Unknown growth policy: ${policy}`)
  return (policy==='split'?pursuitSplit:pursuitLegacy).map(row=>[...row])
}

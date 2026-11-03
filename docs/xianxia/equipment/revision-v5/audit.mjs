import fs from 'node:fs';
import assert from 'node:assert/strict';
const data = JSON.parse(fs.readFileSync(new URL('./affixes.json', import.meta.url)));
const rows = [];
let checks = 0;
for (const tier of data.tiers) {
  assert.equal(data.weapons[tier.id].length, tier.id === 'xuan-top' ? 2 : 3);
  for (const template of data.templates[tier.quality]) {
   for (const baseType of ['percentage', 'fixedAttack']) {
    assert.equal(template.length, {low:2,mid:3,high:4,top:6}[tier.quality]);
    assert.equal(template.includes('X') || template.includes('LIFE'), tier.quality === 'top');
    assert.equal(template.includes('F'), ['high','top'].includes(tier.quality));
    const max = k => template.includes(k) ? tier[k][1] / 100 : 0;
    // S2 always targets a different family; one event can receive only one S.
    const d = max('A') + max('S') + max('F') + tier.refine / 100
      - (template.includes('LIFE') ? tier.lifeAttackReduction / 100 : 0);
    const c=max('C'), k=max('K'), x=max('X');
    const attack = max('A') - (template.includes('LIFE') ? tier.lifeAttackReduction / 100 : 0);
    const fixed = baseType === 'fixedAttack' ? Math.round(attack * 100 * data.fixedAttackScale * 10) / 1000 : 0;
    const flat = baseType === 'fixedAttack' ? d - attack : d;
    const upper = (1 + fixed) * (1 + flat + .5*c + .06*k + c*k + x) - 1;
    assert(upper <= tier.cap / 100 + 1e-10, `${tier.id} ${template} exceeds cap`);
    // Grid over native crit, sword-bone, type share, skill/flow match, proc and refinement.
    // All generated affix values are bounded by the analytical maximum above.
    let gridMax = 0;
    for (const p of [0,.02,.025,.03,.035,.04,.045,.05,.06])
    for (const bone of [0,.01,.03])
    for (const share of [0,.5,1])
    for (const skillMatch of [0,1])
    for (const flowMatch of [0,1])
    for (const z of [0,.2,1])
    for (const refineLevel of [0,1,2,3,4]) {
      const q = .5/(1+bone);
      const attack = max('A') - (template.includes('LIFE') ? tier.lifeAttackReduction/100 : 0);
      const flat = (baseType === 'percentage' ? attack*share : 0) + max('S')*skillMatch + max('F')*flowMatch
        + tier.refine/100*refineLevel/4;
      const gain = (1+fixed)*(1+flat+(p+c)*(q+k)+z*x)/(1+p*q)-1;
      assert(gain <= tier.cap/100+1e-10);
      gridMax=Math.max(gridMax,gain);
      checks++;
    }
    rows.push({tier:tier.id,baseType,template:template.join('+'),capPercent:tier.cap,
      conservativeBoundPercent:+(upper*100).toFixed(4),
      directHitGridMaxPercent:+(gridMax*100).toFixed(4)});
   }
  }
}
assert.equal(Object.values(data.weapons).flat().length, 23);
const report = {status:'pass',scope:'static-design-budget-only-not-runtime-or-playtest',
  checks,templates:rows.length,weaponIdentities:23,rows};
fs.writeFileSync(new URL('./budget-audit.json', import.meta.url), JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,checks,templates:rows.length,weaponIdentities:23}));

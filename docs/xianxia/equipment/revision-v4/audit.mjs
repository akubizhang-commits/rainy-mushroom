// Offline proposal audit. Not a combat implementation or gameplay simulation.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const config=JSON.parse(fs.readFileSync(new URL('./weapons.json',import.meta.url),'utf8'));
const checks=[];
function check(label, condition){assert.ok(condition,label);checks.push(label);}
check('13 distinct identities',new Set(config.weapons.map(w=>w.id)).size===13);
check('four grades with 3 identities each',[1,2,3,4].every(t=>config.weapons.filter(w=>w.tier===t).length===3));
check('grade weights total 100',config.draw.tierWeightsPct.reduce((a,b)=>a+b,0)===100);
check('starter baseline remains 100',config.baseCharacterAttack+config.weapons[0].baseAttack===100);
const rows=config.weapons.map(w=>{
 const levels=[];
 for(let r=0;r<=w.maxRefine;r++){
  const base=w.baseBonusPct+r*config.refineBonusPctPerLevel,peak=base+w.traitBonusPct;
  check(`${w.name}+${r} tier cap`,peak<=config.tierBudgetCapsPct[w.tier]);
  for(const d0 of [0,.1,1,37,100,150,99999]){
   const result=d0*(1+peak/100);
   check(`${w.name}+${r} D0=${d0} 30% bound`,result<=d0*1.3+1e-9);
  }
  levels.push({refine:r,basePct:base,peakPct:peak});
 }
 return {id:w.id,name:w.name,levels,baseNonPityChancePct:w.tier?config.draw.tierWeightsPct[w.tier-1]/3:0};
});
const scenarios=[.0,.5,2/3,.8,1].map(p=>({specialistShare:p,tier1:{general:10,specialist:9+2*p},tier2:{general:16,specialist:14+4*p},tier3:{general:22,specialist:18+6*p}}));
check('general beats specialist with no matching damage',scenarios[0].tier1.general>scenarios[0].tier1.specialist&&scenarios[0].tier2.general>scenarios[0].tier2.specialist&&scenarios[0].tier3.general>scenarios[0].tier3.specialist);
check('specialist beats general at 80% share',Object.values(scenarios[3]).filter(x=>typeof x==='object').every(x=>x.specialist>x.general));
check('healing weapon sacrifices ordinary damage',rows.find(x=>x.name==='饮露剑').levels[4].basePct<rows.find(x=>x.name==='照胆剑').levels[4].basePct);
const output={status:'PASS',scope:'Static proposed budgets only; no runtime trigger, save, timing, healing or battle verification',checks:checks.length,rows,scenarios,rareEligibleEventExpectedBonusPct:{zhaodan:24+.1*6,duanjie:24+.2*6},limits:'Expected values are conditional upper bounds before eligibility/cooldown filtering, not whole-battle DPS.'};
fs.writeFileSync(new URL('./budget-audit.json',import.meta.url),JSON.stringify(output,null,2)+'\n');
console.log(`PASS ${checks.length} static proposal checks; 13 weapons, 4 grades, max 30%.`);

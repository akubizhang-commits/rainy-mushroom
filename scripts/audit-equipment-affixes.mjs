import {mkdirSync,writeFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {definitions,envelope} from './lib/equipment-budget.mjs'
import {WEAPON_TUNING} from '../js/xianxia/TowerWeaponTuning.js'
import {createFixedWeapon,weaponSummary,validateWeapon} from '../js/xianxia/TowerWeapons.js'
import {createFixedEquipment,equipmentSummary,validateEquipment} from '../js/xianxia/TowerEquipment.js'
import {regenerationFraction,MAX_REGEN_FRACTION} from '../js/xianxia/TowerAttributeRules.js'
const out='reports/equipment-affix-review-2026-11-03';mkdirSync(out,{recursive:true})
const rows=definitions.map(d=>{const weapon=d.category==='weapon',item=weapon?createFixedWeapon(d.id,d.quality?d.id:'iron'):createFixedEquipment(d.id,d.quality?d.id:`basic-${d.category}`);assert.ok((weapon?validateWeapon:validateEquipment)(item));const summary=(weapon?weaponSummary:equipmentSummary)(item);return {...d,item,summary}})
const frequencies={};for(const r of rows)for(const a of r.item.affixes){const key=r.category+':'+a.type;frequencies[key]=(frequencies[key]||0)+1;assert.ok(Number.isFinite(a.value)&&a.value>=0)}
const dominance=[],vector=r=>({...r.base,...Object.fromEntries(r.item.affixes.map(a=>[a.type+':'+(a.target||''),a.value]))})
for(const a of rows)for(const b of rows)if(a.id!==b.id&&a.category===b.category&&a.tier===b.tier&&a.quality===b.quality){const x=vector(a),y=vector(b),keys=[...new Set([...Object.keys(x),...Object.keys(y)])];if(keys.every(k=>(x[k]||0)>=(y[k]||0))&&keys.some(k=>(x[k]||0)>(y[k]||0)))dominance.push({better:a.id,worse:b.id})}
for(const r of rows){if(r.category==='armor'){assert.equal(r.base.magicDefense||0,0);assert.ok(regenerationFraction({armor:r.item})<=MAX_REGEN_FRACTION)}if(r.category==='ring')assert.equal(r.base.physicalDefense||0,0)}
const budgets=definitions.filter(d=>d.category==='weapon').map(d=>({id:d.id,...envelope(d,WEAPON_TUNING[d.id]??{universal:0,flow:0})}))
const report={identities:rows.length,frequencies,dominance,budgetCases:budgets.reduce((n,r)=>n+r.count,0),baseAffixEnvelopeMax:Math.max(...budgets.map(r=>r.max)),limitations:['Static envelope excludes equipment skill-level bonuses: not a full 3x budget verdict.','Raw-axis dominance excludes time-to-kill, defense utility, and skill-level breakpoints.','No acquisition-time or fresh-save growth verdict.']}
writeFileSync(`${out}/audit.json`,JSON.stringify({report,rows,budgets},null,2));console.log(JSON.stringify(report,null,2))

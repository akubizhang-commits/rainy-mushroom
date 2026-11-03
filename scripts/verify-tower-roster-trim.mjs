import fs from 'node:fs'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {FLOORS,ARCHETYPES} from '../js/xianxia/TowerContent.js'
const root=new URL('../design/tower-roster-trim-2026-11-01/',import.meta.url)
const before=JSON.parse(fs.readFileSync(new URL('before-tower-design.json',root))).floors
const oldA=Object.fromEntries(JSON.parse(fs.readFileSync(new URL('before-rank-attributes.json',root))).archetypes.map(a=>[a.id,a]))
const A=Object.fromEntries(ARCHETYPES.map(a=>[a.id,a]))
const flat=(f,a)=>f.waves.flatMap(w=>[...w.enemy_groups].sort((x,y)=>Number(a[y.archetype].role==='boss')-Number(a[x.archetype].role==='boss')).flatMap(g=>Array.from({length:g.count},()=>({wave:w.wave,role:a[g.archetype].role,rank:g.rank,credit:a[g.archetype].core_drop_credit}))))
function stats(f,a){const families={},roles={normal:0,elite:0,boss:0};let normalHp=0,eliteHp=0,ranged=0;for(const w of f.waves)for(const g of w.enemy_groups){const ar=a[g.archetype],family=ar.id.split('_')[0];families[family]=(families[family]||0)+g.count;roles[ar.role]+=g.count;if(ar.role==='normal'){normalHp+=g.count*ar.floor_hp_factor*f.floor_stat_scale.normal_hp*(w.wave<=f.floor_stat_scale.early_normal_through_wave?f.floor_stat_scale.early_normal_hp_multiplier:1);if(['snake','scorpion','bat','falcon'].includes(family))ranged+=g.count}else if(ar.role==='elite')eliteHp+=g.count*ar.floor_hp_factor*f.floor_stat_scale.elite_hp*(w.wave<=(f.floor_stat_scale.early_elite_through_wave||0)?f.floor_stat_scale.early_elite_hp_multiplier:1)}return {families,roles,normalHp,eliteHp,ranged}}
const floors=FLOORS.map((f,i)=>{assert.deepEqual(flat(f,A),flat(before[i],oldA),`floor ${i+1} loot input sequence`);const old=stats(before[i],oldA),now=stats(f,A);return {floor:i+1,name:f.name,boss:f.boss_name,pool:f.normal_family_pool,...now,before:old,normalHpChange:now.normalHp/old.normalHp-1,eliteHpChange:now.eliteHp/old.eliteHp-1,lootInputsUnchanged:true}})
const report={status:'PASS',kind:'authored-roster-and-budget-audit',families:[...new Set(floors.flatMap(f=>Object.keys(f.families)))],reserved:['ape','scorpion','centipede'],floors,liveTiming:'NOT ASSESSED — NO DATA',hashes:Object.fromEntries(['TowerContent.js','TowerLoot.js','TowerCampaign.js'].map(f=>[f,createHash('sha256').update(fs.readFileSync(new URL('../js/xianxia/'+f,import.meta.url))).digest('hex')]))}
assert.equal(report.families.length,11)
fs.writeFileSync(new URL('budget-report.json',root),JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify({status:report.status,families:report.families.length,lootInputsUnchanged:9,floors:report.floors.map(f=>({floor:f.floor,normalHpChange:f.normalHpChange,eliteHpChange:f.eliteHpChange}))},null,2))

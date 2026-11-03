// Current-content QA: no historical content snapshots are used as current inputs.
import assert from 'node:assert/strict'
import { readFileSync,writeFileSync,mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { performance } from 'node:perf_hooks'
import { ARCHETYPES,FLOORS,FLOOR01,ECONOMY } from '../js/xianxia/TowerContent.js'
import { CORE_DROP_RULES,CORE_RANK_VALUES,buildCoreDropPlan } from '../js/xianxia/TowerLoot.js'
import { towerEnemyStats } from '../js/xianxia/TowerEnemyStats.js'
import { CRAFTING_COSTS } from '../js/xianxia/TowerCrafting.js'
import { analyzeCoreDropModel } from './verify-tower-loot-distribution.mjs'
const samples=Number(process.argv[2]??100000),A=Object.fromEntries(ARCHETYPES.map(a=>[a.id,a]))
assert.ok(Number.isInteger(samples)&&samples>=10000)
const normals=[{1:372},{1:300,2:110},{1:224,2:224},{2:486},{2:262,3:262},{3:450,4:112},{3:360,4:240},{3:256,4:350,5:32},{4:474,5:202}]
const elite=[0,3,5,8,10,12,15,18],boss=[0,10,15,20,25,30,35,40]
const credit=u=>u.role==='normal'?.05:(u.role==='elite'?elite:boss)[u.rank]
const sourceHashes=()=>Object.fromEntries(['TowerContent','TowerLoot','TowerEnemyStats','TowerCrafting'].map(n=>[n,createHash('sha256').update(readFileSync(`js/xianxia/${n}.js`)).digest('hex')]))
const initialHashes=sourceHashes()
const rows=[]
for(let floor=1;floor<=9;floor++){
 const units=FLOORS[floor-1].waves.flatMap(w=>{
  if(floor===1)return FLOOR01.waves[w.wave-1].batches.flatMap(b=>b.unit_ids.map(id=>({...A[b.archetype],wave:w.wave,key:`${w.wave}:${id}`})))
  const g=[...w.enemy_groups.filter(g=>A[g.archetype].role==='boss'),...w.enemy_groups.filter(g=>A[g.archetype].role!=='boss')]
  return g.flatMap(g=>Array(g.count).fill(A[g.archetype])).map((u,i)=>({...u,wave:w.wave,key:`${w.wave}:u${i+1}`}))
 })
 assert.deepEqual(units.filter(u=>u.role==='normal').reduce((s,u)=>(s[u.rank]=(s[u.rank]??0)+1,s),{}),normals[floor-1])
 const rule=CORE_DROP_RULES[floor],model=analyzeCoreDropModel(units,rule),byKey=new Map(units.map(u=>[u.key,u]))
 const normalValue=units.filter(u=>u.role==='normal').length*.05
 const scale=(rule.targetValue-normalValue)/units.filter(u=>u.role!=='normal').reduce((s,u)=>s+credit(u),0)
 const hits={},counts={},values={},prefixes={1:0,3:0,5:0,10:0,15:0,19:0},roleValues={normal:0,elite:0,boss:0}
 let total=0,countSum=0
 const start=performance.now()
 for(let i=0;i<samples;i++){
  const seed=Math.imul(i,0x9e3779b1)>>>0,plan=buildCoreDropPlan(floor,seed),entries=Object.entries(plan)
  let value=0
  for(const [key,rank]of entries){
   const u=byKey.get(key);assert.ok(u);assert.equal(rank,u.rank)
   value+=CORE_RANK_VALUES[rank];const g=`${u.role}:rank${rank}`;hits[g]=(hits[g]??0)+1
   roleValues[u.role]+=CORE_RANK_VALUES[rank]
   for(const wave of Object.keys(prefixes))if(u.wave<=+wave)prefixes[wave]+=CORE_RANK_VALUES[rank]
  }
  assert.ok(value>=rule.minValue&&value<=rule.maxValue)
  assert.ok(entries.length>=rule.minCount&&entries.length<=rule.maxCount)
  total+=value;countSum+=entries.length;counts[entries.length]=(counts[entries.length]??0)+1;values[value]=(values[value]??0)+1
 }
 const elapsedMs=performance.now()-start
 const groups=model.marginals.map(g=>{
  const observed=(hits[g.name]??0)/samples/g.entities,target=credit(g)*(g.role==='normal'?1:scale)/CORE_RANK_VALUES[g.rank]
  assert.ok(Math.abs(observed/target-1)<.2,`${floor}/${g.name} budget marginal`)
  assert.ok(Math.abs(observed-g.effectiveChance)<=7*Math.sqrt(g.effectiveChance*(1-g.effectiveChance)/(samples*g.entities))+.00002)
  return {...g,targetChance:target,proposalChance:rule.chancesByRole[g.role][g.rank],observedChance:observed,observedValuePerEntity:observed*CORE_RANK_VALUES[g.rank]}
 })
 assert.ok(Math.abs(total/samples/rule.targetValue-1)<.05)
 const hp=units.reduce((s,u)=>s+towerEnemyStats(u,floor,u.wave).hp,0)
 rows.push({floor,target:rule.targetValue,valueBounds:[rule.minValue,rule.maxValue],specialBudgetScale:scale,meanValue:total/samples,meanPhysicalCount:countSum/samples,counts,values,roleValues:Object.fromEntries(Object.entries(roleValues).map(([k,v])=>[k,v/samples])),prefixValues:Object.fromEntries(Object.entries(prefixes).map(([k,v])=>[k,v/samples])),hp,coreValuePer1000Hp:total/samples/hp*1000,acceptance:model.acceptanceProbability,expectedProposals:model.expectedProposals,fallbackProbability:model.exhaustionProbability,elapsedMs,microsecondsPerPlan:elapsedMs*1000/samples,groups,spiritStonesFromCoreMean:total/samples*ECONOMY.spirit_stones.legacy_core_unit_multiplier})
}
const dir='reports/rank-role-rebalance-2026-11-01/loot';mkdirSync(dir,{recursive:true})
const hashes=sourceHashes()
assert.deepEqual(hashes,initialHashes,'Current source changed during QA; rerun after generation finishes')
writeFileSync(`${dir}/verification.json`,JSON.stringify({samples,hashes,craftingCosts:CRAFTING_COSTS,breakthroughMaterialRules:ECONOMY.breakthrough_materials,rows},null,2)+'\n')
console.log(rows.map(r=>`F${r.floor}: value ${r.meanValue.toFixed(3)}, count ${r.meanPhysicalCount.toFixed(3)}, ${r.microsecondsPerPlan.toFixed(2)} us/plan`).join('\n'))

const fmt=n=>n.toFixed(3)
const text=[
 '# 妖丹：新品阶/身份当前数据验收',
 '',
 `每层 ${samples.toLocaleString()} 个 uint32 分散种子，共 ${samples*9} 个真实运行计划。verification.json 记录当前源码 SHA-256；calibration.json 使用明确批准的配额离线校准，不冒充历史快照为当前数据。`,
 '',
 '价值目标仍为63/65/78/87/90/108/105/110/119，所有样本严格位于各层±10%整数窗口。掉落仍为原生击杀单位最多一颗同阶妖丹；部分击杀不补全层保底。',
 '',
 '普通怪预算仍为每只0.05价值。新精英/Boss阶数增加后，沿用旧credit会膨胀全层经济，因此特殊角色按阶数奖励权重分摊剩余价值；不按生命倍率乘奖励。下表特殊系数是相对原rank权重，不是角色攻击倍率。概率表是提案概率，JSON同时记录精确条件边际和实际命中率；二者经统计误差检验。',
 '',
 '|层|目标|实测均值|实物颗数均值|可出现颗数|普通/精英/Boss价值|特殊预算系数|接受率|微秒/计划|',
 '|---|---|---|---|---|---|---|---|---|',
 ...rows.map(r=>`|${r.floor}|${r.target}|${fmt(r.meanValue)}|${fmt(r.meanPhysicalCount)}|${Object.keys(r.counts).join('/')}|${Object.values(r.roleValues).map(fmt).join('/')}|${fmt(r.specialBudgetScale)}|${fmt(r.acceptance*100)}%|${fmt(r.microsecondsPerPlan)}|`),
 '',
 '物理数量下降是高阶面额的直接结果，不再保留旧版十几颗的视觉频率。四层只有84/90两种合法价值；六、七、九层只有3/4颗两种合法数量。这是面额与预算约束，不可强行要求三种以上结果。妖丹面额本轮保持1–7阶，8/9阶尚未放入掉落池，未来新增须一起扩面额、数组、校准和回放协议。',
 '',
 '运行成本：128次有界拒绝采样，失败后使用一次缓存的有界背包配方；JSON含精确接受率、期望尝试数与耗尽概率。故障注入测试将PRNG强制归零，验证预算耗尽后仍确定性结束。',
 '',
 '妖丹兑换仍每价值10下品灵石。下表仅列妖丹货币预算，不含其他收入/首通/售材，也不宣称贡献点足够制作；技能/制作费用和突破材料掉率未修改。颗数减少不减少同价值兑换。',
 '',
 '|层|妖丹灵石均值|100灵石武器费用倍数|2400灵石进化书：最幸运/均值速率/保证整层数|',
 '|---|---|---|---|',
 ...rows.map(r=>`|${r.floor}|${fmt(r.spiritStonesFromCoreMean)}|${fmt(r.spiritStonesFromCoreMean/CRAFTING_COSTS.weapon.spiritStones)}|${Math.ceil(2400/(r.valueBounds[1]*10))}/${Math.ceil(2400/r.spiritStonesFromCoreMean)}/${Math.ceil(2400/(r.valueBounds[0]*10))}|`),
 '',
 '未评估：真人通层用时、胜率、资源/分钟。每千HP价值只用于静态击杀成本对照，不能替代技能、召唤、阶段机制和移动造成的真实战斗成本。',
 '',
].join('\n')
writeFileSync(`${dir}/README.md`,text)

// Numerical proposal only; does not import into or modify runtime balance.
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {GROWTH_SKILLS,realmPoints} from '../js/xianxia/TowerGrowth.js';
const root=new URL('../docs/xianxia/reports/balance-v2/',import.meta.url);
const caps=[1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,9,10,10,10,10,10,10,10,10,10];
const xp=l=>l===1?0:30*(l-1)+15*(l-1)**2;
const attack=l=>100*1.06**((l-1)-Math.floor((l-1)/9))*1.30**Math.floor((l-1)/9);
const hp=l=>100*1.08**((l-1)-Math.floor((l-1)/9))*1.35**Math.floor((l-1)/9);
const growth={sj_yujian:.10,sj_arc:.15,sj_wanjian:.20,sj_line:.10,sj_shadow:.20,sj_formation:.15};
const scale=(id,r)=>(1+growth[id])**(r-1), rnd=n=>Math.round(n*100)/100;
// damage per round/hit/tick, cooldown or shared hit window, ticks, target cap.
const cfg={sj_yujian:[1.2,1,1,1],sj_arc:[1.5,2.5,1,6],sj_wanjian:[.30,.6,1,6],sj_line:[8,4,1,6],sj_shadow:[4.8,4,1,3],sj_formation:[32/15,8,6,8]};
const defs=new Map(GROWTH_SKILLS.map(s=>[s.id,s]));
const effective={sj_yujian:.9,sj_arc:.6,sj_wanjian:.65,sj_line:.8,sj_shadow:.65,sj_formation:.7};
const learn=d=>d.id==='sj_formation'?10:d.learnLevel; // proposal: both branches gain their core at Foundation
const rows=[],stages=[],builds=[],floors=[],curves=[],scenarios=[];
const gifts=new Set(['sj_yujian','sj_arc','sj_wanjian']);
const scenarioFactors={stationary:{sj_yujian:1,sj_arc:1,sj_wanjian:1,sj_line:1,sj_shadow:1,sj_formation:1},moving:{sj_yujian:.9,sj_arc:.55,sj_wanjian:.5,sj_line:.7,sj_shadow:.45,sj_formation:.35},crowded:{sj_yujian:.9,sj_arc:2.8,sj_wanjian:2.8,sj_line:2.6,sj_shadow:1.95,sj_formation:3.2}};
const cost=(id,r)=>defs.get(id).pointCosts.slice(0,r).reduce((a,b)=>a+b,0)-(gifts.has(id)?1:0);
function optimize(level,flow,factors){
 const sp=realmPoints(xp(level)),preferred=flow==='剑气'?['sj_yujian','sj_arc','sj_line','sj_shadow']:flow==='剑阵'?['sj_yujian','sj_wanjian','sj_formation']:Object.keys(cfg);
 let states=new Map([[0,{score:0,ranks:{}}]]);
 for(const [id,c] of Object.entries(cfg)){
  const max=level<learn(defs.get(id))?0:preferred.includes(id)?caps[level-1]:1;
  const min=gifts.has(id)?1:0,next=new Map();
  for(const [used,old] of states)for(let r=min;r<=max;r++){
   const usedNext=used+cost(id,r);if(usedNext>sp)continue;
   const score=old.score+(r?attack(level)*c[0]*c[2]/c[1]*scale(id,r)*factors[id]:0);
   if(!next.has(usedNext)||score>next.get(usedNext).score)next.set(usedNext,{score,ranks:{...old.ranks,[id]:r}});
  }states=next;
 }
 const [spent,best]=[...states].sort((a,b)=>b[1].score-a[1].score||a[0]-b[0])[0];
 assert.equal(spent,Object.entries(best.ranks).reduce((sum,[id,r])=>sum+cost(id,r),0));assert.ok(spent<=sp);
 return {level,flow,available:sp,spent,ranks:best.ranks,assumed_effective_dps:rnd(best.score)};
}
for(const [id,c] of Object.entries(cfg))for(let rank=1;rank<=10;rank++)curves.push({skill:defs.get(id).name,rank,damage:rnd(100*c[0]*scale(id,rank)),cd:c[1],single_dps:rnd(100*c[0]*scale(id,rank)*c[2]/c[1]),each_rank_gain_percent:growth[id]*100,spent:cost(id,rank)});
for(let l=1;l<=27;l++){
 const a=attack(l),h=hp(l),sp=realmPoints(xp(l));
 stages.push({level:l,realm:['炼气','筑基','金丹'][Math.floor((l-1)/9)]+((l-1)%9+1)+'阶',attack:rnd(a),hp:rnd(h),attack_gain:l===1?0:rnd((a/attack(l-1)-1)*100),hp_gain:l===1?0:rnd((h/hp(l-1)-1)*100),skill_cap:caps[l-1],realm_points:sp});
 for(const [id,[damage,cd,ticks,targets]] of Object.entries(cfg)){
  const d=defs.get(id),r=l<learn(d)?0:caps[l-1];
  rows.push({level:l,skill:d.name,rank:r,attack:rnd(a),damage:r?rnd(a*damage*scale(id,r)):0,cd,ticks,single_dps:r?rnd(a*damage*scale(id,r)*ticks/cd):0,targets,full_coverage_dps:r?rnd(a*damage*scale(id,r)*ticks/cd*targets):0,each_rank_gain_percent:growth[id]*100});
 }
 // Exact multiple-choice knapsack for the additive six-active-skill model.
 for(const flow of ['剑气','剑阵'])builds.push(optimize(l,flow,effective));
 for(const [scenario,factors] of Object.entries(scenarioFactors))for(const flow of ['剑气','剑阵','混搭'])scenarios.push({...optimize(l,flow,factors),scenario});
 if(l%3===0){const floor=l/3,reference=builds.filter(b=>b.level===l);const d=(reference[0].assumed_effective_dps+reference[1].assumed_effective_dps)/2;
  // Fixed content targets, not runtime autoscaling; per-skill realization factors are assumptions.
  floors.push({floor,recommended_entry_level:Math.max(1,l-2),boss_reference_level:l,reference_attack:rnd(a),reference_hp:rnd(h),reference_build_assumed_effective_dps:rnd(d),normal_hp:rnd(a*cfg.sj_yujian[0]*scale('sj_yujian',caps[l-1])*[1.2,1.3,1.4,1.5,1.6,1.7,1.8,1.9,2][floor-1]),elite_hp:rnd(d*9),boss_hp:rnd(d*55),normal_hit:rnd(h*.10),elite_hit:rnd(h*.17),boss_light:rnd(h*.20),boss_heavy:rnd(h*.32)});
 }
}
for(const id of Object.keys(cfg))for(let r=2;r<=10;r++)assert.ok(Math.abs(scale(id,r)/scale(id,r-1)-(1+growth[id]))<1e-9);
assert.ok(2*scale('sj_line',1)>1.2*scale('sj_shadow',1));
assert.ok(2*scale('sj_line',7)<1.2*scale('sj_shadow',7));
assert.ok(.6*scale('sj_arc',1)>.5*scale('sj_wanjian',1));
assert.ok(.6*scale('sj_arc',6)<.5*scale('sj_wanjian',6));
assert.ok(attack(10)/attack(9)>1.299&&hp(10)/hp(9)>1.349);
// Validate the optimizer with brute force on small budgets, including optional learnings.
for(const level of [2,4,10]){
 const selected=['sj_yujian','sj_arc','sj_line','sj_shadow'];
 const ids=Object.keys(cfg),budget=realmPoints(xp(level));let brute=-Infinity;
 function visit(i,used,value){if(used>budget)return;if(i===ids.length){brute=Math.max(brute,value);return;}
  const id=ids[i],d=defs.get(id),c=cfg[id];
  const max=level<learn(d)?0:selected.includes(id)?caps[level-1]:1;
  for(let r=gifts.has(id)?1:0;r<=max;r++)visit(i+1,used+cost(id,r),value+(r?attack(level)*c[0]*c[2]/c[1]*scale(id,r)*effective[id]:0));
 }visit(0,0,0);assert.equal(rnd(brute),optimize(level,'剑气',effective).assumed_effective_dps);
}
const data={status:'proposal_not_runtime',assumptions:'No equipment/passives/evolutions; books and tutorial granted; realm SP only; scenario factors are assumptions. DP is exact only within this additive model. Enemy HP uses assumed realization, not measured.',stages,skills:rows,builds,floors,curves,scenarios};
await writeFile(new URL('proposal.json',root),JSON.stringify(data,null,2));
function csv(items){const keys=Object.keys(items[0]),q=v=>'"'+String(typeof v==='object'?JSON.stringify(v):v).replaceAll('"','""')+'"';return '\ufeff'+[keys.map(q).join(','),...items.map(r=>keys.map(k=>q(r[k])).join(','))].join('\n');}
for(const [name,items] of Object.entries({stages,skills:rows,builds,floors,curves,scenarios}))await writeFile(new URL(name+'.csv',root),csv(items));
const labels={level:'角色等级',realm:'修为',attack:'攻击',hp:'最大生命',attack_gain:'攻击提升%',hp_gain:'生命提升%',skill_cap:'主动技能上限',realm_points:'升级技能点',skill:'技能',rank:'技能等级',damage:'单轮/击/跳伤害',cd:'CD/间隔秒',ticks:'跳数',single_dps:'理想单体秒伤',targets:'目标上限',full_coverage_dps:'满覆盖群体秒伤',each_rank_gain_percent:'每次加点伤害提升%',scenario:'场景(stationary静止/moving移动/crowded四目标)',flow:'流派',available:'可用总点数',spent:'已花点数',ranks:'配点',assumed_effective_dps:'假设兑现秒伤',four_target_total_dps:'四目标理论总秒伤',floor:'塔层',recommended_entry_level:'建议入层等级',boss_reference_level:'BOSS基准等级',reference_attack:'参考攻击',reference_hp:'参考生命',reference_build_assumed_effective_dps:'假设有效秒伤',normal_hp:'普通怪HP',elite_hp:'精英HP',boss_hp:'BOSS HP',normal_hit:'普怪伤害',elite_hit:'精英伤害',boss_light:'BOSS轻击',boss_heavy:'BOSS重击'};
const curveSummary=Object.keys(cfg).map(id=>({skill:defs.get(id).name,each_rank_gain_percent:100*growth[id],dps1:curves.find(r=>r.skill===defs.get(id).name&&r.rank===1).single_dps,dps5:curves.find(r=>r.skill===defs.get(id).name&&r.rank===5).single_dps,dps10:curves.find(r=>r.skill===defs.get(id).name&&r.rank===10).single_dps}));
Object.assign(labels,{dps1:'1级秒伤',dps5:'5级秒伤',dps10:'10级秒伤'});
function table(items){const keys=Object.keys(items[0]);return '<div class="scroll"><table><thead><tr>'+keys.map(k=>'<th>'+(labels[k]||k)+'</th>').join('')+'</tr></thead><tbody>'+items.map(r=>'<tr>'+keys.map(k=>'<td>'+(typeof r[k]==='object'?Object.entries(r[k]).filter(([,v])=>v).map(([id,v])=>(defs.get(id)?.name||id)+' '+v).join('、'):r[k])+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';}
await writeFile(new URL('index.html',root),`<!doctype html><html lang="zh"><meta charset="utf-8"><title>成长数值 V2.1 · 差异化成长</title><style>body{font:15px/1.6 system-ui;margin:32px;background:#f6f4ec;color:#244437}.scroll{overflow:auto;max-height:65vh;background:white}table{border-collapse:collapse;font-variant-numeric:tabular-nums}td,th{padding:10px;white-space:nowrap;text-align:right;border-bottom:1px solid #dde4dc}th{position:sticky;top:0;background:#285548;color:white}h2{margin-top:40px}</style><h1>成长数值 V2.1 · 差异化成长</h1><p>用户已确认，数值已接入游戏；本页保留独立公式试算，实际表现以运行时审查表和试玩为准。小境界攻击+6%、生命+8%；大境界攻击+30%、生命+35%；技能按定位分别采用每级10%、15%、20%的伤害成长，并设不同初始伤害。</p><p>当前敌人表按固定层数设计，不随玩家等级自动上涨。构筑为限定六主动技能、固定命中假设下的动态规划最优分配，不是完整战斗的最优解；侧重流派允许其他分支技能点至1级补短板，自由混搭不限制分支。每级独立重配，不代表连续加点路线。assumed_effective_dps 使用预设命中系数，未实测；未计装备、被动、进阶；命中率是假定而非实测。怪物候选数值包含假定命中折损，尚待正式战斗回归。</p><p>字段：level=角色等级；rank=技能级；single_dps=理想单体秒伤；damage=单轮/单击/单跳；spent=消耗技能点；ranks=配点。</p><h2>成长曲线速览（固定攻击100，理想单体）</h2>${table(curveSummary)}<h2>技能逐级明细（固定攻击100）</h2>${table(curves)}<h2>27级角色属性</h2>${table(stages)}<h2>各阶段两流派示例</h2>${table(builds)}<h2>同点数多场景分配（含混搭）</h2>${table(scenarios)}<h2>九层怪物候选数值</h2>${table(floors)}<h2>逐级技能上限伤害</h2>${table(rows)}</html>`);
console.log(JSON.stringify({stages:stages.filter(r=>[1,9,10,18,19,27].includes(r.level)),floors,verification:'growth rates, crossover levels, budgets and brute-force optimizer checks passed'},null,2));

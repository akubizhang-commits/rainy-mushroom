#!/usr/bin/env node
// Stage-by-stage audit only. Does not alter game balance or saves.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {GROWTH_SKILLS,GROWTH_EVOLUTIONS,rankCap,realmPoints,spentPoints,skillRequirement} from '../js/xianxia/TowerGrowth.js';
import {cultivationAt,TOWER_XP_CAP} from '../js/xianxia/TowerProfile.js';
import {TowerCampaignStore,combatLoadout} from '../js/xianxia/TowerCampaign.js';
import {stats} from '../js/xianxia/TowerRun.js';
import {skillPresentation} from '../js/xianxia/TowerSkillPresentation.js';
import {createHash} from 'node:crypto';
const root=new URL('../docs/xianxia/reports/skill-dps/',import.meta.url);
const audit=JSON.parse(await readFile(new URL('audit.json',root)));
const checkOnly=process.argv.includes('--check-only');
assert.equal(audit.checks,134,'regenerate full 134-probe DPS audit first');
assert.equal(audit.schema,2,'regenerate doc52 DPS audit first');
for(const [file,hash] of Object.entries(audit.source_sha256)) assert.equal(createHash('sha256').update(await readFile(new URL('../js/xianxia/'+file,import.meta.url))).digest('hex'),hash,'rerun audit-skill-dps.mjs first');
const defs=[...GROWTH_SKILLS,...GROWTH_EVOLUTIONS], lookup=new Map(defs.map(s=>[s.id,s]));
const fresh=()=>structuredClone(new TowerCampaignStore({getItem:()=>null,setItem(){}},0).state);
const rows=[],stages=[];
const xpAt=level=>{
 let lo=0,hi=TOWER_XP_CAP;
 while(lo<hi){const mid=Math.floor((lo+hi)/2);if(cultivationAt(mid).level>=level)hi=mid;else lo=mid+1;}
 assert.equal(cultivationAt(lo).level,level);
 if(lo)assert.equal(cultivationAt(lo-1).level,level-1);
 return lo;
};
const approvedActiveCaps=[1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,9,10,10,10,10,10,10,10,10,10];
const close=(a,b,label)=>assert.ok(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<1e-5,`${label}: ${a} != ${b}`);
const val=(d,key,rank)=>Array.isArray(d[key])?d[key][rank-1]:d[key];
// Point costs are independently summed; Campaign helpers remain the subject of checks.
const independentCost=state=>Object.entries({...state.skills,...state.evolutionRanks}).reduce((total,[id,rank])=>{
 const d=lookup.get(id);return total+d.pointCosts.slice(0,rank).reduce((a,b)=>a+b,0)
  -(rank&&['sj_yujian','sj_arc','sj_wanjian'].includes(id)?d.pointCosts[0]:0);
},0);
const round=n=>Number(n.toFixed(3));
function stateFor(xp,id,rank,parentRank=0){const s=fresh();s.xp=xp;s.tutorialWaves=3;s.skills={sj_yujian:1,sj_arc:1,sj_wanjian:1};s.evolutionRanks={};s.evolutions=[];s.clearedFloor=9;s.researchPurchases=0;s.books=defs.filter(d=>d.bookCost).map(d=>d.id);if(lookup.get(id).kind==='evolution'){s.skills[lookup.get(id).parent]=parentRank;s.evolutionRanks[id]=rank;s.evolutions=[id];}else s.skills[id]=rank;return s;}
function measurement(d,r,p,m){
 if(!r)return {damage:null,dps:null,aoe:null,cd:null,effect:'',exactRuntimeSample:false};
 const sample=audit.rows.find(x=>x.id===d.id&&x.skill_rank===r&&(d.kind!=='evolution'||x.parent_rank===p));
 if(d.kind==='passive'){
  assert.ok(sample,`missing passive runtime sample ${d.id}/${r}`);
  return {damage:null,dps:null,aoe:null,cd:null,effect:sample.conditions,exactRuntimeSample:true};
 }
 const evo=d.kind==='evolution'?d:null,b=evo?lookup.get(d.parent):d,rank=evo?p:r;
 const raw=100*m*val(b,'damage',rank),budget=evo?evo.budgetMultipliers[r-1]:1;
 const cd=evo?.id==='evo_tiandi'?evo.cooldown:val(b,'cooldown',rank)??val(b,'hit_interval',rank);
 let damage=raw*budget,dps,rain=0;
 if(b.id==='sj_yujian'){
  damage=raw*(evo?evo.regularMultiplier:1);
  rain=evo?raw/val(b,'cooldown',rank)*(budget-evo.regularMultiplier):0;
  dps=damage/cd+rain;
 }else{
  if(evo?.id==='evo_tiandi')damage=raw*evo.cooldown/val(b,'cooldown',rank)*budget;
  dps=damage*(b.id==='sj_formation'?val(b,'ticks',rank):1)/cd;
 }
 const aoe=b.id==='sj_yujian'?damage/cd+rain*(evo?.rainTargetCap??0):dps*val(b,'target_cap',rank);
 if(sample){
  close(damage,sample.damage_per_hit_or_round*m,'exact-rank normalized damage reference');
  close(dps,sample.runtime_dps_120s*m,'exact-rank runtime DPS reference');
  close(aoe,sample.full_coverage_total_dps_upper*m,'exact-rank target count reference');
 }
 // Unsampled parent ranks are derived from their own table entries, never by
 // copying a nearby parent's target cap, range or rounded damage.
 return {damage:round(damage),dps:round(dps),aoe:round(aoe),cd,effect:(evo?evo.rule+' ':'')+b.rule,exactRuntimeSample:!!sample};
}
function verifyPresentation(state,d,rank,parentRank,metrics){
 const preview=skillPresentation(state,d.id);
 if(d.kind==='passive')return preview;
 const base=d.kind==='evolution'?lookup.get(d.parent):d,r=d.kind==='evolution'?parentRank:rank;
 const key=base.id==='sj_yujian'?'roundDamage':['sj_wanjian','sj_formation'].includes(base.id)?'tickDamage':'hitDamage';
 close(round(preview.stats.find(x=>x.key===key).value),metrics.damage,`${d.id}/${rank}/parent${parentRank} actual-cultivation presentation`);
 if(base.cooldown)close(preview.cooldown,metrics.cd,'actual-cultivation presentation cooldown');
 else close(preview.stats.find(x=>x.key==='hitInterval').value,metrics.cd,'orbit interval');
 if(base.id==='sj_yujian')close(preview.stats.find(x=>x.key==='swords').value,val(base,'swords',r),'real parent sword count');
 const target=preview.stats.find(x=>x.key==='target_cap');
 if(target)close(target.value,val(base,'target_cap',r),'real parent target cap');
 return preview;
}
for(let level=1;level<=27;level++){
 const xp=xpAt(level),c=cultivationAt(xp),sp=realmPoints(xp),base=fresh();base.xp=xp;
 assert.equal(c.level,level);
 const realm=Math.floor((level-1)/9),minor=level-1-realm,expectedAttack=100*1.06**minor*1.30**realm;
 close(100*c.attackMultiplier,expectedAttack,`approved cultivation attack ${level}`);
 close(c.maxHp,100*1.08**minor*1.35**realm,`approved cultivation HP ${level}`);
 close(stats(xp,combatLoadout(base)).attack,expectedAttack,`actual runtime attack ${level}`);
 close(stats(xp,combatLoadout(base)).maxHp,c.maxHp,`actual runtime maxHP ${level}`);
 assert.equal(sp,level-1+(level>=10?2:0)+(level>=19?2:0),'30 cultivation points retained');
 const previous=level>1?cultivationAt(xpAt(level-1)):null;
 const label=`${c.realm}${(level-1)%9+1}阶`;
 stages.push({level,label,xp,attack:round(100*c.attackMultiplier),hp:round(c.maxHp),points:sp,activeRankCap:approvedActiveCaps[level-1],passiveRankCap:level<10?3:level<19?5:8,attackGain:previous?round((c.attackMultiplier/previous.attackMultiplier-1)*100):0,newSkills:defs.filter(d=>d.learnLevel===level).map(d=>d.name).join('、')||'—'});
 for(const d of defs){
  const cap=level<d.learnLevel?0:rankCap(d.id,xp,9),parent=d.parent?lookup.get(d.parent):null;
  const parentCap=parent?rankCap(parent.id,xp,9):0;
  const expectedCap=level<d.learnLevel?0:d.kind==='evolution'
   ? d.rankRequirements.filter(q=>level>=q.characterLevel&&9>=q.clear).length
   : Math.min(d.maxLevel,d.kind==='active'?approvedActiveCaps[level-1]:level<10?3:level<19?5:8);
  assert.equal(cap,expectedCap,`${d.id} actual rank cap at cultivation ${level}`);
  const state=cap?stateFor(xp,d.id,cap,parentCap):null;
  const cost=state?spentPoints(state):0;
  if(state)assert.equal(cost,independentCost(state),'independent full-rank point cost');
  // Single-skill allocation from cultivation points only; floor/book gates assumed met.
  let attainable=0,attainParent=0,attainCost=0;
  for(let r=1;r<=cap;r++)for(const p of parent?Array.from({length:parentCap},(_,i)=>i+1):[0]){
   if(parent&&p<d.rankRequirements[r-1].parentLevel)continue;
   const candidate=stateFor(xp,d.id,r,p),n=spentPoints(candidate);assert.equal(n,independentCost(candidate),'independent attainable point cost');
   if(n<=sp){attainable=r;attainParent=p;attainCost=n;}
  }
  if(attainable){const before=stateFor(xp,d.id,attainable,attainParent);if(parent)before.evolutionRanks[d.id]--;else before.skills[d.id]--;const q=skillRequirement(before,d.id);assert.ok(q.ok||(['sj_yujian','sj_arc','sj_wanjian'].includes(d.id)&&attainable===1),`${d.id}/${level}: ${q.reason}`);}
  const metrics=measurement(d,cap,parentCap,c.attackMultiplier),possible=measurement(d,attainable,attainParent,c.attackMultiplier);
  const presentation=cap?verifyPresentation(state,d,cap,parentCap,metrics):null;
  if(attainable)verifyPresentation(stateFor(xp,d.id,attainable,attainParent),d,attainable,attainParent,possible);
  rows.push({level,realm:label,attack:round(100*c.attackMultiplier),realmPoints:sp,id:d.id,name:d.name,kind:d.kind,learnLevel:d.learnLevel,requiredClear:cap&&parent?d.rankRequirements[cap-1].clear:d.learnClear,bookCost:d.bookCost||0,cap,parentCap:parent?parentCap:null,cost,affordable:!!cap&&cost<=sp,attainable,attainParent:parent?attainParent:null,attainCost,...metrics,attainDps:possible.dps,attainExactRuntimeSample:possible.exactRuntimeSample,stats:presentation?.stats.map(x=>`${x.label??x.key}：${x.value}${x.unit??''}`).join('；')||'尚未达到学习境界'});
 }
}
assert.equal(rows.length,27*defs.length);
const columns={realm:'修为',attack:'基础攻击',realmPoints:'升级技能点',name:'技能',kind:'类型',learnLevel:'初学角色等级',requiredClear:'需要通关层数',bookCost:'解锁灵石费用',cap:'当级技能上限',parentCap:'前置上限',cost:'点满含前置成本',affordable:'仅升级技能点可负担',attainable:'仅升级点可达技能级',attainParent:'对应前置级',attainCost:'对应点数成本',damage:'单轮或单击或单跳伤害',cd:'冷却或同靶间隔秒',dps:'理想单体秒伤',aoe:'满覆盖群体秒伤上限',attainDps:'可负担等级秒伤',exactRuntimeSample:'该技能及父等级已有120秒样本',attainExactRuntimeSample:'可负担等级已有120秒样本',stats:'效果明细',effect:'结算与命中条件'};
const csv=Object.values(columns).map(q).join(',')+'\n'+rows.map(r=>Object.keys(columns).map(k=>q(r[k])).join(',')).join('\n');
function q(v){return '"'+String(v??'—').replaceAll('"','""')+'"';}
// Do not publish mixed-version reports while implementation is still landing.
for(const [file,hash] of Object.entries(audit.source_sha256))assert.equal(createHash('sha256').update(await readFile(new URL('../js/xianxia/'+file,import.meta.url))).digest('hex'),hash,'sources changed during progression audit; regenerate both reports');
if(checkOnly){console.log(JSON.stringify({rows:rows.length,levels:stages.length,status:'passed',output_written:false}));process.exit(0);}
await mkdir(root,{recursive:true});
await writeFile(new URL('progression.csv',root),'\ufeff'+csv);
await writeFile(new URL('progression.json',root),JSON.stringify({schema:2,stages,rows,runtime_checks:audit.checks,method:'real cultivation and ranks; independent formulas cross-checked against exact-rank runtime samples and live presentation',limitations:['per-skill hypothetical allocations, not a combined legal build','floor gates and books assumed complete; attainable budgets use cultivation points only','unsampled evolution parent ranks use exact table formulas and presentation checks, not additional 120s runtime probes','no equipment, CDR or enemy AI'],source_sha256:audit.source_sha256},null,2));
await writeFile(new URL('progression.html',root),`<!doctype html><html lang="zh"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>剑修逐级战力审查</title><style>
body{margin:0;background:#f6f4ed;color:#263f37;font:14px/1.6 system-ui}main{padding:28px;max-width:1800px;margin:auto}h1{margin:0}h2{font-size:20px}p{max-width:1200px}.controls{display:flex;gap:12px;flex-wrap:wrap;margin:18px 0}select,input{padding:9px;font:inherit}.scroll{overflow:auto;max-height:65vh;background:white;border:1px solid #c5cec5}table{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums}th,td{padding:9px 12px;text-align:right;white-space:nowrap;border-bottom:1px solid #e1e6df}th{position:sticky;top:0;background:#285548;color:white;z-index:2}td:first-child,th:first-child{text-align:left}tr.break{background:#e1efdf}tr.locked{color:#999}.warn{color:#ad522f}details{max-width:440px;text-align:left;white-space:normal}a{color:#226956}.legend{background:#e9eee4;padding:14px}button{cursor:pointer}</style><main>
<h1>剑修 · 27级战力对照</h1><p>当前实际数值，不是调整后的目标值。装备固定入门铁剑与无属性基础装备，无额外戒指或其他被动叠加。逐级使用真实修为攻击力，不再统一为100攻击。</p>
<p class="legend">每行独立评价一个技能：满级伤害假定通层与购书条件已满足、技能点充足；“升级点可达”仅使用升级所得技能点，包含进阶的前置成本，假定已领前三波赠送技能。通层奖励与研习合计最多另加6点，此表不默认获得。不能把各行满级秒伤相加当成一套合法配装。进阶替换父技能；被动列效果，不虚构独立秒伤。</p>
<h2>逐级成长与突破</h2><div class="scroll" style="max-height:38vh"><table><thead><tr><th>修为</th><th>累计修为</th><th>基础攻击 / 生命</th><th>较前一级</th><th>升级技能点累计</th><th>主动 / 被动等级上限</th><th>新增学习阶段（仍需通层/购书）</th></tr></thead><tbody id="growth"></tbody></table></div>
<h2>每级 × 全部技能</h2><div class="controls"><select id="level"><option value="">全部27级</option></select><select id="skill"><option value="">全部技能</option></select><label><input type="checkbox" id="available">仅显示达到学习境界</label><a href="progression.csv" download>下载完整CSV</a></div>
<div class="scroll"><table><thead><tr><th>修为</th><th>技能</th><th>技能上限 / 前置级</th><th>满级成本 / 升级点</th><th>伤害①</th><th>CD / 间隔</th><th>单体秒伤</th><th>群体上限②</th><th>升级点可达等级</th><th>可达秒伤</th><th>门槛与效果</th></tr></thead><tbody id="data"></tbody></table></div>
<p>① 御剑为整轮、剑阵为单跳，其他为单击/命中窗口；万剑归宗的剑雨另计，见效果明细。② 所有目标全部命中且吃满跳数的理论上限，不代表实战输出。万剑归宗群体另含剑雨；周天剑域单体列外圈，内圈限制见明细。</p>
<p>当前实测修为曲线：小阶攻击×1.06、生命×1.08；两次大境界突破分别替代小阶增长，攻击×1.30、生命×1.35。主动等级上限按真实27级表逐阶校验；被动仍为3/5/8级，御剑飞行1级。进阶最高2级，父技能6/8级与通层6/9层门槛不变。表中全部使用实际父技能等级；未覆盖的120秒进阶父等级样本仅作独立公式与面板交叉校验，不冒称额外运行时实测。此页未修改平衡参数。</p></main><script>
const rows=${JSON.stringify(rows).replaceAll('<','\\u003c')},stages=${JSON.stringify(stages)},defs=${JSON.stringify(defs.map(d=>({id:d.id,name:d.name})))};
const el=id=>document.getElementById(id),fmt=n=>n==null?'—':n,esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;');
el('growth').innerHTML=stages.map(s=>'<tr class="'+([10,19].includes(s.level)?'break':'')+'"><td>'+s.label+'</td><td>'+s.xp+'</td><td>'+s.attack+' / '+s.hp+'</td><td>'+s.attackGain+'%</td><td>'+s.points+'</td><td>'+s.activeRankCap+' / '+s.passiveRankCap+'</td><td>'+s.newSkills+'</td></tr>').join('');
for(const s of stages)el('level').add(new Option(s.label,s.level));for(const s of defs)el('skill').add(new Option(s.name,s.id));
function render(){const list=rows.filter(r=>(!el('level').value||r.level===+el('level').value)&&(!el('skill').value||r.id===el('skill').value)&&(!el('available').checked||r.cap));el('data').innerHTML=list.map(r=>'<tr class="'+(!r.cap?'locked':[10,19].includes(r.level)?'break':'')+'"><td>'+r.realm+'</td><td>'+r.name+'</td><td>'+r.cap+(r.parentCap?' / '+r.parentCap:'')+'</td><td class="'+(r.cap&&!r.affordable?'warn':'')+'">'+r.cost+' / '+r.realmPoints+'</td><td>'+fmt(r.damage)+'</td><td>'+fmt(r.cd)+'</td><td>'+fmt(r.dps)+'</td><td>'+fmt(r.aoe)+'</td><td>'+r.attainable+(r.attainParent?' / 前置'+r.attainParent:'')+'</td><td>'+fmt(r.attainDps)+'</td><td><details><summary>查看效果与条件</summary>通关'+r.requiredClear+'层；解锁'+r.bookCost+'灵石。<br>'+esc(r.stats)+'<br>'+esc(r.effect)+'</details></td></tr>').join('');}for(const id of ['level','skill','available'])el(id).onchange=render;render();
</script></html>`);
const first=audit.tiandi_unlearned_preview, end=stages.at(-1);
await writeFile(new URL('audit-summary.md',root),`# 52号成长数值审计

状态：当前源码版本的审计通过；不是全游戏难度或装备冷却缩减验收。

- 归一化伤害表129行、运行时探测134项：60项基础主动、20项进阶主区域、5项无我内圈、49项被动。主动与进阶各观察120秒的真实目标扣血、起手周期和前摇；被动核对实际扣血/预算/移动速度/拾取边界，不用面板输出替代运行时证据。
- 实际修为27级、全技能459行；攻击、生命、逐级上限、技能点成本、可负担等级及面板值交叉检查通过。主动上限按52号逐级表，不再按旧3/6/10大境界常量处理。
- 27级攻击 ${end.attack}，最大生命 ${end.hp}。小阶攻击×1.06、生命×1.08；突破攻击×1.30、生命×1.35，替代当次小阶倍率。
- 未学一剑开天的父技能回退预览为 ${Number(first.hit_damage.toFixed(3))}，周期 ${first.cooldown}秒，由父技能1级、当前进阶1级预算和周期比独立推导，不再断言旧常数。
- 四进阶使用各自预算数组，仍最多2级；角色19/27级、通层6/9、父技能6/8级要求保持，具体初学阶段仍由各进阶自己的学习入口约束。

## 方法与限制

归一化探测在内存训练夹具中隔离单技能，攻击固定100；高阶技能在该夹具中的投资不代表0修为可合法学习。逐级表另用真实修为和真实父技能等级，不把各行独立投资相加当作合法整套构筑。可负担列仅花升级所得点数，假定教学、通层及购书条件满足；不默认获得额外6点。

进阶120秒样本保留父6/8/10级的合法要求组合；父7/9级等其余逐级数据用实际表项独立计算并与面板交叉校验，JSON和CSV标明是否具有对应的运行时样本。群体栏是满覆盖数学上限，不是多目标实战或移动目标命中率。未测试装备词条及装备冷却缩减，也未评估新妖兽AI和完整九层耗时。未通过项：本次审计无失败断言；上述未覆盖项不能当作通过。

## 复算与并行依赖

依次运行：

\`\`\`sh
node scripts/audit-skill-dps.mjs
node scripts/audit-skill-progression.mjs
\`\`\`

两脚本支持 --check-only；只校验、不改报告。DPS审计开始与结束检查源码SHA-256；逐级审计必须匹配该报告指纹，并在写出前再次检查。成长、Profile、Run、技能面板、Campaign、武器、防具/戒指、技能冷却工具和生成内容任一模块改变，都需要按顺序重跑，不能继续使用本批结果。依赖均为只读，不修改其源码或存档。

输出：skill-dps.html/csv、audit.json（含逐项运行时证据和源码指纹）、progression.html/csv/json、本摘要。
`);
console.log(JSON.stringify({rows:rows.length,levels:stages.length,checks:'source hashes, cultivation attack, point costs and attainable learning gates passed',output:'docs/xianxia/reports/skill-dps/progression.html'}));

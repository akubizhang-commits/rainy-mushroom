import test from 'node:test'
import assert from 'node:assert/strict'
const version='exposed',bonus=3;const {ARCHETYPES}=await import('../js/xianxia/TowerContent.js')
const {towerEnemyStats}=await import('../js/xianxia/TowerEnemyStats.js')
const mod = await import('../js/xianxia/TowerMonsterMechanics.js')
const ids = Array.from({length:24}, (_,i)=>`M${String(i+1).padStart(2,'0')}`)
function fixture(floor=1) {
 const s={time:0,floor,wave:20,arenaVersion:1,player:{x:33,y:-60,radius:18,moveSpeed:180},enemies:[],projectiles:[],zones:[],monsterMechanics:{version:1,zones:[],sequence:0,nextMajorAt:0}}
 const run={state:s,_visible:()=>true,_enemy(u){const authored=towerEnemyStats(ARCHETYPES.find(a=>a.id===u.archetype),floor,20);return {...u,name:'monster',family:'boar',role:'normal',rank:1,x:u.x,y:u.y,hp:authored.hp,maxHp:authored.hp,radius:22,damage:authored.damage,moveSpeed:authored.moveSpeed,woundBudget:0,woundUntil:0,orbitNextAt:0,ai:{mode:'approach',attack:null,readyAt:0,graceUntil:0,until:0,eligibleSince:-1,sequence:0,cooldowns:{},faceX:1,faceY:0,orbitSign:1,offset:0,phase:1,transitionUntil:0,transitionPending:false,entryUntil:0}}}}
 const e={...run._enemy({id:'boss',archetype:'boar_boss',x:150,y:-60}),role:'boss',rank:3,hp:10000,maxHp:10000,damage:20}
 s.enemies.push(e); mod.initializeMonsterMechanics?.(run,e); return {run,s,e}
}
function tick(f,seconds){const hits=[];for(let i=0;i<seconds*60;i++){f.s.time+=1/60;mod.tickMonsterMechanics(f.run,hits)}return hits}

function ready(f,id){const m=f.e.mechanic;for(const k of m.skills)m.cooldowns[k]=999;m.phase='windup';m.skillId=id;m.startedAt=0;m.activatesAt=.1;m.until=.1;m.uses[id]=1;return m}
for(const id of ['M07','M09'])test(`${id}: completed floor6 boss attack extends recovery only, retains snapshot and blocks movement`,()=>{
 const f=fixture(6),m=ready(f,id);tick(f,.1);
 assert.equal(m.phase,'recovery');assert.ok(Math.abs(m.until-f.s.time-mod.MONSTER_SKILLS[id].recovery-bonus)<1e-6);
 assert.equal(m.label,version==='exposed'?'收势破绽 · 承伤+20%':'重招收势');assert.equal(mod.monsterMechanicsBlocks(f.run,f.e),true);assert.equal(mod.monsterDamageMultiplier(f.run,f.e),version==='exposed'?1.2:1);
 assert.equal(mod.validateMonsterMechanics(structuredClone(f.s)),true);
 const until=m.until;tick(f,until-f.s.time+.02);assert.equal(m.phase,'idle');assert.equal(m.label,'');assert.equal(mod.monsterDamageMultiplier(f.run,f.e),1);assert.ok(m.cooldowns[id]>=until+mod.MONSTER_SKILLS[id].cooldown-1e-6);
});
test('cancelled offscreen windup does not earn an extended opening',()=>{const f=fixture(6),m=ready(f,'M07');f.run._visible=()=>false;tick(f,1/60);assert.equal(m.phase,'recovery');assert.ok(Math.abs(m.until-f.s.time-mod.MONSTER_SKILLS.M07.recovery)<1e-6);assert.notEqual(m.label,'重招收势')});
test('floor7 stomp and floor6 elites retain original recovery',()=>{
 const f=fixture(7),m=ready(f,'M07');tick(f,.1);assert.ok(Math.abs(m.until-f.s.time-mod.MONSTER_SKILLS.M07.recovery)<1e-6);
 const elite=fixture(6);elite.e.role='elite';ready(elite,'M07');tick(elite,.1);assert.ok(Math.abs(elite.e.mechanic.until-elite.s.time-mod.MONSTER_SKILLS.M07.recovery)<1e-6);
});
test('restored opening retains its remaining time and expires without extending vulnerability',()=>{
 const f=fixture(6);ready(f,'M07');tick(f,.1);tick(f,1);
 const restored=fixture(6);restored.s=structuredClone(f.s);restored.run.state=restored.s;
 restored.e=restored.s.enemies.find(e=>e.id===f.e.id);
 assert.equal(mod.validateMonsterMechanics(restored.s),true);
 const until=f.e.mechanic.vulnerableUntil;
 tick(f,4.1);tick(restored,4.1);
 assert.equal(restored.e.mechanic.vulnerableUntil,until);
 assert.deepEqual(restored.e.mechanic,f.e.mechanic);
 assert.equal(mod.monsterDamageMultiplier(restored.run,restored.e),1);
});

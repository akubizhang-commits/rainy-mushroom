import test from 'node:test'
import assert from 'node:assert/strict'
import { ARCHETYPES } from '../js/xianxia/TowerContent.js'
import { towerEnemyStats } from '../js/xianxia/TowerEnemyStats.js'
const mod = await import('../js/xianxia/TowerMonsterMechanics.js').catch(() => ({}))
const ids = Array.from({length:24}, (_,i)=>`M${String(i+1).padStart(2,'0')}`)
function fixture(floor=1) {
 const s={time:0,floor,wave:20,arenaVersion:1,player:{x:33,y:-60,radius:18,moveSpeed:180},enemies:[],projectiles:[],zones:[],monsterMechanics:{version:1,zones:[],sequence:0,nextMajorAt:0}}
 const run={state:s,_visible:()=>true,_enemy(u){const authored=towerEnemyStats(ARCHETYPES.find(a=>a.id===u.archetype),floor,20);return {...u,name:'monster',family:'boar',role:'normal',rank:1,x:u.x,y:u.y,hp:authored.hp,maxHp:authored.hp,radius:22,damage:authored.damage,moveSpeed:authored.moveSpeed,woundBudget:0,woundUntil:0,orbitNextAt:0,ai:{mode:'approach',attack:null,readyAt:0,graceUntil:0,until:0,eligibleSince:-1,sequence:0,cooldowns:{},faceX:1,faceY:0,orbitSign:1,offset:0,phase:1,transitionUntil:0,transitionPending:false,entryUntil:0}}}}
 const e={...run._enemy({id:'boss',archetype:'boar_boss',x:150,y:-60}),role:'boss',rank:3,hp:10000,maxHp:10000,damage:20}
 s.enemies.push(e); mod.initializeMonsterMechanics?.(run,e); return {run,s,e}
}
function tick(f,seconds){const hits=[];for(let i=0;i<seconds*60;i++){f.s.time+=1/60;mod.tickMonsterMechanics(f.run,hits)}return hits}
test('M10 special web emits magic damage and its saved type cannot be forged',()=>{
 const f=fixture(3)
 f.e.mechanic.cooldowns.M11=100;f.e.mechanic.cooldowns.M22=100
 tick(f,10.1)
 const z=f.s.monsterMechanics.zones.find(z=>z.skillId==='M10')
 assert.ok(z);assert.equal(z.damageType,'magic')
 const bad=structuredClone(f.s);bad.monsterMechanics.zones[0].damageType='physical'
 assert.equal(mod.validateMonsterMechanics(bad),false)
 assert.equal(mod.validateMonsterMechanics(f.s),true)
 f.s.player.x=z.x;f.s.player.y=z.y
 const hits=tick(f,2)
 assert.ok(hits.some(hit=>hit.id===z.id&&hit.damageType==='magic'))
})
test('exports a complete executable catalog and all integration hooks',()=>{assert.deepEqual(Object.keys(mod.MONSTER_SKILLS??{}),ids);for(const name of ['initializeMonsterMechanics','tickMonsterMechanics','monsterDamageMultiplier','monsterMovementMultiplier','monsterAttackSpec','monsterMechanicsBlocks','onMonsterDeaths','validateMonsterMechanics','targetPriority'])assert.equal(typeof mod[name],'function')})
test('charge telegraphs, locks direction, hits once and starts cooldown after recovery',()=>{const f=fixture();tick(f,6.1);assert.equal(f.e.mechanic.skillId,'M06');const z=f.s.monsterMechanics.zones[0];assert.equal(z.phase,'windup');const target={x:z.toX,y:z.toY};f.s.player.y+=50;tick(f,.5);assert.deepEqual({x:z.toX,y:z.toY},target);f.s.player.x=target.x;f.s.player.y=target.y;const hits=tick(f,4);assert.ok(hits.length<=1);assert.ok(f.e.mechanic.cooldowns.M06>f.s.time)})
test('enrage is once only, never heals or adds attack damage',()=>{const f=fixture();f.e.hp=1900;tick(f,2);assert.equal(f.e.mechanic.enraged,true);assert.equal(f.e.hp,1900);assert.equal(mod.monsterMovementMultiplier(f.run,f.e),1.25);assert.equal(mod.monsterDamageMultiplier(f.run,f.e),1);const spec={damage:20,cooldown:4};assert.equal(mod.monsterAttackSpec(f.run,f.e,spec).damage,20)})
test('clones have bounded stats, survive reload and award one vulnerability on real clear',()=>{const f=fixture(2);f.e.mechanic.cooldowns.M05=100;tick(f,22);const clones=f.s.enemies.filter(e=>e.temporary?.kind==='clone');assert.equal(clones.length,2);assert.equal(clones[0].maxHp,2200);assert.equal(clones[0].damage,5);assert.equal(mod.validateMonsterMechanics(JSON.parse(JSON.stringify(f.s))),true);for(const e of clones)e.hp=0;mod.onMonsterDeaths(f.run,clones);assert.equal(mod.monsterDamageMultiplier(f.run,f.e),1.15);const until=f.e.mechanic.vulnerableUntil;mod.onMonsterDeaths(f.run,clones);assert.equal(f.e.mechanic.vulnerableUntil,until)})
test('death cleans only owned temporary actors and all their zones',()=>{const f=fixture(2);f.e.mechanic.cooldowns.M05=100;tick(f,22);f.s.enemies.push({...f.run._enemy({id:'support',archetype:'boar_normal',x:0,y:0})});f.e.hp=0;mod.onMonsterDeaths(f.run,[f.e]);assert.ok(f.s.enemies.some(e=>e.id==='support'));assert.equal(f.s.enemies.filter(e=>e.temporary).length,0);assert.equal(f.s.monsterMechanics.zones.length,0)})
test('every authored boss loadout remains JSON serializable and valid under long simulation',()=>{for(let floor=1;floor<=9;floor++){const f=fixture(floor);for(let i=0;i<100;i++){if(i===40)f.e.hp=5500;if(i===80)f.e.hp=1900;tick(f,1);assert.equal(mod.validateMonsterMechanics(JSON.parse(JSON.stringify(f.s))),true,`floor ${floor} time ${i}`)}}})
test('validation rejects tampered ownership, timers and counters',()=>{const f=fixture();assert.equal(mod.validateMonsterMechanics(f.s),true);f.e.mechanic.enraged='yes';assert.equal(mod.validateMonsterMechanics(f.s),false)})
test('a delayed clone clear works while owner is idle and remains valid',()=>{const f=fixture(2);f.e.mechanic.cooldowns.M05=100;tick(f,25);assert.equal(f.e.mechanic.phase,'idle');const clones=f.s.enemies.filter(a=>a.temporary);clones.forEach(a=>a.hp=0);mod.onMonsterDeaths(f.run,clones);f.s.enemies=f.s.enemies.filter(a=>a.hp>0);assert.equal(mod.validateMonsterMechanics(f.s),true)})
test('progress rejects restored summon counters, healing, and extended actor life',()=>{assert.equal(typeof mod.validateMonsterMechanicsProgress,'function');const f=fixture(2);f.e.mechanic.cooldowns.M05=100;tick(f,22);const before=structuredClone(f.s);const after=structuredClone(f.s);after.enemies[0].mechanic.uses.M01=0;assert.equal(mod.validateMonsterMechanicsProgress(before,after),false);const extension=structuredClone(before);extension.enemies[1].temporary.expiresAt+=1;assert.equal(mod.validateMonsterMechanicsProgress(before,extension),false);assert.equal(mod.validateMonsterMechanicsProgress(before,structuredClone(before)),true)})
test('healing is bounded and breaking the core stops all subsequent recovery',()=>{const f=fixture(5);f.e.hp=5000;f.e.mechanic.cooldowns.M11=200;f.e.mechanic.cooldowns.M16=200;tick(f,28);const core=f.s.enemies.find(a=>a.temporary?.kind==='core');assert.ok(core);assert.ok(f.e.hp>5000&&f.e.hp<=5600);core.hp=0;mod.onMonsterDeaths(f.run,[core]);f.s.enemies=f.s.enemies.filter(a=>a.hp>0);const hp=f.e.hp;tick(f,10);assert.equal(f.e.hp,hp);assert.equal(mod.monsterDamageMultiplier(f.run,f.e),1)})
test('crystals give armor and their destruction grants capped damage vulnerability',()=>{const f=fixture(6);f.e.hp=5900;tick(f,2);assert.ok(Math.abs(mod.monsterDamageMultiplier(f.run,f.e)-.2)<1e-8);const crystals=f.s.enemies.filter(a=>a.temporary?.kind==='crystal');assert.equal(crystals.length,2);crystals.forEach(a=>a.hp=0);mod.onMonsterDeaths(f.run,crystals);assert.equal(mod.monsterDamageMultiplier(f.run,f.e),1.2)})
test('summoning shows the actual future actor positions throughout windup',()=>{const f=fixture(2);tick(f,15.2);const points=f.s.monsterMechanics.zones.filter(z=>z.spawnKind);assert.equal(points.length,4);const positions=points.map(z=>[z.x,z.y]);tick(f,2.2);const summoned=f.s.enemies.filter(e=>e.temporary);assert.equal(summoned.length,4);assert.deepEqual(summoned.map(e=>[e.x,e.y]),positions)})
test('ring expands, and the breath sweeps only inside its original warning envelope',()=>{const ring=fixture(8);ring.e.mechanic.cooldowns.M05=100;ring.e.mechanic.cooldowns.M19=100;tick(ring,19.9);const z=ring.s.monsterMechanics.zones.find(z=>z.skillId==='M15');assert.ok(z);const r=z.radius;tick(ring,.3);assert.ok(z.radius>r);const breath=fixture(5);breath.e.mechanic.cooldowns.M11=100;tick(breath,17.1);const b=breath.s.monsterMechanics.zones.find(z=>z.skillId==='M16');const x=b.faceX;tick(breath,1);assert.notEqual(b.faceX,x)})
test('expired zones cannot deliver one final damage tick',()=>{const f=fixture();tick(f,6.2);const z=f.s.monsterMechanics.zones[0];z.expiresAt=f.s.time;z.activatesAt=f.s.time-1;f.s.player.x=f.e.x;f.s.player.y=f.e.y;const hits=tick(f,1/60);assert.equal(hits.length,0)})
test('validator rejects self-certified temporary stats and arbitrary controller fields',()=>{const f=fixture(2);f.e.mechanic.cooldowns.M05=100;tick(f,22);const forged=structuredClone(f.s);forged.enemies[1].maxHp*=2;forged.enemies[1].temporary.baseHp*=2;assert.equal(mod.validateMonsterMechanics(forged),false);f.e.mechanic.freeShield=true;assert.equal(mod.validateMonsterMechanics(f.s),false)})
test('M20 gives time to lure before its separately locked warned charge',()=>{const f=fixture(7);f.e.hp=6400;tick(f,.1);assert.equal(f.e.mechanic.skillId,'M20');const pillar=f.s.enemies.find(e=>e.temporary?.kind==='pillar');assert.ok(pillar);assert.equal(f.s.monsterMechanics.zones.filter(z=>z.damage>0).length,0);f.s.player.x=pillar.x;f.s.player.y=pillar.y;tick(f,2);const z=f.s.monsterMechanics.zones.find(z=>z.skillId==='M20'&&z.damage>0);assert.ok(z);assert.equal(z.phase,'windup');tick(f,2);assert.equal(mod.monsterDamageMultiplier(f.run,f.e),1.2);assert.equal(f.s.enemies.some(e=>e.temporary?.kind==='pillar'),false)})
test('offscreen cancellation consumes use and keeps already materialized summons',()=>{const f=fixture();tick(f,6.2);f.run._visible=()=>false;tick(f,.1);assert.equal(f.e.mechanic.phase,'recovery');assert.equal(f.e.mechanic.uses.M06,1);assert.equal(f.s.monsterMechanics.zones.length,0)})
test('no new circular danger begins with a warning clipped behind the viewport',()=>{const f=fixture(6);f.s.view={xmin:100,xmax:350,ymin:-100,ymax:100};f.s.player.x=190;tick(f,9);assert.equal(f.e.mechanic.uses.M07,0)})
test('expanding ring warning includes the inner area its first active frame will hit',()=>{
 const f=fixture(8);f.e.mechanic.cooldowns.M05=100;f.e.mechanic.cooldowns.M19=100
 tick(f,18.2)
 const z=f.s.monsterMechanics.zones.find(z=>z.skillId==='M15')
 assert.equal(z.phase,'windup');assert.equal(z.innerRadius,0)
})
test('checkpoint progress cannot refill a living temporary actor',()=>{
 const f=fixture(2);f.e.mechanic.cooldowns.M05=100;tick(f,22)
 const a=f.s.enemies.find(e=>e.temporary);a.hp=1
 const before=structuredClone(f.s),after=structuredClone(f.s)
 after.enemies.find(e=>e.id===a.id).hp=a.maxHp
 assert.equal(mod.validateMonsterMechanicsProgress(before,after),false)
})
test('mechanics-version snapshots cannot omit an elite or boss controller',()=>{
 const f=fixture();delete f.e.mechanic
 assert.equal(mod.validateMonsterMechanics(f.s),false)
})
test('enrage begins after windup, expires on simulation time, survives reload, and cannot be renewed',()=>{
 assert.equal(mod.MONSTER_SKILLS.M02.duration,15);
 const f=fixture();f.e.hp=1900;tick(f,.5);assert.equal(f.e.mechanic.enraged,false);
 tick(f,1.5);const m=f.e.mechanic,deadline=m.enrageUntil;assert.equal(m.enraged,true);assert.ok(deadline>f.s.time);
 const before=structuredClone(f.s);assert.equal(mod.validateMonsterMechanics(before),true);
 const forged=structuredClone(before);forged.enemies[0].mechanic.enrageUntil+=1;assert.equal(mod.validateMonsterMechanicsProgress(before,forged),false);
 mod.tickMonsterMechanics(f.run,[]);assert.equal(m.enrageUntil,deadline,'same simulation time must not refresh duration');
 f.s.time=deadline;mod.tickMonsterMechanics(f.run,[]);assert.equal(m.enraged,false);assert.equal(mod.monsterMovementMultiplier(f.run,f.e),1);
 assert.equal(mod.validateMonsterMechanics(f.s),true);assert.equal(mod.validateMonsterMechanicsProgress(before,f.s),true);
 tick(f,2);assert.equal(m.enraged,false);assert.equal(m.uses.M02,1);
});
test('death immediately ends enrage even before its timer expires',()=>{
 const f=fixture();f.e.hp=1900;tick(f,2);assert.equal(f.e.mechanic.enraged,true);
 f.e.hp=0;mod.onMonsterDeaths(f.run,[f.e]);assert.equal(f.e.mechanic.enraged,false);assert.equal(mod.monsterMovementMultiplier(f.run,f.e),1);
});

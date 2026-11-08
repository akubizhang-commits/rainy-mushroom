import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';
const source=stripTypeScriptTypes(readFileSync(new URL('../cocos-pilot/assets/scripts/TowerSlamArt.ts',import.meta.url),'utf8').replace(/^import .*$/gm,''),{mode:'transform'}).replace(/^export /gm,'');
class Painter{draw(s,c){this.s=s;this.camera=c;}destroy(){this.dead=true;}}
const Art=runInNewContext(source+';TowerSlamArt',{TowerShockwaveArt:Painter,TowerEarthWaveArt:Painter});
function state(family='bear',mode='active'){return{time:2,enemies:[{id:'o',hp:100,family,ai:{mode,until:mode==='windup'?3:2.18,attack:{id:'a',kind:'slam',shape:'circle',x:30,y:40,radius:150,startedAt:1,active:.18}}}],monsterMechanics:{zones:[{id:'unrelated'}]}};}
test('all slam families share original impact clock and contained geometry without touching state',()=>{
 for(const family of ['bear','ape','yak']){const art=new Art({}),s=state(family),before=JSON.stringify(s);art.draw(s,{x:5,y:6});const d=art.dust.s.monsterMechanics.zones[0],r=art.rubble.s.monsterMechanics.zones[0];assert.equal(JSON.stringify(s),before);assert.equal(d.x,30);assert.equal(d.y,40);assert.equal(d.radius,150);assert.ok(Math.abs(d.activatesAt-2)<1e-8);assert.equal(d.expiresAt,2.18);assert.ok(Math.hypot((r.toX-r.x)/2,r.width/2)<150);assert.equal((r.x+r.toX)/2,30);assert.equal(r.toY,40);const pose=JSON.stringify(art.dust.s);art.draw(s,{x:5,y:6});assert.equal(JSON.stringify(art.dust.s),pose);art.destroy();assert.ok(art.dust.dead&&art.rubble.dead);}
});
test('windup only preloads and cancelled, dead, expired or unrelated attacks clear both painters',()=>{
 const art=new Art({}),s=state('bear','windup');art.draw(s,{x:0,y:0});assert.ok(art.dust.s.monsterMechanics.zones[0].activatesAt>s.time);
 for(const change of [s=>s.enemies[0].hp=0,s=>s.enemies[0].family='tiger',s=>s.enemies[0].ai.mode='recovery',s=>s.enemies[0].ai.attack=null,s=>s.enemies[0].ai.attack.kind='charge',s=>s.time=2.18]){const s=state();change(s);art.draw(s,{x:0,y:0});assert.equal(art.dust.s.monsterMechanics.zones.length,0);assert.equal(art.rubble.s.monsterMechanics.zones.length,0);}
});

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { runInNewContext } from 'node:vm'
import { materialDrops } from '../js/xianxia/TowerMaterialLoot.js'
import { collectedMaterials, pickupRewards } from '../js/xianxia/TowerPickups.js'
import { CAMP_PILLS,cultivationAt } from '../js/xianxia/TowerProfile.js'
import { realmPoints } from '../js/xianxia/TowerGrowth.js'
import { ARCHETYPES } from '../js/xianxia/TowerContent.js'
const source=stripTypeScriptTypes(readFileSync(new URL('../cocos-pilot/assets/scripts/TowerView.ts',import.meta.url),'utf8').replace(/^import .*$/gm,''),{mode:'transform'}).replace(/^export /gm,'')
const View=runInNewContext(source+'\nTowerView',{materialDrops,collectedMaterials,CAMP_PILLS,cultivationAt,realmPoints,KeyCode:{}})
const boss=ARCHETYPES.find(a=>a.role==='boss').id
const receipt=id=>({id,wave:20,archetype:boss})
function fixture(){
 const host=Object.create(View.prototype),state={spiritState:{uses:[]},phase:'playing',time:10,floor:1,loot:{seed:7},pickups:{version:1,forgePity:{fa:0,bao:0,ling:0},collected:[]},killLedger:[receipt('old')],player:{xp:0,x:0,y:0},loadout:{active:{}}};
 Object.assign(host,{notices:[],breakthroughText:'',breakthroughUntil:0,training:false,screen:'battle',landscape:true,width:1280,height:720,stick:{dx:0,dy:0},touch:null,keys:new Set(),tools:{speed:1},saveElapsed:0,characterArt:{sample(){},observe(){},reset(){}},run:{state,setViewport(){},setInput(){},advance(dt){state.time+=dt;}},draw(){this.advanceNotice(state.time)}});
 return host;
}
test('kills stay quiet; only collected material receipts trigger merged notices without replay on load',()=>{
 const host=fixture();host.update(.01);assert.equal(host.notices.length,0);assert.equal(host.breakthroughText,'');
 let sequence=0;
 host.run.advance=dt=>{const s=host.run.state;s.time+=dt;s.killLedger.push(receipt(`new-${sequence++}`));};
 host.update(.01);assert.equal(host.breakthroughText,'');
 host.run.advance=dt=>{const s=host.run.state;s.time+=dt;s.killLedger.push(receipt(`new-${sequence++}`));
  s.pickups.collected.push(...pickupRewards(s,s.killLedger.length-1).map(r=>r.id));};
 host.update(.01);assert.match(host.breakthroughText,/材料 \+7/);assert.match(host.breakthroughText,/玉髓芝×2/);
 host.update(.01);host.update(.01);assert.equal(host.notices.length,1);assert.match(host.notices[0].text,/玉髓芝×4/);
});
test('training suppresses feedback and pause freezes notice time',()=>{
 const host=fixture();host.run.state.pickups.collected=pickupRewards(host.run.state).map(r=>r.id);
 host.training=true;host.queueMaterialNotice(host.run.state,0);assert.equal(host.notices.length,0);
 host.training=false;host.queueMaterialNotice(host.run.state,0);host.advanceNotice(10);
 const text=host.breakthroughText,until=host.breakthroughUntil;host.run.state.phase='paused';host.update(60);
 assert.equal(host.breakthroughText,text);assert.equal(host.breakthroughUntil,until);assert.equal(host.run.state.time,10);
 host.advanceNotice(12);assert.equal(host.breakthroughText,'');
});
test('clearing battle feedback discards all pending material notices',()=>{
 const host=fixture();host.queueMaterialNotice(host.run.state,0);
 for(const name of ['debuffIcons','targetDebuffIcons','sancaiArt','burstArt','qingpingAudio','arcArt','lineArt','convergenceArt','shadowArt','tiandiArt','hitArt','crossBurstArt','qiArt','orbitArt','formationArt','sixiangArt'])host[name]={reset(){}};
 host.ritualAudio={stop(){}};host.formationSprites=new Map();host.clearBattleFeedback();assert.equal(host.notices.length,0);assert.equal(host.breakthroughText,'');
});

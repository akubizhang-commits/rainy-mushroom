import test from 'node:test'
import assert from 'node:assert/strict'
import {TowerCampaignStore,combatLoadout} from '../js/xianxia/TowerCampaign.js'
import {TowerRun,stats,validateTowerSnapshot,characterCombatAttributes} from '../js/xianxia/TowerRun.js'
import {cultivationLevelXp} from '../js/xianxia/TowerProfile.js'
import {checksum} from '../js/xianxia/Checksum.js'
function store(){
 let raw=null,fail=false
 const disk={getItem:()=>raw,setItem:(_,v)=>{if(fail)throw Error('full');raw=v}}
 let s=new TowerCampaignStore(disk,0)
 // Derive the envelope from an actual save, not a retired schema literal.
 assert.ok(s.act({type:'sync'},0).ok)
 const env=JSON.parse(raw),data=structuredClone(s.state)
 Object.assign(data,{xp:cultivationLevelXp(21),mana:150,skills:{sj_arc:1,sj_spirit:3},skillsInitialized:true})
 env.data=JSON.stringify(data);env.checksum=checksum(env.data);raw=JSON.stringify(env)
 s=new TowerCampaignStore(disk,0);assert.equal(s.state.mana,150)
 return {s,disk,fail:()=>{fail=true}}
}
test('awareness unifies cast speed, mana capacity and recovery without spirit',()=>{
 const {s}=store(),l=combatLoadout(s.state),a=stats(s.state.xp,l)
 assert.equal(a.awareness,150);assert.equal(a.maxMana,150);assert.equal(a.manaRegen,4.5) // Approved 2026-11-05 combat recovery: 3% of max mana.
 assert.equal(characterCombatAttributes(l,s.state.xp).castSpeed,.5)
 assert.ok(!('spirit' in a))
})
test('refund and reset reduce excess mana atomically and persist',()=>{
 for(const action of [{type:'decreaseSkill',id:'sj_spirit'},{type:'respecSkills'}]){
  const {s,disk}=store(),result=s.act(action,0);assert.ok(result.ok,JSON.stringify(result))
  assert.equal(s.state.mana,action.type==='respecSkills'?120:140)
  assert.equal(new TowerCampaignStore(disk,0).state.mana,s.state.mana)
  const blocked=store(),before=blocked.s.state;blocked.fail();assert.equal(blocked.s.act(action,0).ok,false);assert.deepEqual(blocked.s.state,before)
 }
})
test('a cast retains original awareness speed when cultivation advances mid-cast',()=>{
 const {s}=store(),r=new TowerRun({attemptId:1,floor:1,seed:41,hp:100,xp:s.state.xp,training:true,loadout:combatLoadout(s.state)})
 r.setPlaytestAssist(true)
 for(let i=0;i<600&&!r.state.actions.current;i++)r.advance(1/60)
 assert.ok(r.state.actions.current)
 const speed=r.state.actions.current.speed;r.pause();r.setDeveloperCultivation(cultivationLevelXp(22))
 assert.equal(r.state.actions.current.speed,speed);assert.equal(r.state.player.awareness,151)
 assert.ok(validateTowerSnapshot(r.snapshot()))
 const restored=TowerRun.restore(r.snapshot());restored.resume();for(let i=0;i<60;i++)restored.advance(1/60)
 assert.ok(validateTowerSnapshot(restored.snapshot()))
})

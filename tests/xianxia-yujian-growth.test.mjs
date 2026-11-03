import { currentCampaignSchema } from './helpers/tower-schema.mjs'
import { assertCurrentCampaign } from './helpers/tower-current-state.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import {TowerRun} from '../js/xianxia/TowerRun.js'
import {TowerCampaignStore,TOWER_CAMPAIGN_KEY} from '../js/xianxia/TowerCampaign.js'
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`)
function shotBudget(rank){
 const r=new TowerRun({attemptId:1,floor:1,seed:7,xp:0,hp:100,training:true,loadout:{growthVersion:1,active:{sj_yujian:rank},passive:{},evolutions:[],evolutionLevels:{},tutorialWaves:0,weaponId:'eq_sword_suwen',weaponQuality:1,weaponRefine:0}})
 const s=r.state,p=s.player,interval=s.yujian.nextAt
 s.enemies=[{id:'target',x:p.x+200,y:p.y,hp:1e9,radius:8}]
 s.time=interval;r._growthSkills([],()=>{},p)
 s.time=s.casts[0].releaseAt;r._growthSkills([],()=>{},p)
 assert.equal(s.projectiles.length,1)
 return s.projectiles[0].damage/p.attack/interval
}
test('released swords retain early budgets and carry the approved high-rank growth',()=>{
 for(const [rank,budget] of [[1,1.2],[2,1.5],[3,1.8],[4,2.034],[10,4.234689864803]] )near(shotBudget(rank),budget)
})
test('schema60 resets only this mode and failed replacement keeps the old save intact',()=>{
 const data=new Map([['other-game','keep']]);let fail=false,writes=0
 const disk={getItem:k=>data.get(k)??null,setItem:(k,v)=>{if(fail)throw Error('full');data.set(k,v);writes++}}
 const initial=new TowerCampaignStore(disk,0);initial.act({type:'sync'},0)
 const env=JSON.parse(data.get(TOWER_CAMPAIGN_KEY));env.schema=60
 const old=JSON.stringify(env);data.set(TOWER_CAMPAIGN_KEY,old);writes=0;fail=true
 const blocked=new TowerCampaignStore(disk,0);assert.equal(blocked.error,'save-failed');assert.equal(data.get(TOWER_CAMPAIGN_KEY),old);assert.equal(writes,0);assert.equal(blocked.readOnly,true)
 fail=false;const reset=new TowerCampaignStore(disk,0);assert.equal(reset.migrationReport.reset,true)
 assert.equal(JSON.parse(data.get(TOWER_CAMPAIGN_KEY)).schema,currentCampaignSchema);assert.equal(data.get('other-game'),'keep')
 assert.equal(writes,1)
 assertCurrentCampaign(new TowerCampaignStore(disk,0),reset.state)
 assert.equal(writes,1,'reload does not reset or grant resources again')
})

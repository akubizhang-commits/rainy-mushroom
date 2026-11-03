import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {runInNewContext} from 'node:vm'
import {stripTypeScriptTypes} from 'node:module'
import {towerStorage,playtestStorage} from '../js/xianxia/TowerPlaytest.js'
import {TowerCampaignStore,TOWER_CAMPAIGN_KEY} from '../js/xianxia/TowerCampaign.js'
const profiles=()=>import('../scripts/build-profile.mjs')
const actions=['playtestResources','playtestNextStage','playtestAddSkillPoints','playtestReset','playtestSpiritStones','playtestContribution','playtestMaxLevel','playtestSkillPoints']
function memory(){const records=new Map();let writes=0;return {records,get writes(){return writes},getItem:k=>records.get(k)??null,setItem(k,v){writes++;records.set(k,v)}}}
function temporary(t){const root=mkdtempSync(join(tmpdir(),'rainy-capability-'));t.after(()=>rmSync(root,{recursive:true,force:true}));return root}

test('default tower storage rejects all tools even when underlying storage advertises permission',()=>{
 for(const supplied of [undefined,false,'qa',1,{}]){
  const disk=memory();disk.allowPlaytestTools=true;const adapter=towerStorage(disk,supplied),store=new TowerCampaignStore(adapter,0);
  assert.equal(adapter.allowPlaytestTools,false);assert.equal(store.allowPlaytestTools,false);assert.equal(store.act({type:'sync'},0).ok,true);
  const before=store.state,raw=disk.getItem(TOWER_CAMPAIGN_KEY),writes=disk.writes;
  for(const type of actions){assert.equal(store.act({type,grade:0},0).reason,'playtest-only',type);assert.equal(store.state,before)}
  assert.equal(disk.getItem(TOWER_CAMPAIGN_KEY),raw);assert.equal(disk.writes,writes);
 }
})
test('explicit QA storage and isolated logic adapter retain atomic developer actions',()=>{
 for(const adapterFactory of [disk=>towerStorage(disk,true),disk=>playtestStorage(disk)]){
  const disk=memory(),store=new TowerCampaignStore(adapterFactory(disk),0);assert.equal(store.act({type:'sync'},0).ok,true);
  const before=store.state;assert.equal(store.act({type:'playtestResources'},0).ok,true);assert.equal(store.state.spiritStones,before.spiritStones+999000000);
  const current=store.state;disk.setItem=()=>{throw Error('quota')};assert.equal(store.act({type:'playtestAddSkillPoints'},0).reason,'save-failed');assert.equal(store.state,current);
 }
})
test('build profile defaults to production and requires a single explicit valid flag',async()=>{
 const m=await profiles();assert.equal(m.profileFromArgs([]),'production');assert.equal(m.profileFromArgs(['web-mobile','--profile=qa']),'qa');assert.equal(m.profileFromArgs(['--profile','production']),'production');
 for(const args of [['--profile=dev'],['--profile'],['--profile=qa','--profile=production'],['--profile='],['--profile-qa']])assert.throws(()=>m.profileFromArgs(args),/profile/i);
})
test('generated capabilities are frozen and strictly validated against the declared build profile',async t=>{
 const m=await profiles(),root=temporary(t);assert.throws(()=>m.readBuildProfile(root),/ENOENT/);
 for(const profile of ['production','qa']){
  m.writeBuildCapabilities(root,profile);assert.equal(m.readBuildProfile(root),profile);
  const file=join(root,'cocos-pilot/assets/scripts/TowerBuildCapabilities.ts'),source=readFileSync(file,'utf8');
  const ctx={};runInNewContext(stripTypeScriptTypes(source,{mode:'transform'}).replace('export ','')+';globalThis.value=BUILD_CAPABILITIES',ctx);
  assert.equal(ctx.value.profile,profile);assert.equal(ctx.value.developerTools,profile==='qa');assert.equal(Object.isFrozen(ctx.value),true);
  writeFileSync(file,source.replace('Object.freeze(','('));assert.throws(()=>m.readBuildProfile(root),/capabilit|profile/i);
 }
 assert.throws(()=>m.writeBuildCapabilities(root,'dev'),/profile/i);
})

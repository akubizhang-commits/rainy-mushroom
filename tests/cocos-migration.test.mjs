import test from 'node:test'
import assert from 'node:assert/strict'
import {GameSession,FORAGING_SCENES,EXPLORATION_SPECIES} from '../js/cocos/GameSession.js'
import {mergeProfiles,loadMigratedProfile,GAME_SAVE_KEY} from '../js/cocos/ProfileMigration.js'
import {StorageService} from '../js/core/StorageService.js'
import {speciesSculpture} from '../js/cocos/SpeciesSculptures.js'
import {forestAnimal} from '../js/cocos/ForestAnimals.js'
import {BotanicalMesh} from '../js/cocos/BotanicalGeometry.js'
import {makeMushroom} from '../js/voxel/mushrooms.js'
import {normalize} from '../js/voxel/math.js'
const memory=()=>{const values=new Map();return {values,api:{getStorageSync:k=>values.get(k),setStorageSync:(k,v)=>values.set(k,structuredClone(v))}}}
test('migration merges old preview and pilot histories, preserving source saves and cooldowns',()=>{
 const {values,api}=memory(),id='amanita-muscaria';new StorageService(api,'rainy-preview:rainy-mushroom-exploration-v2').save({version:5,successfulChallenges:7,completedScenes:{'yn-pine':true},sceneDiscoveries:{'yn-pine':[id]},collection:{[id]:{seen:true,sampled:4,identified:true,regions:{yn:true}}}})
 new StorageService(api,'rainy-mushroom-cocos-pilot-v1').save({version:5,successfulChallenges:1,collection:{[id]:{seen:true,sampled:2,identified:false},'boletus-edulis':{seen:true,sampled:1,studiedClues:3,identificationLockedUntil:Date.now()+30000,identificationFailures:1}}})
 const original=structuredClone(values.get('rainy-preview:rainy-mushroom-exploration-v2')),loaded=loadMigratedProfile(api);assert.equal(loaded.profile.collection[id].sampled,4);assert.equal(loaded.profile.collection[id].identified,true);assert.equal(loaded.profile.successfulChallenges,7);assert.ok(loaded.profile.collection['boletus-edulis'].identificationLockedUntil>Date.now());assert.deepEqual(values.get('rainy-preview:rainy-mushroom-exploration-v2'),original)
 assert.ok(values.has(GAME_SAVE_KEY));assert.equal(loadMigratedProfile(api).imported,false)
})
test('damaged current save recovers its own backup before importing older progress',()=>{
 const {api,values}=memory(),storage=new StorageService(api,GAME_SAVE_KEY);storage.save({version:5,successfulChallenges:12});storage.save({version:5,successfulChallenges:13});values.set(GAME_SAVE_KEY,{format:'rainy-save-1',data:'bad',checksum:'bad'});assert.equal(loadMigratedProfile(api).profile.successfulChallenges,12)
})
test('navigation preserves collection page and returns from nested notes to detail',()=>{const {api}=memory(),s=new GameSession(api);s.region('yn');s.preview('yn-pine');s.start();s.collect(s.world.targets[0]);s.openCollection();s.collectionPage=3;const id=s.state.sceneData.spawns[0].speciesId;s.openSpecies(id);s.openJournal('notes');s.back();assert.equal(s.screen,'detail');s.back();assert.equal(s.screen,'collection');assert.equal(s.collectionPage,3);s.closeCollection();assert.equal(s.screen,'pause')})
test('explicit pagination starts at the top while detail return preserves collection position',()=>{
 const s=new GameSession(memory().api);s.state.profile.collection[EXPLORATION_SPECIES[0].id]={seen:true,sampled:1};s.openCollection();s.scrollPositions['collection:all:2']=600;s.paginate('collectionPage',2);
 assert.equal(s.collectionPage,2);assert.equal(s.scrollPositions['collection:all:2'],0);
 s.scrollPositions['collection:all:2']=180;s.openSpecies(EXPLORATION_SPECIES[0].id);s.open('credits');s.back();s.back();
 assert.equal(s.screen,'collection');assert.equal(s.collectionPage,2);assert.equal(s.scrollPositions['collection:all:2'],180);
 s.setFilter('pending');s.paginate('collectionPage',1);s.setFilter('all');assert.equal(s.collectionPage,2);
 s.paginate('screen',4);assert.equal(s.screen,'collection');s.paginate('collectionPage',-1);assert.equal(s.collectionPage,2);
})
test('journal distinguishes current exploration from home and can resume without restarting',()=>{
 const s=new GameSession(memory().api);s.openJournal();assert.equal(s.journalTab,'notes');assert.equal(s.hasOngoingExploration,false);s.back();
 s.start('relaxed','yn-pine');const world=s.world,run=s.state.currentRun;s.openJournal();assert.equal(s.journalTab,'routes');assert.equal(s.hasOngoingExploration,true);assert.equal(s.active,false);
 assert.equal(s.returnToExploration(),true);assert.equal(s.world,world);assert.equal(s.state.currentRun,run);assert.deepEqual(s.history,[]);
 s.pause();s.home();s.openJournal();assert.equal(s.hasOngoingExploration,false);assert.equal(s.journalTab,'notes');assert.equal(s.returnToExploration(),false);
})
test('opening another fungus from notes restores the original detail on back navigation',()=>{
 const s=new GameSession(memory().api),[a,b]=EXPLORATION_SPECIES;
 for(const sp of [a,b])s.state.profile.collection[sp.id]={seen:true,sampled:1,identified:true};
 s.openCollection();s.openSpecies(a.id);s.detailTab=2;s.state.collectionPhotoIndex=1;s.openJournal('notes');s.notePage=1;s.openSpecies(b.id);
 s.back();assert.equal(s.screen,'journal');assert.equal(s.notePage,1);
 s.back();assert.equal(s.screen,'detail');assert.equal(s.state.selectedCollectionSpeciesId,a.id);assert.equal(s.detailTab,2);assert.equal(s.state.collectionPhotoIndex,1);
})
for(const scene of FORAGING_SCENES)test('migrated habitat: '+scene.id,()=>{
 const {api}=memory(),s=new GameSession(api);s.start('relaxed',scene.id);assert.equal(s.world.targets.length,10);assert.ok(s.world.vertices.length/27<240000,'mobile geometry budget');assert.ok(s.world.surfaces.some(g=>g.kind==='ground'));assert.equal(s.world.surfaces.reduce((n,g)=>n+g.data.length,0),s.world.vertices.length)
 const w=s.world,queue=[[w.start.x,w.start.z]],seen=new Set([queue[0].join(',')]),reachable=[]
 for(let i=0;i<queue.length;i++){const [x,z]=queue[i];reachable.push([x,w.heightAt(x,z)+1.58,z]);for(const [dx,dz] of [[.5,0],[-.5,0],[0,.5],[0,-.5]]){const nx=x+dx,nz=z+dz,key=`${nx},${nz}`;if(seen.has(key))continue;seen.add(key);if(w.canStand(nx,nz)&&Math.abs(w.heightAt(nx,nz)-w.heightAt(x,z))<.5)queue.push([nx,nz])}}
 for(const t of w.targets)assert.ok(reachable.some(o=>Math.hypot(o[0]-t.anchor.x,o[2]-t.anchor.z)<3.5&&t.boxes.some(b=>w.pick(o,normalize(b.min.map((v,i)=>(v+b.max[i])/2-o[i])))?.id===t.id)),`${t.id}: reachable and selectable through actual refined geometry`)
 const start={...s.player};s.forward=1;s.tick(0);for(let i=1;i<=30;i++)s.tick(i*17);assert.ok(Math.hypot(s.player.x-start.x,s.player.z-start.z)>.05)
 for(const hit of s.world.targets){if(!s.active)break;s.collect(hit);s.collect(hit)}assert.equal(s.screen,'result');assert.equal(s.state.goalProgress,8);assert.ok(s.continueExploring());s.finish();assert.equal(s.state.lastResult.status,'success');assert.ok(s.state.profile.completedScenes[scene.id]);
})
test('every fungus has finite refined geometry and matching ray-test surfaces',()=>{
 for(const sp of EXPLORATION_SPECIES){const mesh=new BotanicalMesh(),target=makeMushroom({id:'test',count:1},sp,{x:0,y:0,z:0},()=>0,{mesh,sculpt:speciesSculpture});assert.ok(target.data.length>0,sp.id);assert.ok(target.data.every(Number.isFinite),sp.id);assert.ok(target.boxes.some(b=>b.triangles?.length),sp.id);for(let i=0;i<target.data.length;i+=9){const length=Math.hypot(...target.data.slice(i+3,i+6));assert.ok(length<1.01,sp.id)}}
})

test('articulated wildlife detail retains matching solid geometry and finite parts',()=>{for(const kind of ['deer','boar','yak','bear','wolf','tiger','squirrel']){const m=forestAnimal(kind);assert.equal(m.hips.length,4);for(const part of ['body','head','leg']){assert.ok(m[part].length>0,kind+part);assert.ok(m[part].every(Number.isFinite),kind+part)}assert.ok(m.bodyGeometry.length&&m.headGeometry.length);assert.ok((m.body.length+m.head.length+4*m.leg.length)/27<18000,kind+' geometry budget')}})

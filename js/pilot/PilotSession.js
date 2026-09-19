import { ForagingState } from '../core/ForagingState.js'
import { StorageService } from '../core/StorageService.js'
import { VoxelWorld } from '../voxel/VoxelWorld.js'
import { RunSession } from '../voxel/RunSession.js'
import { SPECIES_BY_ID } from '../data/explorationData.js'
export { SPECIES_BY_ID, EXPLORATION_SPECIES, getIdentificationClues } from '../data/explorationData.js'
export { SPECIES_KNOWLEDGE } from '../data/speciesKnowledge.js'
export { animalParts, animalMatrix } from '../voxel/animalPose.js'
export { buildSceneChunks } from '../voxel/SceneChunks.js'

// The pilot deliberately has its own save namespace. Existing release saves are never overwritten.
export const PILOT_SAVE_KEY='rainy-mushroom-cocos-pilot-v1'
export class PilotSession {
  constructor(api){
    this.storage=new StorageService(api,PILOT_SAVE_KEY)
    this.state=new ForagingState(this.storage.load())
    this.world=null;this.player=null;this.screen='start';this.feedback='';this.feedbackUntil=0
    this.session=new RunSession();this.side=0;this.forward=0;this.sprint=false
    this.controls={axes:()=>[this.side,this.forward],wantsSprint:()=>this.sprint}
    this.uiDirty=true;this.collectionPage=0;this.detailTab=0;this.lastPickup=null;this.suspended=false
  }
  get active(){return !this.adBusy&&this.screen==='field'&&!this.suspended&&!!this.world&&!this.state.currentRun?.completed}
  start(mode='relaxed'){
    this.state.startScene('yn-pine');this.state.startHunt(mode)
    this.world=new VoxelWorld(this.state.sceneData);this.player={...this.world.start}
    this.screen='field';this.side=this.forward=0;this.session.pause();this.lastPickup=null;this.feedback='';this.save()
  }
  tick(now){this.session.advance(this,now);this.storage.flushPending();if(this.feedbackUntil&&Date.now()>this.feedbackUntil)this.feedback=''}
  pause(){if(this.screen==='field'){this.screen='pause';this.stopInput()}}
  resume(){if(this.world&&!this.state.currentRun.completed){this.screen='field';this.session.pause()}}
  stopInput(){this.side=this.forward=0;this.sprint=false;this.state.pauseHunt();this.session.pause()}
  dismissHint(){this.state.currentRun.hasPanned=true}
  save(){const ok=this.storage.save(this.state.profile);if(!ok)this.notice('存档暂未保存，稍后重试');return ok}
  notice(text){this.feedback=text;this.feedbackUntil=Date.now()+3500;this.uiDirty=true}
  _showResult(result){this.screen='result';this.stopInput();this.save()}
  pick(origin,direction){
    if(!this.active)return null
    const r=this.state.currentRun
    return this.world.pick(origin,direction,[...r.basketSpawnIds,...r.eatenSpawnIds],4.8,r.revealedSpawnIds)
  }
  collect(hit){
    if(!hit||!this.active)return false
    const result=this.state.collectSpawn(hit.id)
    if(result.needsBrushing){this.state.brushSpawn(hit.id);this.notice('松针已拨开，再点一下采集');return false}
    if(!result.added)return false
    const spawn=this.state.sceneData.spawns.find(s=>s.id===hit.id),species=SPECIES_BY_ID[spawn.speciesId]
    const known=this.state.getCollectionEntry(species.id).identified
    this.lastPickup={speciesId:species.id,known,until:Date.now()+3000}
    this.notice(known?`采集到一朵${species.name}`:'采集到一朵菌物，可在收藏中鉴别')
    this.save();if(result.result)this._showResult(result.result)
    return true
  }
  jump(){if(this.active)this.world.jump(this.player)}
  crouch(){if(this.active&&(!this.player.crouched||this.world.canRise(this.player)))this.player.crouched=!this.player.crouched}
  openCollection(){this.returnScreen=this.screen==='field'?'pause':this.screen;this.screen='collection';this.stopInput()}
  closeCollection(){this.screen=this.returnScreen||'start'}
  openSpecies(id){this.state.selectCollectionSpecies(id);this.detailTab=0;this.screen='detail'}
  study(){this.state.studyCollection();this.save()}
  identify(id){const result=this.state.identifyCollection(id);this.notice(result.correct?'鉴别成功，图鉴知识已解锁':'再比较一下线索，稍后可以重试');this.save();return result}
}

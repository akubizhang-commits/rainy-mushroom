import { makePickupNotice } from './PickupNotice.js'
import { SPECIES_BY_ID } from '../data/explorationData.js'
import { ForagingApplication } from './ForagingApplication.js'
import { RunSession } from './RunSession.js'
import { FrameMetrics,cpuNow } from './FrameMetrics.js'
import { UiScheduler } from './UiScheduler.js'
import { EXPLORATION_SCREEN } from '../core/ExplorationState.js'
import { VoxelWorld } from './VoxelWorld.js'
import { VoxelRenderer } from './VoxelRenderer.js'
import { VoxelInput } from './VoxelInput.js'
import { drawVoxelHUD } from './VoxelHUD.js'
import { installForagingScreens } from './ForagingScreens.js'
import { screenRay } from './math.js'
import { findingNotes } from '../data/fieldJournal.js'

export class VoxelGame extends ForagingApplication {
  constructor(canvas,safeTop,platformApi,adConfig) {
    const graphics=new VoxelRenderer(canvas)
    const uiCanvas=platformApi.createCanvas()
    uiCanvas.width=canvas.width;uiCanvas.height=canvas.height
    const legacy={}, bridge=Object.create(platformApi)
    for(const name of ['Start','Move','End','Cancel']) bridge[`onTouch${name}`]=fn=>{legacy[name.toLowerCase()]=fn}
    super(uiCanvas,safeTop,bridge,adConfig)
    this.visibleCanvas=canvas;this.graphics=graphics;this.controls=new VoxelInput(this)
    this.renderer._explore=model=>drawVoxelHUD(this.renderer,model,this)
    installForagingScreens(this.renderer,this)
    this.uiDirty=true;this.nextAimAt=0;this.lastUiTick=null
    this.session=new RunSession();this.uiScheduler=new UiScheduler();this.metrics=new FrameMetrics()
    this.save()
    for(const name of ['Start','Move','End','Cancel']) {
      platformApi[`onTouch${name}`]?.(event=>{
        if(this.active) this.controls.event(name.toLowerCase(),event)
        else legacy[name.toLowerCase()]?.(event)
      })
    }
    platformApi.onHide?.(()=>{
      this.controls.reset();this.input._onCancel();this.input.start=null;this.input.lastPoint=null
      this.previousFrame=null;this.session.pause();this.state.pauseHunt();this.save()
      this.backgrounded=typeof platformApi.onShow==='function'
    })
    platformApi.onShow?.(()=>{this.backgrounded=false;this.previousFrame=null;this.session.pause();this.uiDirty=true})
    this._loop=this._loop.bind(this)
    this._requestFrame(this._loop)
  }
  get active() { return !this.backgrounded&&!this.graphics.lost&&this.screen===EXPLORATION_SCREEN.EXPLORE && this.state.currentRun?.huntStarted && !this.state.currentRun.completed }
  _handlePointer() { return null }
  _startScene(id) {
    this._settleBonus()
    super._startScene(id)
    this.pickupNotice=null
    this.world=new VoxelWorld(this.state.sceneData)
    for(const spawn of this.state.sceneData.spawns){
      if(this.state.getCollectionEntry(spawn.speciesId)?.identified)this.images.load(SPECIES_BY_ID[spawn.speciesId].photos[0])
    }
    this.player={...this.world.start}
    this.world.move(this.player,0,0,0)
    this.graphics.setWorld(this.world)
    this.controls.reset();this.session.pause()
    this.uiDirty=true;this.nextAimAt=0
    this.save()
  }
  handleAction(action) {
    try {
      if(action==='jump:up'){
        if(this.active&&this.world.jump(this.player)){this.nextAimAt=0;this.feedback='保持移动，跳过矮障碍'}
      }
      else if(action==='posture:toggle'){
        if(this.active&&this.player.crouched&&!this.world.canRise(this.player)){this.feedback='头顶有遮挡，移开后再站起';return}
        if(this.active){this.player.crouched=!this.player.crouched;this.player.sprinting=false;this.nextAimAt=0;this.feedback=this.player.crouched?'已蹲下，慢慢靠近观察':'已站起，推满摇杆可快跑'}
      }
      else if(action==='bonus:continue'){
        if(this.state.continueExploring()){
          this.screen=EXPLORATION_SCREEN.EXPLORE;this.controls.reset();this.previousFrame=null;this.session.pause();this.aim=null;this.nextAimAt=0
          this.feedback='收获已保存，左上角可随时结束探索';this.save()
        }
      }
      else if(action==='journal:back'){this.screen=this.journalReturn||EXPLORATION_SCREEN.COLLECTION;this.state.pauseHunt()}
      else if(action.startsWith('journal:')||action.startsWith('note:')){
        if(this.screen!==EXPLORATION_SCREEN.FIELD_JOURNAL)this.journalReturn=this.screen
        this.journalTab=action.startsWith('note:')?'notes':action.slice(8)
        this.notePage=Math.max(0,findingNotes(this.state.profile).findIndex(n=>n.speciesId===action.slice(5)))
        this.screen=EXPLORATION_SCREEN.FIELD_JOURNAL;this.state.pauseHunt()
      }
      else if(action.startsWith('journalTab:')){this.journalTab=action.slice(11)}
      else if(action.startsWith('notePage:')){this.notePage=Math.max(0,Math.min(findingNotes(this.state.profile).length-1,(this.notePage||0)+(action.endsWith('next')?1:-1)))}
      else if(action.startsWith('route:')){
        if(this.state.chooseRoute(action.slice(6))){this.screen=EXPLORATION_SCREEN.EXPLORE;this.state.pauseHunt();this.feedback='路线已选好，沿地面标记寻找路标'}
      }
      else if(action.startsWith('commission:')){this.state.changeCommission(action==='commission:skip');this.save()}
      else if(action.startsWith('pool:')){this.poolSceneId=action.slice(5);this.poolPage=0;this.screen=EXPLORATION_SCREEN.SCENE_SPECIES}
      else if(action.startsWith('resultPage:')){const pages=Math.max(1,Math.ceil((this.state.lastResult?.newSceneSpeciesIds?.length||0)/3));this.resultPage=Math.max(0,Math.min(pages-1,(this.resultPage||0)+(action.endsWith('next')?1:-1)))}
      else if(action.startsWith('poolPage:')){const pages=Math.ceil(this.state.sceneSpeciesProgress(this.poolSceneId).total/6);this.poolPage=Math.max(0,Math.min(pages-1,(this.poolPage||0)+(action.endsWith('next')?1:-1)))}
      else if(action.startsWith('collectionIdentify:')){
        const result=this.state.identifyCollection(action.slice('collectionIdentify:'.length))
        this.feedback=result.correct?'鉴别成功！已解锁图鉴知识与寻找笔记':''
        this.save()
      }else if(action==='collectionStudy:next'){this.state.studyCollection();this.save()}
      else if(action==='collectionPhoto:next'){this.state.collectionPhotoIndex++}
      else if(action==='nav:identify'||action.startsWith('identify:')||action.startsWith('risk:')||action.startsWith('basketRemove:')){this.feedback='到“菌物收藏”比较线索、鉴别名称'}
      else super.handleAction(action)
    }catch(error){this.feedback=error.message}
    if(!this.active){this.controls?.reset();this.session.pause()}
    this.uiDirty=true
    this.feedbackUntil=Date.now()+3500
  }
  _openFungus(id){
    const result=this.state.collectSpawn(id)
    if(result.needsBrushing){this.state.brushSpawn(id);this.feedback='已经露出来了，再点一下采集';this.uiDirty=true;this.nextAimAt=0;return}
    if(!result.added)return
    this.pickupNotice=makePickupNotice(this.state,id,result)
    if(this.pickupNotice.photo)this.images.load(this.pickupNotice.photo)
    this.feedback=''
    try{this.platformApi.vibrateShort?.({type:'light'})}catch{}
    this.nextAimAt=0;this.uiDirty=true
    this.save()
    if(result.result)this._showResult(result.result)
  }
  _settleBonus(){
    if(this.state.currentRun?.bonusStarted&&!this.state.currentRun.completed){this.state.finishScene();this.save()}
  }
  _navigate(target){
    if(['home','map','scenes'].includes(target))this._settleBonus()
    super._navigate(target)
    if(['home','map','scenes'].includes(target)){
      this.graphics.releaseWorld();this.world=null;this.player=null;this.aim=null;this.pickupNotice=null
      this.session.pause();this.images.beginFrame();this.images.endFrame()
    }
  }
  _showResult(result){
    this.resultPage=0
    if(result.bonusEndReason)this.screen=EXPLORATION_SCREEN.RESULT
    else super._showResult(result)
    this.controls?.reset();this.feedback='';this.uiDirty=true
  }
  dismissHint() { if(!this.state.currentRun.hasPanned){this.state.currentRun.hasPanned=true;this.uiDirty=true} }
  pickAt(x,y) {
    const run=this.state.currentRun,c=this.visibleCanvas
    return this.world.pick([this.player.x,this.player.y,this.player.z],screenRay(this.player,x,y,c.width,c.height,run.lensEnabled?.58:Math.PI/3),[...run.basketSpawnIds,...run.eatenSpawnIds],4.8,run.revealedSpawnIds)
  }
  inspectAt(x,y) { const hit=this.pickAt(x,y);if(hit) this.handleAction(`fungus:${hit.id}`) }
  _loop(timestamp) {
    const started=cpuNow()
    const now=timestamp ?? Date.now()
    this.previousFrame=now
    this.lastSimulationSteps=this.session.advance(this,now)
    if(this.active&&now>=this.nextAimAt){this.aim=this.pickAt(this.visibleCanvas.width/2,this.visibleCanvas.height/2);this.nextAimAt=now+100}
    const pending=this.storage.pending
    if(pending&&this.storage.flushPending()&&this.feedback==='存档暂未保存，正在重试'){
      this.feedback='存档已保存';this.feedbackUntil=Date.now()+2500;this.uiDirty=true
    }
    if(this.pickupNotice&&Date.now()>=this.pickupNotice.until){this.pickupNotice=null;this.uiDirty=true}
    if(this.feedback && this.feedbackUntil && Date.now()>this.feedbackUntil){this.feedback='';this.uiDirty=true}
    const updateUI=this.uiScheduler.needsUpdate(this)
    if(updateUI){
      this.images.beginFrame()
      this.renderer.render({screen:this.screen,state:this.state,feedback:this.feedback,collectionPage:this.collectionPage,
        ads:{rewardedAvailable:this.ads.rewardedAvailable,rewardedBusy:this.ads.rewardedBusy,
          rainBadgeClaimed:Boolean(this.state.profile.rainBadgeScenes[this.state.lastResult?.sceneId]),rainBadgeCount:this.state.rainBadgeCount}},now)
      this.images.endFrame()
      this.lastUiTick=now;this.uiDirty=false
    }
    this.graphics.render(this.player,this.state.currentRun,this.canvas,this.screen===EXPLORATION_SCREEN.EXPLORE,updateUI)
    this.metrics.record(now,cpuNow()-started)
    this._requestFrame(this._loop)
  }
}

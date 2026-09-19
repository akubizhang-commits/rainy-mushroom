import { SPECIES_KNOWLEDGE } from '../data/speciesKnowledge.js'
import { EXPLORATION_SCREEN } from '../core/ExplorationState.js'
import { ForagingState } from '../core/ForagingState.js'
import { AD_CONFIG } from '../config/adConfig.js'
import { AdService } from '../services/AdService.js'
import { StorageService } from '../core/StorageService.js'
import { ImageStore } from '../ui/ImageStore.js'
import { InputManager } from '../ui/InputManager.js'
import { ExplorationRenderer } from '../ui/ExplorationRenderer.js'
import { collectionItems } from '../ui/collectionItems.js'

// Platform, menus and persistence. No legacy field-identification game controller.
export class ForagingApplication {
  constructor(canvas,safeTop,platformApi,adConfig=AD_CONFIG){
    this.canvas=canvas;this.platformApi=platformApi
    this.storage=new StorageService(platformApi,'rainy-mushroom-exploration-v2')
    this.state=new ForagingState(this.storage.load())
    this.ads=new AdService(platformApi,adConfig)
    this.screen=EXPLORATION_SCREEN.HOME;this.feedback='';this.collectionPage=0
    this.collectionFilter='all';this.collectionPages={}
    this.images=new ImageStore(platformApi,canvas)
    this.renderer=new ExplorationRenderer(canvas,safeTop,this.images)
    this.input=new InputManager(canvas,()=>this.renderer.hitAreas,action=>this.handleAction(action),platformApi)
    this.input.onPressChange=action=>{this.renderer.pressedAction=action;this.uiDirty=true}
  }
  handleAction(action){
    const i=action.indexOf(':'),type=action.slice(0,i),value=action.slice(i+1)
    this.feedback=''
    if(type==='nav')this._navigate(value)
    else if(type==='region'){this.state.selectRegion(value);this.scenePage=0;this.screen=EXPLORATION_SCREEN.SCENES}
    else if(type==='scenePage'){const pages=Math.ceil((this.state.regionData?.sceneIds.length||0)/2);this.scenePage=Math.max(0,Math.min(pages-1,(this.scenePage||0)+(value==='prev'?-1:1)))}
    else if(type==='scene')this._startScene(value)
    else if(type==='hunt')this.state.startHunt(value)
    else if(type==='lens'&&value==='toggle')this.state.toggleLens()
    else if(type==='fungus')this._openFungus(value)
    else if(type==='finish'){const result=this.state.finishScene();this.save();this._showResult(result)}
    else if(type==='collection'){if(this.state.selectedCollectionSpecies?.id!==value)this.knowledgeTab=0;this.state.selectCollectionSpecies(value);this.screen=EXPLORATION_SCREEN.COLLECTION_DETAIL}
    else if(type==='knowledgeTab'&&this.screen===EXPLORATION_SCREEN.COLLECTION_DETAIL&&this.state.getCollectionEntry(this.state.selectedCollectionSpecies.id).identified&&/^[0-3]$/.test(value)){this.knowledgeTab=Number(value)}
    else if(type==='knowledgeSource'&&value==='copy')this._copyKnowledgeSource()
    else if(type==='collectionPage')this.collectionPage=Math.max(0,Math.min(Math.ceil(collectionItems(this.state,this.collectionFilter).length/6)-1,this.collectionPage+(value==='prev'?-1:1)))
    else if(type==='collectionFilter'&&['all','pending','identified'].includes(value)){
      this.collectionPages ||= {}
      this.collectionPages[this.collectionFilter||'all']=this.collectionPage
      this.collectionFilter=value
      this.collectionPage=Math.max(0,Math.min(this.collectionPages[value]||0,Math.ceil(collectionItems(this.state,value).length/6)-1))
    }
    else if(type==='ad'&&value==='rainBadge')this._claimRainBadgeWithAd().finally(()=>{this.uiDirty=true;this.feedbackUntil=Date.now()+3500})
  }
  _copyKnowledgeSource(){
    const species=this.state.selectedCollectionSpecies
    if(this.screen!==EXPLORATION_SCREEN.COLLECTION_DETAIL||!species||!this.state.getCollectionEntry(species.id).identified)return
    const source=SPECIES_KNOWLEDGE[species.id]?.source
    if(!source)return
    const finish=message=>{this.feedback=message;this.uiDirty=true;this.feedbackUntil=Date.now()+3500}
    const data=source.url
    if(this.platformApi?.setClipboardData){
      this.platformApi.setClipboardData({data,success:()=>finish('资料链接已复制'),fail:()=>finish('复制失败，请稍后重试')})
    }else if(typeof navigator!=='undefined'&&navigator.clipboard?.writeText){
      navigator.clipboard.writeText(data).then(()=>finish('资料链接已复制'),()=>finish('复制失败，请检查剪贴板权限'))
    }else finish('当前环境暂不支持复制链接')
  }
  _navigate(target){
    const screens={home:'HOME',map:'HOME',scenes:'SCENES',explore:'EXPLORE',pause:'PAUSE',basket:'BASKET',collection:'COLLECTION',guide:'GUIDE',sources:'SOURCES'}
    if(!screens[target])return
    if(target!=='explore')this.state.pauseHunt()
    if(target==='collection')this.collectionPage=Math.max(0,Math.min(this.collectionPage,Math.ceil(collectionItems(this.state,this.collectionFilter).length/6)-1))
    this.screen=EXPLORATION_SCREEN[screens[target]]
  }
  _startScene(id){this.state.startScene(id);this.scenePage=Math.floor(this.state.regionData.sceneIds.indexOf(id)/2);this.screen=EXPLORATION_SCREEN.EXPLORE}
  _showResult(result){
    this.screen=EXPLORATION_SCREEN.RESULT
    if(result.status==='success')this.ads.maybeShowInterstitial({successful:true}).catch(()=>{})
  }
  save(){
    const saved=this.storage.save(this.state.profile)
    if(!saved){this.feedback='存档暂未保存，正在重试';this.uiDirty=true}
    return saved
  }
  async _claimRainBadgeWithAd() {
    const sceneId = this.state.lastResult?.sceneId
    if (this.screen !== EXPLORATION_SCREEN.RESULT || !this.state.canClaimRainBadge(sceneId)) {
      this.feedback = '本场景暂无可领取的雨滴支持章'
      return { status: 'ineligible' }
    }
    if (this.ads.rewardedBusy) {
      this.feedback = '视频正在加载，请稍候'
      return { status: 'busy' }
    }

    this.feedback = '正在加载自愿观看视频…'
    let result
    try {
      result = await this.ads.showRewardedVideo()
    } catch (error) {
      result = { status: 'error', error }
    }
    if (result.status === 'rewarded' && this.state.claimRainBadge(sceneId)) {
      this.feedback = '已领取雨滴支持章，感谢支持生态调查'
      this.save()
    } else if (result.status === 'skipped') {
      this.feedback = '视频未完整播放，本次未领取雨滴支持章'
    } else if (result.status === 'busy') {
      this.feedback = '视频正在播放，请稍候'
    } else {
      this.feedback = '当前暂无可用视频，稍后再试'
    }
    return result
  }

  _requestFrame(callback) {
    if (typeof this.canvas.requestAnimationFrame === 'function') this.canvas.requestAnimationFrame(callback)
    else if (typeof this.platformApi.requestAnimationFrame === 'function') this.platformApi.requestAnimationFrame(callback)
    else setTimeout(() => callback(Date.now()), 33)
  }
}

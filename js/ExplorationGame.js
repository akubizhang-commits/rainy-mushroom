import { EXPLORATION_SPECIES } from './data/explorationData.js'
import { ExplorationState, EXPLORATION_SCREEN } from './core/ExplorationState.js'
import { AD_CONFIG } from './config/adConfig.js'
import { AdService } from './services/AdService.js'
import { StorageService } from './core/StorageService.js'
import { ImageStore } from './ui/ImageStore.js'
import { InputManager } from './ui/InputManager.js'
import { ExplorationRenderer } from './ui/ExplorationRenderer.js'
import { habitatGeometry } from './ui/HabitatView.js'

const SAVE_KEY = 'rainy-mushroom-exploration-v2'

export class ExplorationGame {
  constructor(canvas, safeTop, platformApi, adConfig = AD_CONFIG) {
    this.canvas = canvas
    this.platformApi = platformApi
    this.storage = new StorageService(platformApi, SAVE_KEY)
    this.state = new ExplorationState(this.storage.load())
    this.ads = new AdService(platformApi, adConfig)
    this.screen = EXPLORATION_SCREEN.HOME
    this.feedback = ''
    this.collectionPage = 0
    this.sceneGesture = null
    this.images = new ImageStore(platformApi, canvas)
    this.renderer = new ExplorationRenderer(canvas, safeTop, this.images)
    this.input = new InputManager(canvas, () => this.renderer.hitAreas, (action) => this.handleAction(action), platformApi, (pointer) => this._handlePointer(pointer))
    this.input.onPressChange = action => { this.renderer.pressedAction = action }
    if (typeof platformApi.onHide === 'function') platformApi.onHide(() => {
      this.sceneGesture = null
      this.input.start = null
      this.input.lastPoint = null
      this.state.pauseHunt()
      this.save()
    })
    this._loop = this._loop.bind(this)
    this._requestFrame(this._loop)
  }

  handleAction(action) {
    this.feedback = ''
    const separator = action.indexOf(':')
    const type = separator >= 0 ? action.slice(0, separator) : action
    const value = separator >= 0 ? action.slice(separator + 1) : ''
    try {
      if (type === 'nav') this._navigate(value)
      else if (type === 'region') this._selectRegion(value)
      else if (type === 'scene') this._startScene(value)
      else if (type === 'hunt') this._startHunt(value)
      else if (type === 'lens' && value === 'toggle') {
        this.state.toggleLens()
      }
      else if (type === 'fungus') this._openFungus(value)
      else if (type === 'photo') this._changePhoto(value)
      else if (type === 'clue') this._observeClue()
      else if (type === 'identify') this._identify(value)
      else if (type === 'observe') this._leaveObserved()
      else if (type === 'risk') this._markRisk()
      else if (type === 'basket' && value === 'add') this._addToBasket()
      else if (type === 'basketRemove') this._removeFromBasket(value)
      else if (type === 'finish') this._finishScene()
      else if (type === 'collection') this._openCollectionEntry(value)
      else if (type === 'collectionPage') this._changeCollectionPage(value)
      else if (type === 'ad' && value === 'rainBadge') return this._claimRainBadgeWithAd()
    } catch (error) {
      this.feedback = error.message || '操作暂时无法完成'
    }
  }

  _navigate(target) {
    if (target !== 'explore') this.state.pauseHunt()
    if (target === 'home') this.screen = EXPLORATION_SCREEN.HOME
    else if (target === 'map') this.screen = EXPLORATION_SCREEN.MAP
    else if (target === 'scenes') this.screen = EXPLORATION_SCREEN.SCENES
    else if (target === 'explore') this.screen = EXPLORATION_SCREEN.EXPLORE
    else if (target === 'identify') {
      if (!this.state.canIdentifySelected()) throw new Error('请先观察完整的三条特征线索')
      this.screen = EXPLORATION_SCREEN.IDENTIFY
    }
    else if (target === 'basket') this.screen = EXPLORATION_SCREEN.BASKET
    else if (target === 'collection') {
      this.screen = EXPLORATION_SCREEN.COLLECTION
    } else if (target === 'guide') this.screen = EXPLORATION_SCREEN.GUIDE
    else if (target === 'sources') this.screen = EXPLORATION_SCREEN.SOURCES
  }

  _selectRegion(regionId) {
    this.state.selectRegion(regionId)
    this.screen = EXPLORATION_SCREEN.SCENES
  }

  _startScene(sceneId) {
    this.state.startScene(sceneId)
    this.screen = EXPLORATION_SCREEN.EXPLORE
  }

  _startHunt(mode) {
    this.state.startHunt(mode)
    this.feedback = ''
  }

  _handlePointer(pointer) {
    const run = this.state.currentRun
    const active = this.screen === EXPLORATION_SCREEN.EXPLORE && run?.huntStarted && !run.completed
    if (pointer.type === 'cancel' || !active) {
      this.sceneGesture = null
      this.state.hideLens()
      return { consumeFungus: true }
    }
    const bounds = this.renderer.sceneBounds
    if (!bounds) return null
    const point = { x: pointer.x / this.renderer.scale, y: pointer.y / this.renderer.scale }
    const inside = pointer.x >= 0 && pointer.x <= bounds.w && pointer.y >= 0 && pointer.y <= bounds.h
    if (pointer.type === 'start') {
      const onControl = this.renderer.habitatControls?.some((area) =>
        point.x >= area.x && point.x <= area.x + area.w && point.y >= area.y && point.y <= area.y + area.h)
      if (!inside || onControl) { this.sceneGesture = null; return null }
      this.sceneGesture = { x: pointer.x, y: pointer.y, cameraX: run.cameraX, moved: false, lens: run.lensEnabled }
    }
    const gesture = this.sceneGesture
    if (!gesture) return { consumeFungus: true }
    const distance = Math.hypot(pointer.x - gesture.x, pointer.y - gesture.y)
    if (distance > 8) gesture.moved = true
    if (gesture.lens) this.state.showLensAt(pointer.x / bounds.w, pointer.y / bounds.h)
    else if (gesture.moved) {
      if (Math.abs(pointer.x - gesture.x) > 8) {
        run.hasPanned = true
        this.feedback = ''
      }
      const view = habitatGeometry(375, this.renderer.logicalHeight, gesture.cameraX, this.renderer.habitatView?.cropTop || 0)
      this.state.setCameraPosition(gesture.cameraX - (pointer.x - gesture.x) / this.renderer.scale / Math.max(1, view.travel))
    }
    if (pointer.type === 'end') {
      const action = inside && (!gesture.moved || gesture.lens)
        ? this.renderer.getFungusActionAt(pointer, this.state.sceneData, run) : null
      this.sceneGesture = null
      this.state.hideLens()
      if (action) this.handleAction(action)
    }
    return { consumeFungus: true, consumeAction: true }
  }

  _openFungus(spawnId) {
    const result = this.state.discover(spawnId)
    this.state.pauseHunt()
    this.feedback = this.state.selectedIdentified
      ? `发现一簇已鉴定菌物，共${result.spawn.count}朵`
      : result.firstDiscovery
        ? '发现一处未知菌物，搜索计时已暂停'
        : '再次查看这处未知菌物'
    this.save()
    this.screen = EXPLORATION_SCREEN.SPECIMEN
  }

  _observeClue() {
    const result = this.state.observeSelectedClue()
    this.feedback = result.complete
      ? `已切换至${result.clue.label}关联照片，三条线索已记录`
      : `已记录${result.clue.label}，自动切换至关联照片`
    this.save()
  }

  _identify(candidateId) {
    const result = this.state.identifySelected(candidateId)
    if (result.correct) {
      this.feedback = `鉴定成功：${result.species.name}`
      this.save()
      this.screen = EXPLORATION_SCREEN.SPECIMEN
    } else {
      this.feedback = '鉴定未通过，正确答案不会提前公布，请重新比较线索'
      this.save()
    }
  }

  _changePhoto(direction) {
    const delta = direction === 'prev' ? -1 : 1
    this.state.setPhotoIndex(this.state.currentRun.photoIndex + delta)
  }

  _leaveObserved() {
    if (!this.state.selectedIdentified) this.feedback = '未知菌物记录已保存，可以稍后继续鉴定'
    else this.feedback = this.state.selectedSpecies.observeOnly ? '已完成仅观察记录，未进行采集' : '已记录生态信息，标本留在原地'
    this.save()
    this.screen = EXPLORATION_SCREEN.EXPLORE
  }

  _markRisk() {
    const correct = this.state.markSelectedRisk()
    this.feedback = correct ? '已标记高风险并留在原地' : '已保留风险标记，报告将说明实际边界'
    this.save()
    this.screen = EXPLORATION_SCREEN.EXPLORE
  }

  _addToBasket() {
    const result = this.state.addSelectedToBasket()
    this.save()
    if (result.failed) {
      this._showResult(result.result)
      return
    }
    if (result.full && !result.goalReached) {
      this.feedback = '调查篮已满但朵数仍不足，请整理后继续'
      this.screen = EXPLORATION_SCREEN.BASKET
    } else {
      this.feedback = result.goalReached
        ? `已采集${result.count}朵，数量达标，请提交调查`
        : result.added ? `已采集这一簇，共${result.count}朵` : '这簇菌物已经在篮中'
      this.screen = EXPLORATION_SCREEN.EXPLORE
    }
  }

  _removeFromBasket(spawnId) {
    if (this.state.removeFromBasket(spawnId)) this.feedback = '已将这簇菌物移出调查篮'
    this.save()
  }

  _finishScene() {
    const result = this.state.finishScene()
    this.save()
    this._showResult(result)
  }

  _showResult(result) {
    this.screen = EXPLORATION_SCREEN.RESULT
    if (result.status === 'incomplete') this.feedback = '本次调查未达到采集或观察数量目标'
    else if (result.status === 'animal-timeout') this.feedback = `${result.animalName}先吃掉了剩余菌物，本次挑战失败`
    else if (result.status === 'risk-failure') this.feedback = '已识别高风险菌物仍被采集，本次挑战立即失败'
    else if (result.status === 'observation-rule-failure') this.feedback = '仅观察物种被尝试采集，本次挑战失败'
    if (result.status === 'success') this.ads.maybeShowInterstitial({ successful: true }).catch(() => {})
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

  _openCollectionEntry(speciesId) {
    this.state.selectCollectionSpecies(speciesId)
    this.screen = EXPLORATION_SCREEN.COLLECTION_DETAIL
  }

  _changeCollectionPage(direction) {
    const maxPage = Math.ceil(EXPLORATION_SPECIES.length / 6) - 1
    const delta = direction === 'prev' ? -1 : 1
    this.collectionPage = Math.max(0, Math.min(maxPage, this.collectionPage + delta))
  }

  save() {
    const saved = this.storage.save(this.state.profile)
    if (!saved) this.feedback = '本地档案保存失败，本次仍可继续'
    return saved
  }

  _loop(timestamp) {
    if (this.screen === EXPLORATION_SCREEN.EXPLORE) {
      const result = this.state.tickHunt(timestamp || Date.now())
      if (result) {
        this.save()
        this._showResult(result)
      }
    } else {
      this.state.pauseHunt()
    }
    this.renderer.render({
      screen: this.screen,
      state: this.state,
      feedback: this.feedback,
      collectionPage: this.collectionPage,
      ads: {
        rewardedAvailable: this.ads.rewardedAvailable,
        rewardedBusy: this.ads.rewardedBusy,
        rainBadgeClaimed: Boolean(this.state.profile.rainBadgeScenes[this.state.lastResult?.sceneId]),
        rainBadgeCount: this.state.rainBadgeCount
      }
    }, timestamp || Date.now())
    this._requestFrame(this._loop)
  }

  _requestFrame(callback) {
    if (typeof this.canvas.requestAnimationFrame === 'function') this.canvas.requestAnimationFrame(callback)
    else if (typeof this.platformApi.requestAnimationFrame === 'function') this.platformApi.requestAnimationFrame(callback)
    else setTimeout(() => callback(Date.now()), 33)
  }
}

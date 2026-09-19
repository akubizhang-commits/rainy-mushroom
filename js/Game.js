import { SCREEN } from './constants.js'
import { GameState } from './core/GameState.js'
import { StorageService } from './core/StorageService.js'
import { InputManager } from './ui/InputManager.js'
import { Renderer } from './ui/Renderer.js'

export class Game {
  constructor(canvas, safeTop, platformApi) {
    this.canvas = canvas
    this.platformApi = platformApi
    this.storage = new StorageService(platformApi)
    this.state = new GameState(this.storage.load())
    this.scene = SCREEN.HOME
    this.feedback = ''
    this.renderer = new Renderer(canvas, safeTop)
    this.input = new InputManager(
      canvas,
      () => this.renderer.hitAreas,
      (action) => this.handleAction(action),
      platformApi
    )

    if (typeof platformApi.onHide === 'function') {
      platformApi.onHide(() => this.save())
    }

    this._loop = this._loop.bind(this)
    this._requestFrame(this._loop)
  }

  handleAction(action) {
    this.feedback = ''
    const [type, value] = action.split(':')

    if (type === 'nav') {
      this._navigate(value)
    } else if (type === 'tool') {
      this.state.selectTool(value)
      this.feedback = '装备已放进竹篮'
      this.save()
    } else if (type === 'route') {
      this.state.startRun(value, Date.now())
      this.scene = SCREEN.EXPLORE
      this.save()
    } else if (type === 'observe') {
      const count = this.state.observe()
      this.feedback = count >= 3 ? '线索已经收集完整' : `已记录 ${count} 条线索`
    } else if (type === 'identify') {
      const result = this.state.identify(value)
      this.feedback = result.correct ? '辨识正确，图鉴记录已更新' : '判断不同，已保留正确记录供复查'
      this.scene = SCREEN.DECIDE
      this.save()
    } else if (type === 'decision') {
      const outcome = this.state.decide(value)
      this._afterEncounter(outcome)
    } else if (type === 'event') {
      const outcome = this.state.resolveEvent(value)
      this.feedback = '这片竹林记住了你的选择'
      this._afterEncounter(outcome)
    }
  }

  _navigate(target) {
    if (target === 'start' || target === 'routes') this.scene = SCREEN.ROUTES
    else if (target === 'home') this.scene = SCREEN.HOME
    else if (target === 'collection') this.scene = SCREEN.COLLECTION
    else if (target === 'guide') this.scene = SCREEN.GUIDE
    else if (target === 'identify' && this.state.canIdentify()) this.scene = SCREEN.IDENTIFY
  }

  _afterEncounter(outcome) {
    this.save()
    this.scene = outcome.completed ? SCREEN.RESULT : SCREEN.EXPLORE
  }

  save() {
    const saved = this.storage.save(this.state.profile)
    if (!saved) this.feedback = '本地存档失败，本次仍可继续'
    return saved
  }

  _loop(timestamp) {
    this.renderer.render({
      scene: this.scene,
      state: this.state,
      feedback: this.feedback
    }, timestamp || Date.now())
    this._requestFrame(this._loop)
  }

  _requestFrame(callback) {
    if (typeof this.canvas.requestAnimationFrame === 'function') {
      this.canvas.requestAnimationFrame(callback)
    } else if (typeof this.platformApi.requestAnimationFrame === 'function') {
      this.platformApi.requestAnimationFrame(callback)
    } else {
      setTimeout(() => callback(Date.now()), 33)
    }
  }
}

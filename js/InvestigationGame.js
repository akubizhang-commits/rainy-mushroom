import { INVESTIGATION_CASES } from './data/investigationCases.js'
import { InvestigationState, INVESTIGATION_SCREEN } from './core/InvestigationState.js'
import { StorageService } from './core/StorageService.js'
import { ImageStore } from './ui/ImageStore.js'
import { InputManager } from './ui/InputManager.js'
import { InvestigationRenderer } from './ui/InvestigationRenderer.js'

const SAVE_KEY = 'rainy-mushroom-investigation-v1'

export class InvestigationGame {
  constructor(canvas, safeTop, platformApi) {
    this.canvas = canvas
    this.platformApi = platformApi
    this.storage = new StorageService(platformApi, SAVE_KEY)
    this.state = new InvestigationState(this.storage.load())
    this.screen = INVESTIGATION_SCREEN.HOME
    this.feedback = ''
    this.images = new ImageStore(platformApi, canvas)
    const paths = INVESTIGATION_CASES.flatMap((item) => item.evidence.map((evidence) => evidence.image))
    this.images.preload([...new Set(paths)])
    this.renderer = new InvestigationRenderer(canvas, safeTop, this.images)
    this.input = new InputManager(canvas, () => this.renderer.hitAreas, (action) => this.handleAction(action), platformApi)

    if (typeof platformApi.onHide === 'function') platformApi.onHide(() => this.save())
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
      else if (type === 'case') this._startCase(value)
      else if (type === 'evidence') this._selectEvidence(value)
      else if (type === 'candidate') this.state.selectCandidate(value)
      else if (type === 'keyEvidence') this._answerKeyEvidence(value)
      else if (type === 'conclusion') this._conclude(value)
      else if (type === 'myth') this._answerMyth(value)
    } catch (error) {
      this.feedback = error.message || '操作暂时无法完成'
    }
  }

  _navigate(target) {
    if (target === 'home') this.screen = INVESTIGATION_SCREEN.HOME
    else if (target === 'archive') this.screen = INVESTIGATION_SCREEN.ARCHIVE
    else if (target === 'guide') this.screen = INVESTIGATION_SCREEN.GUIDE
    else if (target === 'credits') this.screen = INVESTIGATION_SCREEN.CREDITS
    else if (target === 'evidence') this.screen = INVESTIGATION_SCREEN.EVIDENCE
    else if (target === 'compare') {
      this.state.openComparison()
      this.screen = INVESTIGATION_SCREEN.COMPARE
    } else if (target === 'key-evidence') {
      if (!this.state.currentRun?.selectedCandidateId) throw new Error('请先选择一个初步候选')
      this.screen = INVESTIGATION_SCREEN.KEY_EVIDENCE
    } else if (target === 'conclude') {
      if (!this.state.currentRun?.keyEvidenceAnswerId) throw new Error('请先判断哪条证据最关键')
      this.screen = INVESTIGATION_SCREEN.CONCLUDE
    }
  }

  _startCase(caseId) {
    this.state.startCase(caseId)
    this.screen = INVESTIGATION_SCREEN.BRIEFING
  }

  _selectEvidence(evidenceId) {
    const result = this.state.selectEvidence(evidenceId)
    this.feedback = result.added ? `已取得：${result.evidence.label}` : `正在复查：${result.evidence.label}`
  }

  _answerKeyEvidence(optionId) {
    this.state.answerKeyEvidence(optionId)
    this.screen = INVESTIGATION_SCREEN.CONCLUDE
  }

  _conclude(type) {
    this.state.submitConclusion(type)
    this.screen = INVESTIGATION_SCREEN.SAFETY
  }

  _answerMyth(optionId) {
    this.state.answerMyth(optionId)
    this.save()
    this.screen = INVESTIGATION_SCREEN.REPORT
  }

  save() {
    const saved = this.storage.save(this.state.profile)
    if (!saved) this.feedback = '本地档案保存失败，本次仍可继续'
    return saved
  }

  _loop(timestamp) {
    this.renderer.render({ screen: this.screen, state: this.state, feedback: this.feedback }, timestamp || Date.now())
    this._requestFrame(this._loop)
  }

  _requestFrame(callback) {
    if (typeof this.canvas.requestAnimationFrame === 'function') this.canvas.requestAnimationFrame(callback)
    else if (typeof this.platformApi.requestAnimationFrame === 'function') this.platformApi.requestAnimationFrame(callback)
    else setTimeout(() => callback(Date.now()), 33)
  }
}

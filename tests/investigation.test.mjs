import test from 'node:test'
import assert from 'node:assert/strict'

import { INVESTIGATION_CASES } from '../js/data/investigationCases.js'
import { InvestigationState, INVESTIGATION_SCREEN } from '../js/core/InvestigationState.js'
import { ImageStore } from '../js/ui/ImageStore.js'
import { InvestigationRenderer } from '../js/ui/InvestigationRenderer.js'
import { InvestigationGame } from '../js/InvestigationGame.js'

const CASE_ID = INVESTIGATION_CASES[0].id
const ANSWER_ID = INVESTIGATION_CASES[0].answerId

function takeOptimalEvidence(state) {
  state.selectEvidence('underside')
  state.selectEvidence('sporeprint')
  state.selectEvidence('habitat')
  assert.equal(state.currentRun.pointsLeft, 0)
}

function finishOptimalRun(state) {
  takeOptimalEvidence(state)
  state.openComparison()
  state.selectCandidate(ANSWER_ID)
  state.answerKeyEvidence(state.caseData.keyEvidenceQuestion.answerId)
  state.submitConclusion('submit')
  return state.answerMyth(state.currentMyth.answerId)
}

test('investigation enforces four action points and allows reviewing evidence for free', () => {
  const state = new InvestigationState()
  state.startCase(CASE_ID)
  const first = state.selectEvidence('sporeprint')
  assert.equal(first.added, true)
  assert.equal(state.currentRun.pointsLeft, 2)
  const review = state.selectEvidence('sporeprint')
  assert.equal(review.added, false)
  assert.equal(state.currentRun.pointsLeft, 2)
  state.selectEvidence('underside')
  state.selectEvidence('habitat')
  assert.equal(state.currentRun.pointsLeft, 0)
  assert.throws(() => state.selectEvidence('specimen'), /points/i)
})

test('comparison requires two evidence items and conclusion requires a candidate plus key evidence answer', () => {
  const state = new InvestigationState()
  state.startCase(CASE_ID)
  state.selectEvidence('habitat')
  assert.equal(state.canCompare(), false)
  assert.throws(() => state.openComparison(), /two pieces/)
  state.selectEvidence('specimen')
  state.openComparison()
  assert.throws(() => state.submitConclusion('submit'), /candidate/)
  state.selectCandidate(ANSWER_ID)
  assert.throws(() => state.submitConclusion('submit'), /key evidence/i)
  state.answerKeyEvidence(state.caseData.keyEvidenceQuestion.answerId)
  assert.doesNotThrow(() => state.submitConclusion('review'))
})

test('optimal evidence, correct candidate and safety answer can score 100', () => {
  const state = new InvestigationState()
  state.startCase(CASE_ID)
  const report = finishOptimalRun(state)
  assert.deepEqual(report.score, {
    evidence: 30,
    hypothesis: 15,
    keyEvidence: 20,
    conclusion: 20,
    safety: 15,
    total: 100,
    decisiveComplete: true,
    candidateCorrect: true,
    keyEvidenceCorrect: true,
    safetyCorrect: true
  })
  assert.equal(state.profile.completedCases, 1)
  assert.equal(state.profile.bestScores[CASE_ID], 100)
  assert.equal(state.profile.unlockedReports[CASE_ID], true)
})

test('review earns full conclusion credit only when decisive evidence is missing', () => {
  const state = new InvestigationState()
  state.startCase(CASE_ID)
  state.selectEvidence('habitat')
  state.selectEvidence('specimen')
  state.selectEvidence('sporeprint')
  state.openComparison()
  state.selectCandidate(ANSWER_ID)
  state.answerKeyEvidence(state.caseData.keyEvidenceQuestion.answerId)
  state.submitConclusion('review')
  const report = state.answerMyth(state.currentMyth.answerId)
  assert.equal(report.score.decisiveComplete, false)
  assert.equal(report.score.conclusion, 20)
  assert.ok(report.score.total < 100)
  assert.equal(
    report.score.total,
    report.score.evidence + report.score.hypothesis + report.score.keyEvidence + report.score.conclusion + report.score.safety
  )

  const complete = new InvestigationState()
  complete.startCase(CASE_ID)
  takeOptimalEvidence(complete)
  complete.openComparison()
  complete.selectCandidate(ANSWER_ID)
  complete.answerKeyEvidence(complete.caseData.keyEvidenceQuestion.answerId)
  complete.submitConclusion('review')
  const completeReport = complete.answerMyth(complete.currentMyth.answerId)
  assert.equal(completeReport.score.decisiveComplete, true)
  assert.equal(completeReport.score.conclusion, 8)
})

test('candidate assessment exposes support, conflict and missing without revealing correctness', () => {
  const state = new InvestigationState()
  state.startCase(CASE_ID)
  state.selectEvidence('sporeprint')
  state.selectEvidence('habitat')
  state.openComparison()
  const wrong = state.caseData.candidates.find((candidate) => candidate.id !== ANSWER_ID)
  state.selectCandidate(wrong.id)
  const assessment = state.assessCandidate()
  assert.equal(assessment.statuses.sporeprint, 'conflict')
  assert.equal(assessment.statuses.specimen, 'missing')
  assert.equal(assessment.statuses.habitat, 'support')
  assert.equal('correct' in assessment, false)
})

test('wrong key evidence answer prevents a perfect score', () => {
  const state = new InvestigationState()
  state.startCase(CASE_ID)
  takeOptimalEvidence(state)
  state.openComparison()
  state.selectCandidate(ANSWER_ID)
  const wrongOption = state.caseData.keyEvidenceQuestion.options.find((option) => option.id !== state.caseData.keyEvidenceQuestion.answerId)
  state.answerKeyEvidence(wrongOption.id)
  state.submitConclusion('submit')
  const report = state.answerMyth(state.currentMyth.answerId)
  assert.equal(report.score.keyEvidence, 0)
  assert.equal(report.score.keyEvidenceCorrect, false)
  assert.equal(report.score.total, 80)
})

test('repeated completion keeps unique case and safety mastery counts', () => {
  const state = new InvestigationState()
  state.startCase(CASE_ID)
  finishOptimalRun(state)
  state.startCase(CASE_ID)
  finishOptimalRun(state)
  state.startCase(CASE_ID)
  finishOptimalRun(state)
  assert.equal(state.profile.completedCases, 1)
  assert.equal(state.profile.attempts[CASE_ID], 3)
  assert.equal(state.profile.safetyAnswers, 2)
  assert.equal(Object.keys(state.profile.masteredMyths).length, 2)
})

test('image store loads local assets through wx.createImage', () => {
  const created = []
  const platform = {
    createImage() {
      const image = { width: 1280, height: 900, onload: null, onerror: null }
      Object.defineProperty(image, 'src', {
        set(value) {
          image.path = value
          if (image.onload) image.onload()
        }
      })
      created.push(image)
      return image
    }
  }
  const store = new ImageStore(platform)
  const record = store.load('assets/example.jpg')
  assert.equal(record.status, 'ready')
  assert.equal(record.image.path, 'assets/example.jpg')
  assert.equal(store.load('assets/example.jpg'), record)
  assert.equal(created.length, 1)
})

function createMockContext() {
  const gradient = { addColorStop() {} }
  const methods = [
    'setTransform', 'clearRect', 'fillRect', 'save', 'restore', 'beginPath', 'moveTo',
    'lineTo', 'quadraticCurveTo', 'bezierCurveTo', 'stroke', 'fill', 'rect', 'clip',
    'arc', 'ellipse', 'translate', 'rotate', 'closePath', 'fillText', 'drawImage'
  ]
  const context = {
    createLinearGradient: () => gradient,
    measureText: (text) => ({ width: Array.from(String(text)).length * 9 })
  }
  methods.forEach((method) => { context[method] = () => {} })
  return context
}

function createReadyImageStore() {
  return {
    get(path) {
      return { path, status: 'ready', image: { width: 1280, height: 900 } }
    }
  }
}

test('all real investigation screens render with actionable controls', () => {
  const canvas = { width: 375, height: 812, getContext: () => createMockContext() }
  const renderer = new InvestigationRenderer(canvas, 78, createReadyImageStore())
  const state = new InvestigationState()
  const render = (screen) => assert.doesNotThrow(() => renderer.render({ screen, state, feedback: '' }, 1000))

  render(INVESTIGATION_SCREEN.HOME)
  assert.ok(renderer.hitAreas.some((area) => area.action === `case:${CASE_ID}`))
  render(INVESTIGATION_SCREEN.ARCHIVE)
  render(INVESTIGATION_SCREEN.GUIDE)
  render(INVESTIGATION_SCREEN.CREDITS)

  state.startCase(CASE_ID)
  render(INVESTIGATION_SCREEN.BRIEFING)
  render(INVESTIGATION_SCREEN.EVIDENCE)
  takeOptimalEvidence(state)
  render(INVESTIGATION_SCREEN.EVIDENCE)
  assert.ok(renderer.hitAreas.some((area) => area.action === 'nav:compare'))
  state.openComparison()
  render(INVESTIGATION_SCREEN.COMPARE)
  state.selectCandidate(ANSWER_ID)
  render(INVESTIGATION_SCREEN.COMPARE)
  assert.ok(renderer.hitAreas.some((area) => area.action === 'nav:key-evidence'))
  render(INVESTIGATION_SCREEN.KEY_EVIDENCE)
  assert.ok(state.caseData.keyEvidenceQuestion.options.every((option) => renderer.hitAreas.some((area) => area.action === `keyEvidence:${option.id}`)))
  state.answerKeyEvidence(state.caseData.keyEvidenceQuestion.answerId)
  render(INVESTIGATION_SCREEN.CONCLUDE)
  assert.ok(renderer.hitAreas.some((area) => area.action === 'conclusion:submit'))
  assert.ok(renderer.hitAreas.some((area) => area.action === 'conclusion:review'))
  state.submitConclusion('submit')
  render(INVESTIGATION_SCREEN.SAFETY)
  state.answerMyth(state.currentMyth.answerId)
  render(INVESTIGATION_SCREEN.REPORT)
})

function createPlatform() {
  const memory = new Map()
  return {
    onTouchStart() {}, onTouchEnd() {}, onTouchCancel() {}, onHide() {},
    getStorageSync: (key) => memory.get(key),
    setStorageSync: (key, value) => memory.set(key, value),
    removeStorageSync: (key) => memory.delete(key),
    createImage() {
      const image = { width: 1280, height: 900, onload: null, onerror: null }
      Object.defineProperty(image, 'src', { set() { if (image.onload) image.onload() } })
      return image
    }
  }
}

test('game coordinator completes the real case from briefing to report', () => {
  const canvas = {
    width: 375,
    height: 812,
    getContext: () => createMockContext(),
    requestAnimationFrame: () => {}
  }
  const game = new InvestigationGame(canvas, 78, createPlatform())
  game.handleAction(`case:${CASE_ID}`)
  assert.equal(game.screen, INVESTIGATION_SCREEN.BRIEFING)
  game.handleAction('nav:evidence')
  game.handleAction('evidence:underside')
  game.handleAction('evidence:sporeprint')
  game.handleAction('evidence:habitat')
  game.handleAction('nav:compare')
  game.handleAction(`candidate:${ANSWER_ID}`)
  game.handleAction('nav:key-evidence')
  assert.equal(game.screen, INVESTIGATION_SCREEN.KEY_EVIDENCE)
  game.handleAction(`keyEvidence:${game.state.caseData.keyEvidenceQuestion.answerId}`)
  assert.equal(game.screen, INVESTIGATION_SCREEN.CONCLUDE)
  game.handleAction('conclusion:submit')
  assert.equal(game.screen, INVESTIGATION_SCREEN.SAFETY)
  game.handleAction(`myth:${game.state.currentMyth.answerId}`)
  assert.equal(game.screen, INVESTIGATION_SCREEN.REPORT)
  assert.equal(game.state.lastReport.score.total, 100)
})


test('report states the result, player choice, case answer and key reason before score', () => {
  const drawnText = []
  const context = createMockContext()
  context.fillText = (text) => drawnText.push(String(text))
  const canvas = { width: 375, height: 812, getContext: () => context }
  const renderer = new InvestigationRenderer(canvas, 78, createReadyImageStore())
  const state = new InvestigationState()
  state.startCase(CASE_ID)
  finishOptimalRun(state)
  renderer.render({ screen: INVESTIGATION_SCREEN.REPORT, state, feedback: '' }, 1000)
  assert.ok(drawnText.includes('判断正确'))
  assert.ok(drawnText.some((text) => text.startsWith('你的选择：提交判断：')))
  assert.ok(drawnText.some((text) => text.startsWith('案例答案：')))
  assert.ok(drawnText.includes('关键原因'))
  assert.ok(drawnText.includes('取证'))
  assert.ok(drawnText.includes('关键证据'))
  assert.ok(drawnText.includes('高分 ≠ 现实鉴定能力'))
})

test('report uses the four explicit result categories across submit and review branches', () => {
  const renderResult = (evidenceIds, candidateId, conclusionType) => {
    const drawnText = []
    const context = createMockContext()
    context.fillText = (text) => drawnText.push(String(text))
    const renderer = new InvestigationRenderer({ width: 375, height: 812, getContext: () => context }, 78, createReadyImageStore())
    const state = new InvestigationState()
    state.startCase(CASE_ID)
    evidenceIds.forEach((id) => state.selectEvidence(id))
    state.openComparison()
    state.selectCandidate(candidateId)
    state.answerKeyEvidence(state.caseData.keyEvidenceQuestion.answerId)
    state.submitConclusion(conclusionType)
    state.answerMyth(state.currentMyth.answerId)
    renderer.render({ screen: INVESTIGATION_SCREEN.REPORT, state, feedback: '' }, 1000)
    return drawnText
  }
  const complete = ['underside', 'sporeprint', 'habitat']
  const incomplete = ['habitat', 'specimen', 'sporeprint']
  const wrongCandidate = INVESTIGATION_CASES[0].candidates.find((candidate) => candidate.id !== ANSWER_ID).id

  assert.ok(renderResult(complete, ANSWER_ID, 'submit').includes('判断正确'))
  assert.ok(renderResult(incomplete, ANSWER_ID, 'submit').includes('方向正确，但证据不足'))
  assert.ok(renderResult(complete, wrongCandidate, 'submit').includes('判断错误'))
  assert.ok(renderResult(incomplete, ANSWER_ID, 'review').includes('谨慎判断正确'))
  assert.ok(renderResult(complete, ANSWER_ID, 'review').includes('谨慎判断正确'))
})

test('portrait evidence uses contain mode without cropping source pixels', () => {
  const drawCalls = []
  const context = createMockContext()
  context.drawImage = (...args) => drawCalls.push(args)
  const canvas = { width: 375, height: 812, getContext: () => context }
  const image = { width: 1000, height: 1600 }
  const renderer = new InvestigationRenderer(canvas, 78, {
    get: () => ({ status: 'ready', image })
  })
  renderer._photo('portrait.jpg', 20, 100, 335, 212, { fit: 'contain' })
  assert.equal(drawCalls.length, 1)
  assert.deepEqual(drawCalls[0].slice(1, 5), [0, 0, 1000, 1600])
  assert.ok(drawCalls[0][5] > 20, 'contained portrait should be horizontally centered')
  assert.equal(drawCalls[0][8], 212)
})


test('three investigation cases have valid evidence, candidates and local assets', () => {
  assert.equal(INVESTIGATION_CASES.length, 3)
  INVESTIGATION_CASES.forEach((item) => {
    assert.equal(item.actionPoints, 4)
    assert.equal(item.candidates.length, 3)
    assert.ok(item.candidates.some((candidate) => candidate.id === item.answerId))
    assert.equal(item.comparisonRows.length, 4)
    assert.ok(item.keyEvidenceQuestion.question)
    assert.ok(item.keyEvidenceQuestion.explanation)
    assert.equal(item.keyEvidenceQuestion.options.length, 3)
    assert.ok(item.keyEvidenceQuestion.options.some((option) => option.id === item.keyEvidenceQuestion.answerId))
    const evidenceIds = new Set(item.evidence.map((evidence) => evidence.id))
    item.decisiveEvidence.forEach((id) => assert.ok(evidenceIds.has(id), `${item.id} missing ${id}`))
    item.comparisonRows.forEach((row) => {
      assert.ok(evidenceIds.has(row.evidenceId), `${item.id} row missing evidence ${row.evidenceId}`)
      item.candidates.forEach((candidate) => assert.ok(candidate.rows[row.rowKey], `${item.id} candidate missing ${row.rowKey}`))
    })
  })
})

test('every investigation case has a playable 100-point route', () => {
  const state = new InvestigationState()
  INVESTIGATION_CASES.forEach((item) => {
    state.startCase(item.id)
    item.decisiveEvidence.forEach((id) => state.selectEvidence(id))
    item.evidence.forEach((evidence) => {
      if (!state.hasEvidence(evidence.id) && evidence.cost <= state.currentRun.pointsLeft) {
        state.selectEvidence(evidence.id)
      }
    })
    assert.equal(state.currentRun.pointsLeft, 0, `${item.id} should spend all action points`)
    state.openComparison()
    state.selectCandidate(item.answerId)
    state.answerKeyEvidence(item.keyEvidenceQuestion.answerId)
    state.submitConclusion('submit')
    const report = state.answerMyth(state.currentMyth.answerId)
    assert.equal(report.score.total, 100, `${item.id} should have a 100-point route`)
  })
  assert.equal(state.profile.completedCases, 3)
})

test('home recommends the next unfinished case and archive exposes all cases', () => {
  const canvas = { width: 375, height: 812, getContext: () => createMockContext() }
  const renderer = new InvestigationRenderer(canvas, 78, createReadyImageStore())
  const state = new InvestigationState()

  renderer.render({ screen: INVESTIGATION_SCREEN.HOME, state, feedback: '' }, 1000)
  assert.ok(renderer.hitAreas.some((area) => area.action === `case:${INVESTIGATION_CASES[0].id}`))

  state.startCase(INVESTIGATION_CASES[0].id)
  finishOptimalRun(state)
  renderer.render({ screen: INVESTIGATION_SCREEN.HOME, state, feedback: '' }, 1000)
  assert.ok(renderer.hitAreas.some((area) => area.action === `case:${INVESTIGATION_CASES[1].id}`))

  renderer.render({ screen: INVESTIGATION_SCREEN.ARCHIVE, state, feedback: '' }, 1000)
  const caseActions = renderer.hitAreas.filter((area) => area.action.startsWith('case:'))
  assert.equal(caseActions.length, 3)
})

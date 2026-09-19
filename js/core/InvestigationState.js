import { CASE_BY_ID } from '../data/investigationCases.js'

export const INVESTIGATION_SCREEN = Object.freeze({
  HOME: 'investigation-home',
  BRIEFING: 'investigation-briefing',
  EVIDENCE: 'investigation-evidence',
  COMPARE: 'investigation-compare',
  KEY_EVIDENCE: 'investigation-key-evidence',
  CONCLUDE: 'investigation-conclude',
  SAFETY: 'investigation-safety',
  REPORT: 'investigation-report',
  ARCHIVE: 'investigation-archive',
  GUIDE: 'investigation-guide',
  CREDITS: 'investigation-credits'
})

export function createInvestigationProfile() {
  return {
    version: 1,
    completedCases: 0,
    bestScores: {},
    attempts: {},
    unlockedReports: {},
    masteredMyths: {},
    safetyAnswers: 0
  }
}

export function sanitizeInvestigationProfile(raw) {
  const defaults = createInvestigationProfile()
  if (!raw || typeof raw !== 'object') return defaults
  return {
    version: 1,
    completedCases: Math.max(0, Math.floor(Number(raw.completedCases) || 0)),
    bestScores: raw.bestScores && typeof raw.bestScores === 'object' ? raw.bestScores : {},
    attempts: raw.attempts && typeof raw.attempts === 'object' ? raw.attempts : {},
    unlockedReports: raw.unlockedReports && typeof raw.unlockedReports === 'object' ? raw.unlockedReports : {},
    masteredMyths: raw.masteredMyths && typeof raw.masteredMyths === 'object' ? raw.masteredMyths : {},
    safetyAnswers: Math.max(0, Math.floor(Number(raw.safetyAnswers) || 0))
  }
}

export class InvestigationState {
  constructor(profile = null) {
    this.profile = sanitizeInvestigationProfile(profile)
    this.currentRun = null
    this.lastReport = null
  }

  startCase(caseId) {
    const caseData = CASE_BY_ID[caseId]
    if (!caseData) throw new Error(`Unknown investigation case: ${caseId}`)
    this.currentRun = {
      caseId,
      pointsLeft: caseData.actionPoints,
      evidenceIds: [],
      activeEvidenceId: null,
      comparisonOpened: false,
      selectedCandidateId: null,
      keyEvidenceAnswerId: null,
      conclusionType: null,
      mythId: caseData.myths[(this.profile.attempts[caseId] || 0) % caseData.myths.length].id,
      mythAnswerId: null,
      score: null,
      completed: false
    }
    this.lastReport = null
    return this.currentRun
  }

  get caseData() {
    return this.currentRun ? CASE_BY_ID[this.currentRun.caseId] : null
  }

  get activeEvidence() {
    if (!this.currentRun?.activeEvidenceId) return null
    return this.caseData.evidence.find((item) => item.id === this.currentRun.activeEvidenceId) || null
  }

  get currentMyth() {
    if (!this.currentRun) return null
    return this.caseData.myths.find((item) => item.id === this.currentRun.mythId) || null
  }

  selectEvidence(evidenceId) {
    const run = this._requireActiveRun()
    const evidence = this.caseData.evidence.find((item) => item.id === evidenceId)
    if (!evidence) throw new Error(`Unknown evidence: ${evidenceId}`)
    if (run.evidenceIds.includes(evidenceId)) {
      run.activeEvidenceId = evidenceId
      return { added: false, evidence }
    }
    if (evidence.cost > run.pointsLeft) throw new Error('Not enough investigation points')
    run.evidenceIds.push(evidenceId)
    run.activeEvidenceId = evidenceId
    run.pointsLeft -= evidence.cost
    return { added: true, evidence }
  }

  canCompare() {
    return Boolean(this.currentRun && this.currentRun.evidenceIds.length >= 2)
  }

  openComparison() {
    if (!this.canCompare()) throw new Error('At least two pieces of evidence are required')
    this.currentRun.comparisonOpened = true
  }

  selectCandidate(candidateId) {
    const run = this._requireActiveRun()
    if (!run.comparisonOpened) throw new Error('Open comparison before selecting a candidate')
    const candidate = this.caseData.candidates.find((item) => item.id === candidateId)
    if (!candidate) throw new Error(`Unknown candidate: ${candidateId}`)
    run.selectedCandidateId = candidateId
    run.keyEvidenceAnswerId = null
    return candidate
  }

  assessCandidate(candidateId = this.currentRun?.selectedCandidateId) {
    if (!candidateId || !this.currentRun) return { support: 0, conflict: 0, missing: this.caseData?.evidence.length || 0, statuses: {} }
    const isAnswer = candidateId === this.caseData.answerId
    const statuses = {}
    let support = 0
    let conflict = 0
    let missing = 0
    this.caseData.evidence.forEach((evidence) => {
      if (!this.hasEvidence(evidence.id)) {
        statuses[evidence.id] = 'missing'
        missing += 1
      } else if (!isAnswer && this.caseData.decisiveEvidence.includes(evidence.id)) {
        statuses[evidence.id] = 'conflict'
        conflict += 1
      } else {
        statuses[evidence.id] = 'support'
        support += 1
      }
    })
    return { support, conflict, missing, statuses }
  }

  answerKeyEvidence(optionId) {
    const run = this._requireActiveRun()
    if (!run.selectedCandidateId) throw new Error('Select a candidate first')
    const question = this.caseData.keyEvidenceQuestion
    if (!question.options.some((item) => item.id === optionId)) throw new Error(`Unknown key evidence option: ${optionId}`)
    run.keyEvidenceAnswerId = optionId
    return optionId === question.answerId
  }

  submitConclusion(type) {
    const run = this._requireActiveRun()
    const valid = ['submit', 'review']
    if (!valid.includes(type)) throw new Error(`Unknown conclusion type: ${type}`)
    if (!run.selectedCandidateId) throw new Error('Select a candidate before submitting a conclusion')
    if (!run.keyEvidenceAnswerId) throw new Error('Answer the key evidence question first')
    run.conclusionType = type
  }

  answerMyth(optionId) {
    const run = this._requireActiveRun()
    if (!run.conclusionType) throw new Error('Submit a conclusion first')
    const myth = this.currentMyth
    if (!myth.options.some((item) => item.id === optionId)) throw new Error(`Unknown myth option: ${optionId}`)
    run.mythAnswerId = optionId
    return this._finalize()
  }

  hasEvidence(evidenceId) {
    return Boolean(this.currentRun?.evidenceIds.includes(evidenceId))
  }

  _score() {
    const run = this.currentRun
    const data = this.caseData
    const rawEvidence = data.evidence
      .filter((item) => run.evidenceIds.includes(item.id))
      .reduce((sum, item) => sum + item.value, 0)
    const decisiveComplete = data.decisiveEvidence.every((id) => run.evidenceIds.includes(id))
    const candidateCorrect = run.selectedCandidateId === data.answerId
    const keyEvidenceCorrect = run.keyEvidenceAnswerId === data.keyEvidenceQuestion.answerId
    const safetyCorrect = run.mythAnswerId === this.currentMyth.answerId

    const evidence = Math.min(decisiveComplete ? 30 : 22, Math.round(rawEvidence * 0.75))
    const hypothesis = candidateCorrect ? 15 : 0
    const keyEvidence = keyEvidenceCorrect ? 20 : 0
    let conclusion = 0
    if (run.conclusionType === 'submit') {
      conclusion = candidateCorrect && decisiveComplete ? 20 : candidateCorrect ? 5 : 0
    } else if (run.conclusionType === 'review') {
      conclusion = decisiveComplete ? 8 : 20
    }
    const safety = safetyCorrect ? 15 : 0

    return {
      evidence,
      hypothesis,
      keyEvidence,
      conclusion,
      safety,
      total: evidence + hypothesis + keyEvidence + conclusion + safety,
      decisiveComplete,
      candidateCorrect,
      keyEvidenceCorrect,
      safetyCorrect
    }
  }

  _finalize() {
    const run = this.currentRun
    if (run.completed) return this.lastReport
    run.score = this._score()
    run.completed = true
    const caseId = run.caseId
    const firstCompletion = !this.profile.unlockedReports[caseId]
    this.profile.attempts[caseId] = (this.profile.attempts[caseId] || 0) + 1
    this.profile.unlockedReports[caseId] = true
    this.profile.bestScores[caseId] = Math.max(this.profile.bestScores[caseId] || 0, run.score.total)
    if (firstCompletion) this.profile.completedCases += 1
    if (run.score.safetyCorrect) {
      const masteryId = `${caseId}:${run.mythId}`
      if (!this.profile.masteredMyths[masteryId]) {
        this.profile.masteredMyths[masteryId] = true
        this.profile.safetyAnswers += 1
      }
    }
    this.lastReport = {
      caseId,
      score: { ...run.score },
      evidenceIds: run.evidenceIds.slice(),
      selectedCandidateId: run.selectedCandidateId,
      keyEvidenceAnswerId: run.keyEvidenceAnswerId,
      conclusionType: run.conclusionType,
      mythId: run.mythId,
      mythAnswerId: run.mythAnswerId
    }
    return this.lastReport
  }

  _requireActiveRun() {
    if (!this.currentRun || this.currentRun.completed) throw new Error('No active investigation')
    return this.currentRun
  }
}

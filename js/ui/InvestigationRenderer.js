import { CASE_BY_ID, INVESTIGATION_CASES } from '../data/investigationCases.js'
import { INVESTIGATION_SCREEN } from '../core/InvestigationState.js'
import { THEME } from '../constants.js'

const COLORS = Object.freeze({
  ink: '#162f2a',
  muted: '#64756f',
  paper: '#f8f5ed',
  green: '#315b49',
  greenSoft: '#dce9dc',
  amber: '#c4823d',
  amberSoft: '#f4e6d2',
  danger: '#9d493f',
  dangerSoft: '#f2ded8',
  blue: '#567f87',
  white: '#fffdf8',
  line: '#d2d9cf'
})

export class InvestigationRenderer {
  constructor(canvas, safeTop, imageStore) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.imageStore = imageStore
    this.width = canvas.width
    this.height = canvas.height
    this.scale = this.width / 375
    this.logicalWidth = 375
    this.logicalHeight = this.height / this.scale
    this.top = (safeTop || 24) / this.scale
    this.hitAreas = []
  }

  render(model, timestamp) {
    const ctx = this.ctx
    this.hitAreas = []
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, this.width, this.height)
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0)
    this._background(timestamp)

    switch (model.screen) {
      case INVESTIGATION_SCREEN.HOME: this._home(model); break
      case INVESTIGATION_SCREEN.BRIEFING: this._briefing(model); break
      case INVESTIGATION_SCREEN.EVIDENCE: this._evidence(model); break
      case INVESTIGATION_SCREEN.COMPARE: this._compare(model); break
      case INVESTIGATION_SCREEN.KEY_EVIDENCE: this._keyEvidence(model); break
      case INVESTIGATION_SCREEN.CONCLUDE: this._conclude(model); break
      case INVESTIGATION_SCREEN.SAFETY: this._safety(model); break
      case INVESTIGATION_SCREEN.REPORT: this._report(model); break
      case INVESTIGATION_SCREEN.ARCHIVE: this._archive(model); break
      case INVESTIGATION_SCREEN.GUIDE: this._guide(model); break
      case INVESTIGATION_SCREEN.CREDITS: this._credits(model); break
      default: this._home(model)
    }
    if (model.feedback) this._toast(model.feedback)
  }

  _background(timestamp) {
    const ctx = this.ctx
    const gradient = ctx.createLinearGradient(0, 0, 0, this.logicalHeight)
    gradient.addColorStop(0, '#d8e6df')
    gradient.addColorStop(0.5, '#edf0e5')
    gradient.addColorStop(1, '#d9e0cf')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, this.logicalWidth, this.logicalHeight)

    ctx.save()
    ctx.globalAlpha = 0.08
    for (let i = 0; i < 8; i += 1) {
      const x = 15 + i * 52
      ctx.strokeStyle = COLORS.green
      ctx.lineWidth = 8
      ctx.beginPath()
      ctx.moveTo(x, this.logicalHeight)
      ctx.lineTo(x + 20, -20)
      ctx.stroke()
    }
    ctx.restore()

    const phase = (timestamp / 20) % 100
    ctx.strokeStyle = 'rgba(74,117,126,0.13)'
    ctx.lineWidth = 1
    for (let i = 0; i < 14; i += 1) {
      const x = (i * 41 + 17) % 390
      const y = (i * 67 + phase) % (this.logicalHeight + 50) - 25
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x - 4, y + 11)
      ctx.stroke()
    }
  }

  _home({ state }) {
    const item = INVESTIGATION_CASES.find((entry) => !state.profile.unlockedReports[entry.id]) || INVESTIGATION_CASES[0]
    const caseIndex = INVESTIGATION_CASES.findIndex((entry) => entry.id === item.id) + 1
    const titleY = this.top + 20
    this._label('雨后菌语', 187.5, titleY, 29, COLORS.ink, 750, 'center')
    this._label('真实菌物 · 多证据调查训练', 187.5, titleY + 28, 12, COLORS.muted, 600, 'center')

    const photoY = titleY + 51
    this._photo(item.heroImage, 22, photoY, 331, 221, { radius: 21, credit: item.evidence[0].credit, fit: item.evidence[0].fit })
    this._pill(34, photoY + 18, 123, 25, `真实案例 ${caseIndex}/${INVESTIGATION_CASES.length}`, COLORS.danger)
    this._panel(33, photoY + 155, 309, 52, 'rgba(16,38,31,0.76)', 14)
    this._label(item.title, 48, photoY + 178, 18, COLORS.white, 750)
    this._label(item.subtitle, 48, photoY + 197, 10, '#dce7df', 500)

    const statsY = photoY + 233
    this._panel(22, statsY, 331, 57, 'rgba(255,253,248,0.92)', 16)
    this._stat(83, statsY + 17, '完成案例', `${state.profile.completedCases}/${INVESTIGATION_CASES.length}`)
    this._stat(188, statsY + 17, '当前最高', `${state.profile.bestScores[item.id] || 0}分`)
    this._stat(293, statsY + 17, '安全掌握', String(state.profile.safetyAnswers))

    const buttonY = Math.max(statsY + 70, this.logicalHeight - 160)
    this._button(22, buttonY, 331, 51, `开始调查：${item.title}`, `case:${item.id}`, { tone: 'green' })
    this._button(22, buttonY + 61, 103, 42, '选择案例', 'nav:archive', { tone: 'paper', small: true })
    this._button(136, buttonY + 61, 103, 42, '调查方法', 'nav:guide', { tone: 'paper', small: true })
    this._button(250, buttonY + 61, 103, 42, '图片来源', 'nav:credits', { tone: 'paper', small: true })
    this._safetyFooter(buttonY + 119)
  }

  _briefing({ state }) {
    const data = state.caseData
    this._topBar('调查简报', 'nav:home')
    const y = this.top + 52
    this._photo(data.heroImage, 22, y, 331, 207, { radius: 20, credit: `生境远景 · ${data.evidence[0].credit}`, fit: data.evidence[0].fit })
    this._pill(34, y + 17, 92, 24, `案例 ${data.id.toUpperCase()}`, COLORS.blue)
    const cardY = y + 218
    this._panel(22, cardY, 331, 172, COLORS.paper, 18)
    this._label(data.title, 39, cardY + 29, 20, COLORS.ink, 750)
    this._label(`${data.region} · ${data.season}`, 39, cardY + 52, 10, COLORS.muted, 500)
    this._wrappedText(data.briefing, 39, cardY + 77, 297, 20, 12, COLORS.ink, 4)
    this._panel(38, cardY + 128, 299, 31, COLORS.amberSoft, 10)
    this._label('只能使用4点行动，关键证据需要取舍', 187.5, cardY + 149, 10, '#74522e', 650, 'center')

    this._button(22, Math.max(cardY + 184, this.logicalHeight - 67), 331, 49, '进入现场，选择调查证据', 'nav:evidence', { tone: 'green' })
  }

  _evidence({ state }) {
    const run = state.currentRun
    const data = state.caseData
    this._topBar('多角度取证', 'nav:home', `行动点 ${run.pointsLeft}/${data.actionPoints}`)
    const photoY = this.top + 51
    const active = state.activeEvidence
    const photoPath = active ? active.image : data.heroImage
    const credit = active ? `${active.label} · ${active.credit}` : '初始远景 · 尚未计入证据'
    this._photo(photoPath, 20, photoY, 335, 212, { radius: 18, credit, fit: active?.fit })

    const noteY = photoY + 222
    this._panel(20, noteY, 335, 66, active ? COLORS.paper : COLORS.amberSoft, 15)
    if (active) {
      this._label(active.label, 35, noteY + 23, 13, COLORS.ink, 750)
      this._wrappedText(active.observation, 35, noteY + 43, 305, 16, 10, COLORS.muted, 2)
    } else {
      this._label('先选择要调查的部位', 35, noteY + 25, 13, '#74522e', 700)
      this._label('真实鉴定依赖组合证据，不是记住一张正面照。', 35, noteY + 47, 10, '#74522e', 500)
    }

    const gridY = noteY + 77
    data.evidence.forEach((evidence, index) => {
      const col = index % 2
      const row = Math.floor(index / 2)
      const x = 20 + col * 171
      const y = gridY + row * 52
      const selected = run.evidenceIds.includes(evidence.id)
      const disabled = !selected && evidence.cost > run.pointsLeft
      this._evidenceButton(evidence, x, y, 164, 43, selected, disabled)
    })

    const buttonY = this.logicalHeight - 61
    if (state.canCompare()) {
      this._button(20, buttonY, 335, 45, `进入候选对比（已取 ${run.evidenceIds.length} 项）`, 'nav:compare', { tone: 'green' })
    } else {
      this._button(20, buttonY, 335, 45, '至少取得两项证据', 'none', { tone: 'disabled' })
    }
  }

  _evidenceButton(evidence, x, y, width, height, selected, disabled) {
    const fill = selected ? COLORS.greenSoft : disabled ? '#e5e7e1' : COLORS.paper
    this._panel(x, y, width, height, fill, 12, selected ? COLORS.green : null, false)
    this._label(selected ? '✓' : String(evidence.cost), x + 18, y + 26, 12, selected ? COLORS.green : disabled ? '#9ca39e' : COLORS.amber, 750, 'center')
    this._label(evidence.shortLabel, x + 34, y + 19, 12, disabled ? '#989f9a' : COLORS.ink, 700)
    this._label(selected ? '已取得 · 点击复查' : `消耗 ${evidence.cost} 点`, x + 34, y + 34, 8.5, COLORS.muted, 500)
    if (!disabled) this._hit(x, y, width, height, `evidence:${evidence.id}`)
  }

  _compare({ state }) {
    const run = state.currentRun
    const data = state.caseData
    this._topBar('你认为最可能是哪一种？', 'nav:evidence', `${run.evidenceIds.length}项证据`)
    const candidateY = this.top + 53
    data.candidates.forEach((candidate, index) => {
      const x = 14 + index * 119
      const selected = run.selectedCandidateId === candidate.id
      this._candidateCard(candidate, x, candidateY, 111, 69, selected)
    })

    const matrixY = candidateY + 80
    this._panel(18, matrixY, 339, 307, COLORS.paper, 18)
    const selected = data.candidates.find((item) => item.id === run.selectedCandidateId)
    if (!selected) {
      this._label('选择一个初步候选', 187.5, matrixY + 73, 18, COLORS.ink, 750, 'center')
      this._wrappedText('这一步只是建立假设，不会立刻判对错。你可以查看证据的支持、冲突与缺失情况后重新选择。', 55, matrixY + 106, 265, 20, 12, COLORS.muted, 4, 'center')
      this._drawMagnifier(188, matrixY + 210)
    } else {
      const assessment = state.assessCandidate(selected.id)
      this._label(`初步判断：${selected.name}`, 35, matrixY + 25, 16, COLORS.ink, 750)
      this._label(selected.scientificName, 35, matrixY + 43, 9, COLORS.muted, 500)
      this._pill(35, matrixY + 52, 80, 22, `支持 ${assessment.support}`, COLORS.green)
      this._pill(126, matrixY + 52, 80, 22, `冲突 ${assessment.conflict}`, assessment.conflict ? COLORS.danger : COLORS.blue)
      this._pill(217, matrixY + 52, 80, 22, `缺失 ${assessment.missing}`, COLORS.amber)
      const rows = data.comparisonRows.map((row) => [
        row.label,
        row.evidenceId,
        selected.rows[row.rowKey],
        assessment.statuses[row.evidenceId]
      ])
      rows.forEach((row, index) => this._matrixRow(row, 32, matrixY + 82 + index * 51, 311, row[3]))
      this._label('支持或冲突只针对当前固定案例，不代表现实可食。', 187.5, matrixY + 298, 8.5, COLORS.danger, 600, 'center')
    }

    const buttonY = this.logicalHeight - 61
    this._button(20, buttonY, 335, 45, selected ? '下一步：判断哪条证据最关键' : '选择初步候选后继续', selected ? 'nav:key-evidence' : 'none', { tone: selected ? 'green' : 'disabled' })
  }

  _candidateCard(candidate, x, y, width, height, selected) {
    this._panel(x, y, width, height, selected ? COLORS.green : COLORS.paper, 14, selected ? COLORS.green : COLORS.line, false)
    this._label(candidate.name, x + width / 2, y + 24, 11.5, selected ? COLORS.white : COLORS.ink, 750, 'center')
    this._wrappedText(candidate.scientificName, x + 8, y + 43, width - 16, 12, 7.5, selected ? '#dce8e1' : COLORS.muted, 2, 'center')
    this._hit(x, y, width, height, `candidate:${candidate.id}`)
  }

  _matrixRow(row, x, y, width, status) {
    const styles = {
      support: { fill: '#edf4eb', dot: COLORS.green, label: '支持', text: COLORS.green },
      conflict: { fill: COLORS.dangerSoft, dot: COLORS.danger, label: '冲突', text: COLORS.danger },
      missing: { fill: '#f0f0ec', dot: '#a9afaa', label: '未取得', text: COLORS.muted }
    }
    const style = styles[status] || styles.missing
    this._panel(x, y, width, 47, style.fill, 10, null, false)
    this._circle(x + 15, y + 16, 6, style.dot)
    this._label(row[0], x + 29, y + 19, 10, COLORS.ink, 750)
    this._label(style.label, x + width - 10, y + 18, 8.5, style.text, 650, 'right')
    this._wrappedText(row[2], x + 29, y + 35, width - 42, 12, 8.5, status === 'missing' ? '#969c98' : COLORS.muted, 1)
  }

  _keyEvidence({ state }) {
    const question = state.caseData.keyEvidenceQuestion
    this._topBar('哪条证据最关键？', 'nav:compare')
    const y = this.top + 59
    this._panel(24, y, 327, 196, COLORS.paper, 20)
    this._pill(42, y + 22, 103, 24, '关键证据判断', COLORS.blue)
    this._wrappedText(question.question, 42, y + 70, 291, 26, 18, COLORS.ink, 4)
    this._wrappedText('选择后再提交最终判断；答案会在报告中统一解释。', 42, y + 169, 291, 17, 9.5, COLORS.muted, 2)

    const buttonY = y + 216
    question.options.forEach((option, index) => {
      this._button(24, buttonY + index * 64, 327, 53, option.label, `keyEvidence:${option.id}`, { tone: 'paper', small: true })
    })
    this._safetyFooter(buttonY + question.options.length * 64 + 14)
  }

  _conclude({ state }) {
    const run = state.currentRun
    const data = state.caseData
    const candidate = data.candidates.find((item) => item.id === run.selectedCandidateId)
    const decisiveComplete = data.decisiveEvidence.every((id) => state.hasEvidence(id))
    const keyOption = data.keyEvidenceQuestion.options.find((item) => item.id === run.keyEvidenceAnswerId)
    this._topBar('现有证据能确认到什么程度？', 'nav:key-evidence')
    const y = this.top + 59
    this._panel(24, y, 327, 178, COLORS.paper, 20)
    this._label('你的初步候选', 42, y + 27, 10, COLORS.muted, 600)
    this._label(candidate.name, 42, y + 56, 21, COLORS.ink, 750)
    this._label(candidate.scientificName, 42, y + 76, 10, COLORS.muted, 500)
    this._panel(40, y + 94, 295, 31, '#e8f0f1', 9, null, false)
    this._label(`你选的关键证据：${keyOption.label}`, 187.5, y + 114, 9, COLORS.blue, 650, 'center')
    this._panel(40, y + 133, 295, 31, decisiveComplete ? COLORS.greenSoft : COLORS.amberSoft, 9, null, false)
    this._label(decisiveComplete ? '本案例的决定性证据均已取得' : '决定性证据尚未全部取得', 187.5, y + 153, 9.5, decisiveComplete ? COLORS.green : '#77542e', 650, 'center')

    const promptY = y + 207
    this._label('请选择最终行动', 187.5, promptY, 14, COLORS.ink, 700, 'center')
    this._button(24, promptY + 22, 327, 61, `提交判断：${candidate.name}`, 'conclusion:submit', { tone: decisiveComplete ? 'green' : 'paper', detail: decisiveComplete ? '确认按当前证据提交' : '证据不足时贸然提交会影响结论分' })
    this._button(24, promptY + 95, 327, 61, '证据还不够，申请复核', 'conclusion:review', { tone: decisiveComplete ? 'paper' : 'amber', detail: '保留不确定性并请求专业审校' })
    this._safetyFooter(promptY + 183)
  }

  _safety({ state }) {
    const myth = state.currentMyth
    this._topBar('安全判断', 'nav:conclude')
    const y = this.top + 63
    this._panel(24, y, 327, 267, COLORS.paper, 22)
    this._pill(42, y + 22, 93, 24, '安全必答题', COLORS.danger)
    this._wrappedText(myth.question, 43, y + 75, 289, 27, 19, COLORS.ink, 4)
    this._drawShield(188, y + 202)

    const buttonY = Math.max(y + 286, this.logicalHeight - 146)
    myth.options.forEach((option, index) => {
      this._button(24, buttonY + index * 61, 327, 51, option.label, `myth:${option.id}`, { tone: 'paper', small: true })
    })
  }

  _report({ state }) {
    const report = state.lastReport
    const data = CASE_BY_ID[report.caseId]
    const myth = data.myths.find((item) => item.id === report.mythId)
    const answer = data.candidates.find((item) => item.id === data.answerId)
    const selected = data.candidates.find((item) => item.id === report.selectedCandidateId)
    const keyOption = data.keyEvidenceQuestion.options.find((item) => item.id === report.keyEvidenceAnswerId)
    let resultTitle
    let resultDetail
    if (report.conclusionType === 'submit') {
      if (report.score.candidateCorrect && report.score.decisiveComplete) {
        resultTitle = '判断正确'
        resultDetail = '候选与案例答案一致，且决定性证据齐全。'
      } else if (report.score.candidateCorrect) {
        resultTitle = '方向正确，但证据不足'
        resultDetail = '候选方向一致，但当前证据不足以支持直接提交。'
      } else {
        resultTitle = '判断错误'
        resultDetail = '所选候选与案例答案不符，请复查冲突证据。'
      }
    } else if (!report.score.decisiveComplete) {
      resultTitle = '谨慎判断正确'
      resultDetail = '决定性证据不足时申请复核，是更安全的行动。'
    } else {
      resultTitle = '谨慎判断正确'
      resultDetail = '申请复核保留了审慎，但本案例已有足够证据继续判断。'
    }

    this._topBar('本预制案例的审校报告', 'nav:home', `${report.score.total}分`)
    const resultY = this.top + 51
    const positive = resultTitle === '判断正确' || resultTitle === '谨慎判断正确'
    this._panel(20, resultY, 335, 62, positive ? COLORS.greenSoft : resultTitle === '判断错误' ? COLORS.dangerSoft : COLORS.amberSoft, 16)
    this._label(resultTitle, 36, resultY + 25, 19, positive ? COLORS.green : resultTitle === '判断错误' ? COLORS.danger : '#77542e', 800)
    this._label(resultDetail, 36, resultY + 48, 9.5, COLORS.ink, 550)

    const reasonY = resultY + 72
    this._panel(20, reasonY, 335, 128, COLORS.paper, 15)
    const playerChoice = report.conclusionType === 'submit'
      ? `提交判断：${selected.name}`
      : `申请复核（初步候选：${selected.name}）`
    this._label(`你的选择：${playerChoice}`, 36, reasonY + 24, 10.5, COLORS.ink, 700)
    this._label(`案例答案：${answer.name}`, 36, reasonY + 47, 10.5, COLORS.green, 750)
    this._label(`关键证据题：${keyOption.label} · ${report.score.keyEvidenceCorrect ? '回答正确' : '回答错误'}`, 36, reasonY + 70, 9.5, report.score.keyEvidenceCorrect ? COLORS.green : COLORS.danger, 650)
    this._label('关键原因', 36, reasonY + 92, 9.5, COLORS.muted, 700)
    this._wrappedText(data.keyEvidenceQuestion.explanation, 91, reasonY + 92, 248, 14, 8.8, COLORS.muted, 2)

    const scoreY = reasonY + 138
    this._panel(20, scoreY, 335, 58, COLORS.paper, 15)
    this._scoreStat(53, scoreY + 17, '取证', report.score.evidence, 30)
    this._scoreStat(120, scoreY + 17, '初判', report.score.hypothesis, 15)
    this._scoreStat(187, scoreY + 17, '关键证据', report.score.keyEvidence, 20)
    this._scoreStat(254, scoreY + 17, '结论', report.score.conclusion, 20)
    this._scoreStat(321, scoreY + 17, '安全', report.score.safety, 15)

    const riskY = scoreY + 69
    this._panel(20, riskY, 335, 105, COLORS.dangerSoft, 15)
    this._label(`${data.risk.level} · ${data.risk.syndrome}`, 36, riskY + 24, 12, COLORS.danger, 750)
    this._wrappedText(data.risk.summary, 36, riskY + 46, 303, 17, 10, '#693f39', 2)
    this._label('现实误食：停止进食，尽快联系120或前往急诊', 36, riskY + 80, 9, COLORS.danger, 700)
    this._label(report.score.safetyCorrect ? '✓ 安全题回答正确' : '安全题回答错误，需复习', 36, riskY + 97, 9.5, report.score.safetyCorrect ? COLORS.green : COLORS.danger, 700)

    const boundaryY = riskY + 116
    this._panel(20, boundaryY, 335, 62, COLORS.amberSoft, 14)
    this._label('安全题解析', 36, boundaryY + 21, 10, '#714d2d', 750)
    this._wrappedText(myth.explanation, 36, boundaryY + 42, 303, 15, 9, '#714d2d', 2)

    const disclaimerY = boundaryY + 72
    this._panel(20, disclaimerY, 335, 54, COLORS.dangerSoft, 13)
    this._label('高分 ≠ 现实鉴定能力', 36, disclaimerY + 20, 10.5, COLORS.danger, 800)
    this._wrappedText(data.risk.safetyBoundary, 36, disclaimerY + 39, 303, 14, 8.5, '#693f39', 2)

    const buttonY = this.logicalHeight - 58
    this._button(20, buttonY, 160, 43, '再调查一次', `case:${data.id}`, { tone: 'paper', small: true })
    this._button(195, buttonY, 160, 43, '返回观察站', 'nav:home', { tone: 'green', small: true })
  }

  _archive({ state }) {
    this._topBar('选择调查案例', 'nav:home', `${state.profile.completedCases}/${INVESTIGATION_CASES.length}已完成`)
    const startY = this.top + 56
    INVESTIGATION_CASES.forEach((data, index) => {
      const y = startY + index * 145
      const unlocked = Boolean(state.profile.unlockedReports[data.id])
      this._panel(18, y, 339, 132, COLORS.paper, 17)
      this._photo(data.heroImage, 28, y + 10, 112, 112, { radius: 12, fit: data.evidence[0].fit })
      this._label(unlocked ? `已归档 · ${data.id.toUpperCase()}` : `待调查 · ${data.id.toUpperCase()}`, 153, y + 24, 9, unlocked ? COLORS.green : COLORS.amber, 750)
      this._wrappedText(data.title, 153, y + 49, 182, 18, 15, COLORS.ink, 2)
      this._wrappedText(data.subtitle, 153, y + 80, 182, 15, 9.5, COLORS.muted, 2)
      this._label(unlocked ? `最高 ${state.profile.bestScores[data.id]} 分` : '报告尚未解锁', 153, y + 111, 9, COLORS.muted, 600)
      this._button(269, y + 96, 72, 27, unlocked ? '再调查' : '开始', `case:${data.id}`, { tone: 'green', small: true })
    })
    this._safetyFooter(startY + INVESTIGATION_CASES.length * 145 + 7)
  }

  _guide() {
    this._topBar('调查方法', 'nav:home')
    const y = this.top + 57
    this._panel(21, y, 333, 432, COLORS.paper, 21)
    this._label('真实菌物不能靠单图猜答案', 39, y + 32, 18, COLORS.ink, 750)
    const steps = [
      ['1', '收集证据', '用4点行动选择生境、整体、关键部位或专家记录。'],
      ['2', '建立初判', '选出最可能候选，查看支持、冲突和尚缺证据。'],
      ['3', '判断关键证据', '找出最能区分近似候选的证据，再决定是否提交。'],
      ['4', '提交或复核', '证据不足时申请复核；报告会明确解释对错与风险。']
    ]
    steps.forEach((step, index) => {
      const sy = y + 58 + index * 72
      this._circle(51, sy + 6, 14, index === 3 ? COLORS.danger : COLORS.green)
      this._label(step[0], 51, sy + 10, 11, COLORS.white, 750, 'center')
      this._label(step[1], 76, sy + 4, 13, COLORS.ink, 750)
      this._wrappedText(step[2], 76, sy + 25, 247, 16, 10, COLORS.muted, 2)
    })
    const mythsY = y + 352
    this._panel(36, mythsY, 303, 62, COLORS.amberSoft, 13, null, false)
    this._label('这些都不能证明可食', 49, mythsY + 22, 11, '#714d2d', 750)
    this._wrappedText('颜色朴素、虫吃过、银器不变色、煮熟、以前吃过没事。', 49, mythsY + 42, 278, 15, 9.5, '#714d2d', 2)
  }

  _credits() {
    this._topBar('图片与资料来源', 'nav:home')
    const y = this.top + 57
    this._panel(21, y, 333, 442, COLORS.paper, 20)
    this._label('三宗真实案例素材', 39, y + 31, 18, COLORS.ink, 750)
    this._label('当前均为内部玩法原型，发布前需复核授权与专家审校。', 39, y + 53, 9.5, COLORS.muted, 500)
    INVESTIGATION_CASES.forEach((data, index) => {
      const cy = y + 70 + index * 112
      this._panel(36, cy, 303, 100, index === 1 ? COLORS.dangerSoft : '#edf2ea', 13, null, false)
      this._label(`${data.id.toUpperCase()} · ${data.title}`, 49, cy + 23, 12, COLORS.ink, 750)
      this._wrappedText(data.sources[0].name, 49, cy + 45, 277, 15, 9, COLORS.muted, 2)
      this._label(`${data.evidence.length}项证据 · ${data.candidates.length}个候选`, 49, cy + 78, 9, COLORS.green, 650)
      this._label('详细作者记录见对应 ATTRIBUTION.json', 49, cy + 92, 8, COLORS.muted, 500)
    })
    this._safetyFooter(y + 426)
  }

  _topBar(title, backAction, status = '') {
    const y = this.top + 17
    this._button(14, y - 17, 54, 34, '返回', backAction, { tone: 'ghost', small: true })
    this._label(title, 187.5, y + 3, 17, COLORS.ink, 750, 'center')
    if (status) this._label(status, 360, y + 3, 9.5, COLORS.muted, 650, 'right')
  }

  _photo(path, x, y, width, height, options = {}) {
    const ctx = this.ctx
    const radius = options.radius || 14
    this._roundedPath(x, y, width, height, radius)
    ctx.save()
    ctx.clip()
    const record = this.imageStore.get(path)
    const image = record.image
    if (record.status === 'ready' && image && image.width && image.height) {
      if (options.fit === 'contain') {
        ctx.fillStyle = '#18241f'
        ctx.fillRect(x, y, width, height)
        const scale = Math.min(width / image.width, height / image.height)
        const drawWidth = image.width * scale
        const drawHeight = image.height * scale
        const drawX = x + (width - drawWidth) / 2
        const drawY = y + (height - drawHeight) / 2
        ctx.drawImage(image, 0, 0, image.width, image.height, drawX, drawY, drawWidth, drawHeight)
      } else {
        const scale = Math.max(width / image.width, height / image.height)
        const sourceWidth = width / scale
        const sourceHeight = height / scale
        const sourceX = (image.width - sourceWidth) / 2
        const sourceY = (image.height - sourceHeight) / 2
        ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height)
      }
    } else {
      const gradient = ctx.createLinearGradient(x, y, x, y + height)
      gradient.addColorStop(0, '#b9cbbd')
      gradient.addColorStop(1, '#819989')
      ctx.fillStyle = gradient
      ctx.fillRect(x, y, width, height)
      this._label(record.status === 'error' ? '图片加载失败' : '正在加载实拍图…', x + width / 2, y + height / 2, 12, COLORS.white, 650, 'center')
    }
    ctx.restore()
    if (options.credit) {
      this._panel(x + 8, y + height - 25, Math.min(width - 16, 210), 18, 'rgba(15,34,28,0.68)', 8, null, false)
      this._label(options.credit, x + 15, y + height - 12, 7.5, COLORS.white, 500)
    }
  }

  _drawMagnifier(x, y) {
    const ctx = this.ctx
    ctx.strokeStyle = COLORS.green
    ctx.lineWidth = 7
    ctx.beginPath()
    ctx.arc(x - 8, y - 8, 27, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x + 12, y + 12)
    ctx.lineTo(x + 42, y + 42)
    ctx.stroke()
  }

  _drawShield(x, y) {
    const ctx = this.ctx
    ctx.fillStyle = COLORS.greenSoft
    ctx.beginPath()
    ctx.moveTo(x, y - 40)
    ctx.lineTo(x + 37, y - 25)
    ctx.lineTo(x + 30, y + 20)
    ctx.quadraticCurveTo(x, y + 48, x - 30, y + 20)
    ctx.lineTo(x - 37, y - 25)
    ctx.closePath()
    ctx.fill()
    this._label('谨慎', x, y + 7, 14, COLORS.green, 750, 'center')
  }

  _panel(x, y, width, height, fill, radius = 14, stroke = null, shadow = true) {
    const ctx = this.ctx
    ctx.save()
    if (shadow) {
      ctx.shadowColor = 'rgba(20,48,40,0.12)'
      ctx.shadowBlur = 11
      ctx.shadowOffsetY = 3
    }
    this._roundedPath(x, y, width, height, radius)
    ctx.fillStyle = fill
    ctx.fill()
    ctx.shadowColor = 'transparent'
    if (stroke) {
      ctx.strokeStyle = stroke
      ctx.lineWidth = 1.2
      ctx.stroke()
    }
    ctx.restore()
  }

  _button(x, y, width, height, label, action, options = {}) {
    const tones = {
      green: [COLORS.green, COLORS.white],
      paper: [COLORS.paper, COLORS.ink],
      amber: [COLORS.amber, COLORS.white],
      ghost: ['rgba(255,253,248,0.58)', COLORS.green],
      disabled: ['rgba(212,217,209,0.8)', '#8e9791']
    }
    const tone = options.tone || 'green'
    const [fill, text] = tones[tone]
    this._roundedPath(x, y, width, height, 13)
    this.ctx.fillStyle = fill
    this.ctx.fill()
    this.ctx.strokeStyle = tone === 'paper' ? COLORS.line : 'rgba(255,255,255,0.12)'
    this.ctx.stroke()
    this._label(label, x + width / 2, y + (options.detail ? 21 : height / 2 + 4), options.small ? 10.5 : 12.5, text, 700, 'center')
    if (options.detail) this._label(options.detail, x + width / 2, y + 41, 8.5, text, 450, 'center')
    if (tone !== 'disabled' && action !== 'none') this._hit(x, y, width, height, action)
  }

  _stat(x, y, label, value) {
    this._label(label, x, y, 9, COLORS.muted, 500, 'center')
    this._label(value, x, y + 22, 15, COLORS.ink, 750, 'center')
  }

  _scoreStat(x, y, label, value, max) {
    this._label(label, x, y, 8.5, COLORS.muted, 600, 'center')
    this._label(`${value}/${max}`, x, y + 22, 13, COLORS.ink, 750, 'center')
  }

  _pill(x, y, width, height, text, color) {
    this._roundedPath(x, y, width, height, height / 2)
    this.ctx.fillStyle = color
    this.ctx.fill()
    this._label(text, x + width / 2, y + height / 2 + 4, 9, COLORS.white, 700, 'center')
  }

  _safetyFooter(y) {
    this._label('案例高分 ≠ 现实鉴定能力 · 不采不食不明野生菌', 187.5, Math.min(this.logicalHeight - 8, y), 8.5, COLORS.danger, 650, 'center')
  }

  _toast(text) {
    const width = Math.min(315, 66 + Array.from(text).length * 10)
    const x = (375 - width) / 2
    const y = this.logicalHeight - 112
    this._roundedPath(x, y, width, 34, 17)
    this.ctx.fillStyle = 'rgba(19,45,37,0.92)'
    this.ctx.fill()
    this._label(text, 187.5, y + 21, 10, COLORS.white, 550, 'center')
  }

  _label(text, x, y, size, color, weight = 400, align = 'left') {
    const ctx = this.ctx
    ctx.fillStyle = color
    ctx.font = `${weight} ${size}px "PingFang SC", "Helvetica Neue", sans-serif`
    ctx.textAlign = align
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(String(text), x, y)
  }

  _wrappedText(text, x, y, maxWidth, lineHeight, size, color, maxLines = 3, align = 'left') {
    const ctx = this.ctx
    ctx.fillStyle = color
    ctx.font = `400 ${size}px "PingFang SC", "Helvetica Neue", sans-serif`
    ctx.textAlign = align
    ctx.textBaseline = 'alphabetic'
    const chars = Array.from(String(text))
    const lines = []
    let line = ''
    chars.forEach((char) => {
      if (ctx.measureText(line + char).width > maxWidth && line) {
        lines.push(line)
        line = char
      } else line += char
    })
    if (line && lines.length < maxLines) lines.push(line)
    lines.slice(0, maxLines).forEach((value, index) => {
      const tx = align === 'center' ? x + maxWidth / 2 : align === 'right' ? x + maxWidth : x
      ctx.fillText(value, tx, y + index * lineHeight)
    })
  }

  _circle(x, y, radius, color) {
    this.ctx.beginPath()
    this.ctx.arc(x, y, radius, 0, Math.PI * 2)
    this.ctx.fillStyle = color
    this.ctx.fill()
  }

  _roundedPath(x, y, width, height, radius) {
    const ctx = this.ctx
    const r = Math.min(radius, width / 2, height / 2)
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + width - r, y)
    ctx.quadraticCurveTo(x + width, y, x + width, y + r)
    ctx.lineTo(x + width, y + height - r)
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
    ctx.lineTo(x + r, y + height)
    ctx.quadraticCurveTo(x, y + height, x, y + height - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
  }

  _hit(x, y, width, height, action) {
    this.hitAreas.push({ x: x * this.scale, y: y * this.scale, w: width * this.scale, h: height * this.scale, action })
  }
}

import { DECISIONS, SCREEN, THEME, TOOLS, WEATHERS } from '../constants.js'
import { SPECIES, SPECIES_BY_ID } from '../data/species.js'
import { EVENTS, ROUTES, ROUTE_BY_ID } from '../data/routes.js'
import { xpForNextLevel, xpToReachLevel } from '../core/GameState.js'

export class Renderer {
  constructor(canvas, safeTop) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.width = canvas.width
    this.height = canvas.height
    this.safeTop = safeTop || 24
    this.scale = this.width / 375
    this.logicalWidth = 375
    this.logicalHeight = this.height / this.scale
    this.top = this.safeTop / this.scale
    this.hitAreas = []
  }

  render(model, timestamp) {
    const ctx = this.ctx
    this.hitAreas = []
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, this.width, this.height)
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0)
    this._background(timestamp)

    switch (model.scene) {
      case SCREEN.HOME: this._home(model); break
      case SCREEN.ROUTES: this._routes(model); break
      case SCREEN.EXPLORE: this._explore(model); break
      case SCREEN.IDENTIFY: this._identify(model); break
      case SCREEN.DECIDE: this._decide(model); break
      case SCREEN.RESULT: this._result(model); break
      case SCREEN.COLLECTION: this._collection(model); break
      case SCREEN.GUIDE: this._guide(model); break
      default: this._home(model)
    }
    if (model.feedback) this._toast(model.feedback)
  }

  _background(timestamp) {
    const ctx = this.ctx
    const gradient = ctx.createLinearGradient(0, 0, 0, this.logicalHeight)
    gradient.addColorStop(0, '#dce9df')
    gradient.addColorStop(0.58, '#eef0df')
    gradient.addColorStop(1, '#d7dfc6')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, this.logicalWidth, this.logicalHeight)

    ctx.save()
    ctx.globalAlpha = 0.13
    for (let i = 0; i < 9; i += 1) {
      const x = 12 + i * 48 + (i % 2) * 9
      ctx.strokeStyle = i % 3 === 0 ? '#527a58' : '#78967b'
      ctx.lineWidth = 8 + (i % 2) * 4
      ctx.beginPath()
      ctx.moveTo(x, this.logicalHeight)
      ctx.quadraticCurveTo(x - 8, this.logicalHeight * 0.5, x + 10, -10)
      ctx.stroke()
      for (let y = 80 + (i % 3) * 34; y < this.logicalHeight; y += 125) {
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + (i % 2 ? -24 : 24), y - 15)
        ctx.stroke()
      }
    }
    ctx.restore()

    const phase = (timestamp / 18) % 95
    ctx.save()
    ctx.strokeStyle = 'rgba(91, 137, 144, 0.20)'
    ctx.lineWidth = 1
    for (let i = 0; i < 18; i += 1) {
      const x = (i * 47 + 19) % 390
      const y = (i * 73 + phase) % (this.logicalHeight + 70) - 35
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x - 5, y + 14)
      ctx.stroke()
    }
    ctx.restore()
  }

  _home({ state }) {
    const profile = state.profile
    const ctx = this.ctx
    const titleY = this.top + 24
    ctx.fillStyle = THEME.ink
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = '700 31px "PingFang SC", sans-serif'
    ctx.fillText('雨后菌语', 187.5, titleY)
    ctx.font = '13px "PingFang SC", sans-serif'
    ctx.fillStyle = THEME.muted
    ctx.fillText('一场只需要几分钟的竹林观察', 187.5, titleY + 31)

    const heroY = titleY + 66
    this._panel(27, heroY, 321, 190, THEME.paper, 22)
    this._drawHillScene(heroY)
    this._drawMushroom(SPECIES_BY_ID.rainBell, 188, heroY + 116, 72)
    this._pill(111, heroY + 153, 153, 24, `竹林生态 ${Math.round(profile.ecology)}/100`, THEME.mossDark)

    const statY = heroY + 203
    this._panel(27, statY, 321, 58, 'rgba(255,253,247,0.86)', 16)
    this._stat(74, statY + 18, '等级', `Lv.${profile.level}`)
    this._stat(188, statY + 18, '护林券', String(profile.coins))
    this._stat(301, statY + 18, '研究点', String(profile.research))

    const buttonY = Math.max(statY + 72, this.logicalHeight - 155)
    this._button(27, buttonY, 321, 52, '穿好雨靴，开始探索', 'nav:start', { tone: 'moss', large: true })
    this._button(27, buttonY + 62, 154, 43, '菌物图鉴', 'nav:collection', { tone: 'paper' })
    this._button(194, buttonY + 62, 154, 43, '玩法说明', 'nav:guide', { tone: 'paper' })

    ctx.fillStyle = THEME.muted
    ctx.font = '10px "PingFang SC", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('全部菌物均为虚构 · 不可用于现实采食判断', 187.5, Math.min(this.logicalHeight - 10, buttonY + 122))
  }

  _routes({ state, feedback }) {
    this._topBar('选择今日路线', state.profile, 'nav:home')
    const weather = WEATHERS[state.profile.completedRuns % WEATHERS.length]
    const weatherY = this.top + 54
    this._panel(20, weatherY, 335, 55, 'rgba(255,253,247,0.9)', 15)
    this._label('今日竹林', 34, weatherY + 17, 11, THEME.muted)
    this._label(weather.name, 34, weatherY + 39, 17, THEME.ink, 600)
    this._label(weather.hint, 342, weatherY + 38, 11, THEME.muted, 400, 'right')

    const toolY = weatherY + 68
    this._label('只带一件观察工具', 23, toolY + 12, 12, THEME.muted, 600)
    TOOLS.forEach((tool, index) => {
      const x = 20 + index * 113
      const selected = state.profile.selectedTool === tool.id
      this._button(x, toolY + 23, 105, 48, `${tool.icon}  ${tool.name}`, `tool:${tool.id}`, {
        tone: selected ? 'moss' : 'paper', small: true
      })
    })

    const gridY = toolY + 84
    ROUTES.forEach((route, index) => {
      const col = index % 2
      const row = Math.floor(index / 2)
      const x = 20 + col * 171
      const y = gridY + row * 99
      this._routeCard(route, x, y, 164, 88)
    })

    this._label('工具效果会显示在观察或结算中', 187.5, Math.min(this.logicalHeight - 19, gridY + 209), 10, THEME.muted, 400, 'center')
  }

  _routeCard(route, x, y, width, height) {
    const ctx = this.ctx
    this._panel(x, y, width, height, 'rgba(255,253,247,0.92)', 16, route.accent)
    ctx.fillStyle = route.accent
    ctx.beginPath()
    ctx.arc(x + 20, y + 22, 8, 0, Math.PI * 2)
    ctx.fill()
    this._label(route.name, x + 36, y + 26, 15, THEME.ink, 700)
    this._label(route.tag, x + 14, y + 49, 10, THEME.muted, 500)
    this._wrappedText(route.description, x + 14, y + 66, width - 28, 14, 10, THEME.ink, 2)
    this._hit(x, y, width, height, `route:${route.id}`)
  }

  _explore({ state, feedback }) {
    const run = state.currentRun
    const encounter = state.currentEncounter
    if (!run || !encounter) return
    const route = ROUTE_BY_ID[run.routeId]
    this._topBar(route.name, state.profile, 'nav:home')

    const progressY = this.top + 52
    this._progress(25, progressY, 325, run.index + 1, run.encounters.length)
    const sceneY = progressY + 24
    this._panel(20, sceneY, 335, 200, 'rgba(236,242,224,0.94)', 20)
    this._drawForestPatch(sceneY, route.accent)

    if (encounter.kind === 'fungus') {
      const species = state.currentSpecies
      this._drawMushroom(species, 188, sceneY + 120, 80)
      this._pill(120, sceneY + 166, 135, 22, species.habitat, route.accent)
      this._fungusClues(species, encounter, sceneY + 212)

      const buttonY = this.logicalHeight - 68
      if (encounter.observed < 2) {
        const label = run.toolId === 'lens' && encounter.observed === 0 ? '用雨纹镜观察（获得2条）' : '靠近观察线索'
        this._button(25, buttonY, 325, 48, label, 'observe:next', { tone: 'moss' })
      } else {
        this._button(25, buttonY, 154, 48, encounter.observed < 3 ? '再观察一条' : '线索已完整', 'observe:next', {
          tone: encounter.observed < 3 ? 'paper' : 'disabled'
        })
        this._button(191, buttonY, 159, 48, '根据线索辨识', 'nav:identify', { tone: 'moss' })
      }
    } else {
      const event = EVENTS[encounter.eventId]
      this._drawEventIcon(188, sceneY + 110)
      this._label('生态事件', 188, sceneY + 165, 12, THEME.coral, 700, 'center')
      const panelY = sceneY + 212
      this._panel(25, panelY, 325, 98, 'rgba(255,253,247,0.93)', 16)
      this._label(event.title, 42, panelY + 25, 18, THEME.ink, 700)
      this._wrappedText(event.description, 42, panelY + 48, 286, 18, 12, THEME.muted, 2)
      const buttonY = this.logicalHeight - 68
      event.options.forEach((option, index) => {
        this._button(25 + index * 166, buttonY, 159, 48, option.label, `event:${option.id}`, {
          tone: index === 0 ? 'moss' : 'paper', small: true
        })
      })
    }
  }

  _fungusClues(species, encounter, y) {
    const height = Math.max(92, this.logicalHeight - y - 82)
    this._panel(25, y, 325, height, 'rgba(255,253,247,0.93)', 16)
    this._label(`观察记录 ${encounter.observed}/3`, 41, y + 24, 13, THEME.ink, 700)
    for (let i = 0; i < 3; i += 1) {
      const visible = i < encounter.observed
      const dotColor = visible ? THEME.moss : '#c8cec2'
      this._circle(47, y + 46 + i * 25, 5, dotColor)
      const text = visible ? species.clues[i] : '继续观察以记录这条线索'
      this._label(text, 60, y + 50 + i * 25, 11, visible ? THEME.ink : '#9ca69d', visible ? 500 : 400)
    }
  }

  _identify({ state }) {
    const run = state.currentRun
    const encounter = state.currentEncounter
    const species = state.currentSpecies
    this._topBar('辨识记录', state.profile, 'nav:home')
    const cardY = this.top + 58
    this._panel(25, cardY, 325, 245, 'rgba(255,253,247,0.94)', 20)
    this._drawMushroom(species, 188, cardY + 96, 66, true)
    this._label('根据已记录的线索选择名称', 188, cardY + 143, 13, THEME.muted, 600, 'center')
    species.clues.slice(0, encounter.observed).forEach((clue, index) => {
      this._circle(47, cardY + 171 + index * 24, 4, THEME.moss)
      this._label(clue, 59, cardY + 175 + index * 24, 11, THEME.ink, 500)
    })

    const candidateY = Math.max(cardY + 263, this.logicalHeight - 173)
    encounter.candidates.forEach((id, index) => {
      const candidate = SPECIES_BY_ID[id]
      const x = 20 + index * 113
      this._candidateCard(candidate, x, candidateY, 105, 100, `identify:${id}`)
    })
    this._label('不涉及现实菌物或食用判断', 187.5, candidateY + 119, 10, THEME.muted, 400, 'center')
  }

  _candidateCard(species, x, y, width, height, action) {
    this._panel(x, y, width, height, 'rgba(255,253,247,0.94)', 15, '#cad7c6')
    this._drawMushroom(species, x + width / 2, y + 46, 34)
    this._label(species.name, x + width / 2, y + 78, 13, THEME.ink, 700, 'center')
    this._label(`稀有度 ${'·'.repeat(species.rarity)}`, x + width / 2, y + 94, 9, THEME.muted, 400, 'center')
    this._hit(x, y, width, height, action)
  }

  _decide({ state, feedback }) {
    const run = state.currentRun
    const encounter = state.currentEncounter
    const species = state.currentSpecies
    this._topBar('现场决定', state.profile, 'nav:home')
    const y = this.top + 61
    this._panel(25, y, 325, 307, 'rgba(255,253,247,0.95)', 22)
    this._drawMushroom(species, 188, y + 98, 72)
    const correct = encounter.correct
    this._pill(130, y + 146, 115, 24, correct ? '辨识正确' : `记录为 ${species.name}`, correct ? THEME.moss : THEME.amber)
    this._label(species.name, 188, y + 188, 22, THEME.ink, 700, 'center')
    this._wrappedText(species.description, 52, y + 215, 271, 20, 12, THEME.muted, 2, 'center')
    this._wrappedText(species.story, 52, y + 260, 271, 18, 11, THEME.mossDark, 2, 'center')

    const buttonY = Math.max(y + 323, this.logicalHeight - 126)
    DECISIONS.forEach((decision, index) => {
      const x = 14 + index * 119
      this._button(x, buttonY, 111, 54, decision.label, `decision:${decision.id}`, {
        tone: decision.tone,
        small: true,
        detail: decision.id === 'collect' && run.toolId === 'sampleBox' ? '+10券 · 生态-3' : decision.detail
      })
    })
  }

  _result({ state }) {
    const result = state.lastResult
    if (!result) return
    const route = ROUTE_BY_ID[result.routeId]
    const y = this.top + 28
    this._label('今日观察完成', 187.5, y + 24, 25, THEME.ink, 700, 'center')
    this._label(route.name, 187.5, y + 53, 13, THEME.muted, 500, 'center')
    this._panel(35, y + 76, 305, 265, 'rgba(255,253,247,0.95)', 24)
    this._drawResultSeal(188, y + 132, result.ecologyDelta)
    this._stat(88, y + 201, '辨识正确', `${result.correct}/3`)
    this._stat(188, y + 201, '护林券', `+${result.coins}`)
    this._stat(286, y + 201, '研究点', `+${result.research}`)
    this._label(`经验 +${result.xp} · 当前 Lv.${result.level}`, 188, y + 245, 13, THEME.ink, 600, 'center')
    const ecologyText = result.ecologyDelta > 0
      ? `竹林生态 +${result.ecologyDelta}`
      : result.ecologyDelta < 0 ? `竹林生态 ${result.ecologyDelta}` : '竹林生态保持稳定'
    this._pill(110, y + 267, 156, 25, ecologyText, result.ecologyDelta >= 0 ? THEME.moss : THEME.amber)
    const newText = result.newSpecies.length
      ? `新目击：${result.newSpecies.map((id) => SPECIES_BY_ID[id].name).join('、')}`
      : '本次没有新目击，连续探索会提高发现机会'
    this._wrappedText(newText, 62, y + 305, 252, 17, 11, THEME.muted, 2, 'center')

    const buttonY = Math.max(y + 365, this.logicalHeight - 123)
    this._button(27, buttonY, 321, 49, '再走一条路线', 'nav:routes', { tone: 'moss' })
    this._button(27, buttonY + 59, 321, 43, '回到观察站', 'nav:home', { tone: 'paper' })
  }

  _collection({ state }) {
    this._topBar('菌物图鉴', state.profile, 'nav:home')
    const discovered = SPECIES.filter((species) => state.profile.collection[species.id]?.seen).length
    this._label(`竹林目击 ${discovered}/${SPECIES.length}`, 25, this.top + 65, 13, THEME.muted, 600)
    const startY = this.top + 82
    SPECIES.forEach((species, index) => {
      const col = index % 2
      const row = Math.floor(index / 2)
      const x = 20 + col * 171
      const y = startY + row * 118
      const entry = state.profile.collection[species.id]
      this._collectionCard(species, entry, x, y, 164, 106)
    })
    this._label('目击后显示名称，正确辨识后解锁生态记录', 187.5, Math.min(this.logicalHeight - 17, startY + 369), 10, THEME.muted, 400, 'center')
  }

  _collectionCard(species, entry, x, y, width, height) {
    const seen = Boolean(entry?.seen)
    const identified = Boolean(entry?.identified)
    this._panel(x, y, width, height, seen ? 'rgba(255,253,247,0.94)' : 'rgba(232,235,222,0.86)', 16)
    if (seen) this._drawMushroom(species, x + 42, y + 49, 34)
    else this._unknownMushroom(x + 42, y + 51, 32)
    this._label(seen ? species.name : '尚未目击', x + 76, y + 28, 14, seen ? THEME.ink : '#8b978e', 700)
    const status = identified ? '已完成辨识' : seen ? '待确认名称' : '寻找生态线索'
    this._label(status, x + 76, y + 49, 10, identified ? THEME.moss : THEME.muted, 500)
    if (identified) {
      this._wrappedText(species.habitat, x + 76, y + 67, width - 84, 14, 9, THEME.muted, 2)
    }
    const marks = entry ? `照 ${entry.photographed} · 采 ${entry.samples} · 留 ${entry.left}` : '— · — · —'
    this._label(marks, x + 15, y + 94, 9, THEME.muted, 400)
  }

  _guide({ state }) {
    this._topBar('观察手册', state.profile, 'nav:home')
    const y = this.top + 61
    this._panel(23, y, 329, Math.min(445, this.logicalHeight - y - 19), 'rgba(255,253,247,0.95)', 22)
    this._label('四步完成一次竹林观察', 42, y + 33, 18, THEME.ink, 700)
    const steps = [
      ['1', '选路线与工具', '不同路线偏向不同生境；工具只提供便利，不锁内容。'],
      ['2', '至少记录两条线索', '观察形态、附着位置与虚构反应，再进行三选一辨识。'],
      ['3', '决定如何对待菌落', '拍照、采一株成熟体或原地留种，会带来不同收益。'],
      ['4', '让生态影响下一局', '生态更好时，更容易遇见路线中的稀有目击。']
    ]
    steps.forEach((step, index) => {
      const sy = y + 63 + index * 78
      this._circle(53, sy + 8, 15, index === 3 ? THEME.amber : THEME.moss)
      this._label(step[0], 53, sy + 12, 12, THEME.white, 700, 'center')
      this._label(step[1], 78, sy + 6, 14, THEME.ink, 700)
      this._wrappedText(step[2], 78, sy + 27, 245, 17, 11, THEME.muted, 2)
    })
    const safetyY = y + 383
    this._panel(40, safetyY, 295, 49, '#f5ead8', 13)
    this._wrappedText('安全提示：所有名称、特征与用途均为虚构。本作不能用于现实菌物辨识、毒性或食用判断。', 53, safetyY + 16, 270, 15, 10, '#76583e', 3)
  }

  _topBar(title, profile, backAction) {
    const y = this.top + 17
    this._button(16, y - 17, 54, 34, '返回', backAction, { tone: 'ghost', small: true })
    this._label(title, 187.5, y + 3, 19, THEME.ink, 700, 'center')
    this._label(`Lv.${profile.level}  券${profile.coins}`, 359, y + 3, 10, THEME.muted, 500, 'right')
  }

  _progress(x, y, width, current, total) {
    this._roundedPath(x, y, width, 7, 4)
    this.ctx.fillStyle = 'rgba(82,122,88,0.18)'
    this.ctx.fill()
    this._roundedPath(x, y, width * (current / total), 7, 4)
    this.ctx.fillStyle = THEME.moss
    this.ctx.fill()
    this._label(`${current}/${total}`, x + width, y + 18, 9, THEME.muted, 600, 'right')
  }

  _drawHillScene(y) {
    const ctx = this.ctx
    ctx.save()
    ctx.beginPath()
    ctx.rect(28, y + 1, 319, 188)
    ctx.clip()
    ctx.fillStyle = '#c8d8bd'
    ctx.beginPath()
    ctx.moveTo(28, y + 145)
    ctx.quadraticCurveTo(110, y + 60, 195, y + 137)
    ctx.quadraticCurveTo(270, y + 79, 348, y + 136)
    ctx.lineTo(348, y + 190)
    ctx.lineTo(28, y + 190)
    ctx.fill()
    for (let i = 0; i < 8; i += 1) {
      const x = 45 + i * 43
      ctx.strokeStyle = i % 2 ? '#6f9271' : '#5f8465'
      ctx.lineWidth = 5
      ctx.beginPath()
      ctx.moveTo(x, y + 170)
      ctx.lineTo(x + 9, y + 10)
      ctx.stroke()
    }
    ctx.restore()
  }

  _drawForestPatch(y, accent) {
    const ctx = this.ctx
    ctx.save()
    ctx.beginPath()
    ctx.rect(21, y + 1, 333, 198)
    ctx.clip()
    const gradient = ctx.createLinearGradient(0, y, 0, y + 200)
    gradient.addColorStop(0, '#c7dbca')
    gradient.addColorStop(1, '#8fab81')
    ctx.fillStyle = gradient
    ctx.fillRect(21, y, 333, 200)
    ctx.fillStyle = 'rgba(49,83,67,0.22)'
    ctx.beginPath()
    ctx.ellipse(188, y + 176, 128, 30, 0, 0, Math.PI * 2)
    ctx.fill()
    for (let i = 0; i < 7; i += 1) {
      ctx.strokeStyle = i % 2 ? accent : '#628466'
      ctx.lineWidth = 8
      ctx.beginPath()
      ctx.moveTo(35 + i * 55, y + 190)
      ctx.lineTo(47 + i * 53, y - 12)
      ctx.stroke()
    }
    ctx.restore()
  }

  _drawMushroom(species, x, y, size, silhouette = false) {
    if (!species) return
    const ctx = this.ctx
    const style = species.style
    const capColor = silhouette ? '#61766c' : style.cap
    const stemColor = silhouette ? '#7f9087' : style.stem
    ctx.save()
    ctx.translate(x, y)
    ctx.shadowColor = 'rgba(25,53,47,0.18)'
    ctx.shadowBlur = size * 0.12
    ctx.shadowOffsetY = size * 0.08

    ctx.fillStyle = stemColor
    this._roundedPath(-size * 0.1, -size * 0.05, size * 0.2, size * 0.6, size * 0.08)
    ctx.fill()

    ctx.fillStyle = capColor
    ctx.beginPath()
    if (style.shape === 'bell') {
      ctx.moveTo(-size * 0.48, size * 0.02)
      ctx.quadraticCurveTo(-size * 0.28, -size * 0.5, 0, -size * 0.55)
      ctx.quadraticCurveTo(size * 0.3, -size * 0.48, size * 0.48, size * 0.02)
      ctx.quadraticCurveTo(0, size * 0.15, -size * 0.48, size * 0.02)
    } else if (style.shape === 'cone') {
      ctx.moveTo(-size * 0.48, size * 0.04)
      ctx.quadraticCurveTo(-size * 0.12, -size * 0.56, 0, -size * 0.62)
      ctx.quadraticCurveTo(size * 0.15, -size * 0.5, size * 0.48, size * 0.04)
      ctx.quadraticCurveTo(0, size * 0.13, -size * 0.48, size * 0.04)
    } else if (style.shape === 'fan' || style.shape === 'ear') {
      ctx.moveTo(-size * 0.42, size * 0.04)
      ctx.bezierCurveTo(-size * 0.64, -size * 0.32, -size * 0.2, -size * 0.57, size * 0.43, -size * 0.25)
      ctx.quadraticCurveTo(size * 0.24, size * 0.16, -size * 0.42, size * 0.04)
    } else if (style.shape === 'cup') {
      ctx.ellipse(0, -size * 0.22, size * 0.43, size * 0.3, 0, 0, Math.PI * 2)
    } else {
      ctx.ellipse(0, -size * 0.22, size * 0.48, size * 0.33, 0, 0, Math.PI * 2)
    }
    ctx.closePath()
    ctx.fill()

    if (!silhouette) {
      ctx.shadowColor = 'transparent'
      ctx.fillStyle = style.spots
      for (let i = 0; i < 5; i += 1) {
        const angle = (i / 5) * Math.PI * 2
        ctx.beginPath()
        ctx.arc(Math.cos(angle) * size * 0.2, -size * 0.23 + Math.sin(angle) * size * 0.1, size * 0.035, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.restore()
  }

  _unknownMushroom(x, y, size) {
    const ctx = this.ctx
    ctx.save()
    ctx.fillStyle = '#aeb8ae'
    ctx.beginPath()
    ctx.ellipse(x, y - size * 0.25, size * 0.48, size * 0.3, 0, Math.PI, Math.PI * 2)
    ctx.fill()
    ctx.fillRect(x - size * 0.1, y - size * 0.25, size * 0.2, size * 0.7)
    this._label('?', x, y - 2, 16, THEME.white, 700, 'center')
    ctx.restore()
  }

  _drawEventIcon(x, y) {
    const ctx = this.ctx
    ctx.save()
    ctx.translate(x, y)
    ctx.fillStyle = '#9c7659'
    ctx.rotate(-0.28)
    this._roundedPath(-8, -54, 16, 108, 7)
    ctx.fill()
    ctx.rotate(0.28)
    ctx.strokeStyle = THEME.coral
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.moveTo(-38, -17)
    ctx.quadraticCurveTo(0, 6, 39, -21)
    ctx.stroke()
    ctx.fillStyle = '#e8b59a'
    ctx.beginPath()
    ctx.arc(0, 5, 8, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  _drawResultSeal(x, y, delta) {
    const color = delta >= 0 ? THEME.moss : THEME.amber
    this._circle(x, y, 45, 'rgba(82,122,88,0.12)')
    this._circle(x, y, 34, color)
    this._label(delta >= 0 ? '林' : '察', x, y + 8, 27, THEME.white, 700, 'center')
  }

  _panel(x, y, width, height, fill, radius = 16, stroke = null) {
    const ctx = this.ctx
    ctx.save()
    ctx.shadowColor = THEME.shadow
    ctx.shadowBlur = 12
    ctx.shadowOffsetY = 4
    this._roundedPath(x, y, width, height, radius)
    ctx.fillStyle = fill
    ctx.fill()
    ctx.shadowColor = 'transparent'
    if (stroke) {
      ctx.strokeStyle = stroke
      ctx.globalAlpha = 0.48
      ctx.lineWidth = 1.5
      ctx.stroke()
    }
    ctx.restore()
  }

  _button(x, y, width, height, label, action, options = {}) {
    const tone = options.tone || 'moss'
    const colors = {
      moss: [THEME.mossDark, THEME.white],
      paper: [THEME.paper, THEME.ink],
      rain: [THEME.rain, THEME.white],
      amber: [THEME.amber, THEME.white],
      ghost: ['rgba(255,253,247,0.56)', THEME.mossDark],
      disabled: ['rgba(208,214,202,0.7)', '#929c93']
    }
    const [fill, text] = colors[tone] || colors.moss
    const ctx = this.ctx
    this._roundedPath(x, y, width, height, options.large ? 18 : 14)
    ctx.fillStyle = fill
    ctx.fill()
    ctx.strokeStyle = tone === 'paper' ? 'rgba(82,122,88,0.16)' : 'rgba(255,255,255,0.12)'
    ctx.stroke()
    const fontSize = options.small ? 12 : options.large ? 15 : 13
    this._label(label, x + width / 2, y + (options.detail ? 19 : height / 2 + 4), fontSize, text, 650, 'center')
    if (options.detail) this._label(options.detail, x + width / 2, y + 39, 8.5, text, 400, 'center')
    if (tone !== 'disabled') this._hit(x, y, width, height, action)
  }

  _stat(x, y, label, value) {
    this._label(label, x, y, 10, THEME.muted, 500, 'center')
    this._label(value, x, y + 22, 16, THEME.ink, 700, 'center')
  }

  _pill(x, y, width, height, text, color) {
    this._roundedPath(x, y, width, height, height / 2)
    this.ctx.fillStyle = color
    this.ctx.globalAlpha = 0.92
    this.ctx.fill()
    this.ctx.globalAlpha = 1
    this._label(text, x + width / 2, y + height / 2 + 4, 10, THEME.white, 600, 'center')
  }

  _toast(text) {
    const width = Math.min(285, 52 + Array.from(text).length * 11)
    const x = (375 - width) / 2
    const y = this.logicalHeight - 128
    this._roundedPath(x, y, width, 34, 17)
    this.ctx.fillStyle = 'rgba(25,53,47,0.9)'
    this.ctx.fill()
    this._label(text, 187.5, y + 21, 11, THEME.white, 500, 'center')
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
      const next = line + char
      if (ctx.measureText(next).width > maxWidth && line) {
        lines.push(line)
        line = char
      } else {
        line = next
      }
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
    this.hitAreas.push({
      x: x * this.scale,
      y: y * this.scale,
      w: width * this.scale,
      h: height * this.scale,
      action
    })
  }
}

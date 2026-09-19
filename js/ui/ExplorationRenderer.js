import {
  EXPLORATION_SPECIES,
  ECO_REGIONS,
  ECO_REGION_BY_ID,
  RARITY_LABELS,
  RESEARCH_VALUE_BY_ID,
  RESEARCH_VALUE_LABELS,
  SCENE_BY_ID,
  SPECIES_BY_ID
} from '../data/explorationData.js'
import { EXPLORATION_SCREEN } from '../core/ExplorationState.js'
import { drawHabitat, fungusAt } from './HabitatView.js'
import { UI_THEME as C } from './theme.js'

export class ExplorationRenderer {
  constructor(canvas, safeTop, imageStore) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.imageStore = imageStore
    this.safeTop = safeTop || 24
    const widthScale = canvas.width / 375
    const heightScale = canvas.height / 760
    this.scale = Math.min(widthScale, heightScale)
    this.offsetX = (canvas.width - 375 * this.scale) / 2
    this.logicalHeight = canvas.height / this.scale
    this.top = Math.min(78, (safeTop || 24) / this.scale)
    this.hitAreas = []
    this.textDraws = []
    this.buttonDraws = []
    this.truncatedTexts = []
    this.sceneBounds = null
  }

  render(model, timestamp) {
    const ctx = this.ctx
    const exploring = model.screen === EXPLORATION_SCREEN.EXPLORE
    this.scale = exploring ? this.canvas.width / 375 : Math.min(this.canvas.width / 375, this.canvas.height / (this.menuMinHeight||760),
      this.menuContentHeight ? (this.canvas.height-this.safeTop)/this.menuContentHeight : Infinity)
    this.offsetX = (this.canvas.width - 375 * this.scale) / 2
    this.logicalHeight = this.canvas.height / this.scale
    this.top = exploring || this.menuContentHeight ? this.safeTop / this.scale : Math.min(78, this.safeTop / this.scale)
    this.hitAreas = []
    this.textDraws = []
    this.buttonDraws = []
    this.truncatedTexts = []
    this.toastBounds = null
    this.lensBounds = null
    this.sceneBounds = null
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    ctx.fillStyle = '#d8e6df'
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    ctx.setTransform(this.scale, 0, 0, this.scale, this.offsetX, 0)
    this._background(timestamp)
    switch (model.screen) {
      case EXPLORATION_SCREEN.HOME: this._home(model); break
      case EXPLORATION_SCREEN.MAP: this._map(model); break
      case EXPLORATION_SCREEN.SCENES: this._scenes(model); break
      case EXPLORATION_SCREEN.EXPLORE: this._explore(model); break
      case EXPLORATION_SCREEN.PAUSE: this._pause(model); break
      case EXPLORATION_SCREEN.SPECIMEN: this._specimen(model); break
      case EXPLORATION_SCREEN.IDENTIFY: this._identify(model); break
      case EXPLORATION_SCREEN.BASKET: this._basket(model); break
      case EXPLORATION_SCREEN.RESULT: this._result(model); break
      case EXPLORATION_SCREEN.COLLECTION: this._collection(model); break
      case EXPLORATION_SCREEN.COLLECTION_DETAIL: this._collectionDetail(model); break
      case EXPLORATION_SCREEN.GUIDE: this._guide(model); break
      case EXPLORATION_SCREEN.SCENE_SPECIES: this._sceneSpecies(model); break
      case EXPLORATION_SCREEN.FIELD_JOURNAL: this._fieldJournal(model); break
      case EXPLORATION_SCREEN.SOURCES: this._sources(model); break
      default: this._home(model)
    }
    if (this.pressedAction) {
      const area = this.hitAreas.find(a => a.action === this.pressedAction)
      if (area) {
        ctx.save()
        if(area.shape==='circle'){ctx.beginPath();ctx.arc((area.cx-this.offsetX)/this.scale,area.cy/this.scale,area.r/this.scale,0,Math.PI*2)}
        else this._roundedPath((area.x-this.offsetX)/this.scale,area.y/this.scale,area.w/this.scale,area.h/this.scale,12)
        ctx.fillStyle='rgba(23,53,45,.12)';ctx.fill()
        ctx.restore()
      }
    }
    if (model.feedback) this._toast(model.feedback)
  }

  _background(timestamp) {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.logicalHeight)
    gradient.addColorStop(0, '#d8e6df')
    gradient.addColorStop(.55, '#edf0e4')
    gradient.addColorStop(1, '#d7dfce')
    this.ctx.fillStyle = gradient
    this.ctx.fillRect(0, 0, 375, this.logicalHeight)
    this.ctx.globalAlpha = .09
    for (let i = 0; i < 7; i += 1) {
      const x = 15 + i * 58 + Math.sin(i) * 3
      this.ctx.strokeStyle = C.green
      this.ctx.lineWidth = 6
      this.ctx.beginPath(); this.ctx.moveTo(x, this.logicalHeight); this.ctx.lineTo(x + 34, -20); this.ctx.stroke()
    }
    this.ctx.globalAlpha = 1
  }

  _home({ state }) {
    const identified = EXPLORATION_SPECIES.filter((item) => state.profile.collection[item.id]?.identified).length
    this._label('雨后菌语', 187.5, this.top + 27, 30, C.ink, 800, 'center')
    this._label('走进林间，寻找菌物', 187.5, this.top + 55, 12, C.muted, 550, 'center')
    const heroY = this.top + 77
    this._panel(23, heroY, 329, 239, C.paper, 24)
    this._drawEcoRegions(heroY)
    this._label('从松林到溪谷，发现新菌物', 187.5, heroY + 190, 17, C.ink, 750, 'center')
    this._label('林间寻找 · 收集菌物 · 解锁图鉴', 187.5, heroY + 215, 10.5, C.muted, 550, 'center')

    const statY = heroY + 252
    this._panel(23, statY, 329, 60, 'rgba(250,246,236,.92)', 16)
    this._stat(78, statY + 19, '生态分区', '4')
    this._stat(187.5, statY + 19, '已鉴别', `${identified}/${EXPLORATION_SPECIES.length}`)
    this._stat(297, statY + 19, '通关次数', String(state.profile.successfulChallenges))

    const buttonY = Math.max(statY + 74, this.logicalHeight - 162)
    this._button(23, buttonY, 329, 51, '开始探索', 'nav:map', { tone: 'green' })
    this._button(23, buttonY + 62, 156, 43, '菌物收藏', 'nav:collection', { tone: 'paper' })
    this._button(196, buttonY + 62, 156, 43, '玩法手册', 'nav:guide', { tone: 'paper' })
    this._label('游戏中可采集，不代表现实中可食用', 187.5, Math.min(this.logicalHeight - 9, buttonY + 124), 8.5, C.danger, 650, 'center')
  }

  _drawEcoRegions(y) {
    const regions = [
      [43, y + 27, '暖湿山地', '#9a7650'],
      [193, y + 27, '寒温带森林', '#52766a'],
      [43, y + 98, '冷湿过渡带', '#657c57'],
      [193, y + 98, '温带丘陵林地', '#8a704e']
    ]
    regions.forEach(([x, py, label, color], index) => {
      this._roundedPath(x, py, 139, 54, 18)
      this.ctx.fillStyle = index % 2 ? 'rgba(224,236,236,.9)' : 'rgba(220,233,220,.9)'
      this.ctx.fill()
      this._circle(x + 24, py + 27, 13, color)
      this.ctx.strokeStyle = C.white
      this.ctx.lineWidth = 1.5
      this.ctx.beginPath()
      this.ctx.moveTo(x + 19, py + 31)
      this.ctx.quadraticCurveTo(x + 25, py + 18, x + 30, py + 24)
      this.ctx.stroke()
      this._label(label, x + 44, py + 32, 11, C.ink, 750)
    })
    this._label('四类生态分区，各有不同的林间风景', 187.5, y + 171, 8.5, C.muted, 600, 'center')
  }

  _map({ state }) {
    this._topBar('选择生态分区', 'nav:home', `已通关 ${state.profile.successfulChallenges} 次`)
    this._label('选择一类环境，再进入其中的探索场景', 22, this.top + 62, 9.5, C.muted, 550)
    const startY = this.top + 78
    ECO_REGIONS.forEach((region, index) => {
      const col = index % 2; const row = Math.floor(index / 2)
      const x = 18 + col * 171; const y = startY + row * 190
      this._regionCard(region, state, x, y, 164, 176)
    })
    this._button(22, startY + 392, 331, 42, '查看资料与图片来源', 'nav:sources', { tone: 'paper', small: true })
  }

  _regionCard(region, state, x, y, width, height) {
    const completed = region.sceneIds.filter((id) => state.profile.completedScenes[id]).length
    this._panel(x, y, width, height, C.paper, 18, region.accent)
    this.ctx.fillStyle = region.accent
    this.ctx.beginPath(); this.ctx.arc(x + width - 24, y + 30, 17, 0, Math.PI * 2); this.ctx.fill()
    this._label(region.name.slice(0, 1), x + width - 24, y + 35, 14, C.white, 800, 'center')
    this._label(region.name, x + 16, y + 29, 15, C.ink, 800)
    this._label(region.subtitle, x + 16, y + 52, 10, region.accent, 700)
    this._wrappedText(region.climate, x + 16, y + 79, width - 32, 17, 11, C.muted, 3)
    this._label(`${completed}/${region.sceneIds.length} 场景完成`, x + 16, y + 132, 10.5, C.muted, 600)
    this._button(x + 13, y + 141, width - 26, 30, '选择场景', `region:${region.id}`, { tone: 'green', small: true })
  }

  _scenes({ state }) {
    const region = state.regionData
    this._topBar(region.name, 'nav:map', region.subtitle)
    this._wrappedText(region.climate, 24, this.top + 61, 327, 18, 11, C.muted, 2)
    region.sceneIds.forEach((sceneId, index) => {
      const scene = SCENE_BY_ID[sceneId]
      const y = this.top + 104 + index * 247
      this._sceneCard(scene, state, 20, y, 335, 226)
    })
    this._label('场景为游戏设计，不代表现实采集地点', 187.5, this.logicalHeight - 12, 8.5, C.muted, 550, 'center')
  }

  _sceneCard(scene, state, x, y, width, height) {
    this._panel(x, y, width, height, C.paper, 19)
    const cardRecord = scene.habitat.hasGeneratedArt ? this.imageStore.get(scene.habitat.card) : null
    const cardPath = cardRecord?.status === 'ready' ? scene.habitat.card : scene.habitat.fallbackPhoto
    this._photo(cardPath, x + 8, y + 8, width - 16, 104, 14)
    const complete = Boolean(state.profile.completedScenes[scene.id])
    const goal = scene.goalType === 'observe' ? `记录${scene.targetFindCount}处` : `采集${scene.targetCollectCount}朵`
    this._pill(x + 18, y + 18, 79, 22, complete ? '已完成' : '待调查', complete ? C.green : C.amber)
    this._label(scene.name, x + 18, y + 137, 18, C.ink, 800)
    this._label(scene.subtitle, x + 18, y + 159, 9.5, C.muted, 550)
    this._label(`${goal} · 林间寻觅`, x + 18, y + 182, 9, C.blue, 650)
    this._button(x + 226, y + 177, 94, 34, complete ? '再次调查' : '进入场景', `scene:${scene.id}`, { tone: 'green', small: true })
  }
  _explore(model) {
    drawHabitat(this, model)
  }

  getFungusActionAt(point, scene, run) {
    return fungusAt(this, point, scene, run)
  }

  _drawSceneFungusIllustration(spawn, species, x, y, size) {
    const record = this.imageStore.get(spawn.illustration)
    const extent = size * 1.72
    if (record?.status === 'ready' && record.image) {
      this.ctx.drawImage(record.image, x - extent / 2, y - extent * .77, extent, extent)
    } else if (record?.status === 'error') {
      this._drawFungus(species, x, y + size * .2, size * .55)
    }
  }
  _drawTerrain(environment, x, y, width, height) {
    const ctx = this.ctx
    const ground = y + height * .82
    this._drawDistantHills(environment, x, y, width, height)

    if (environment === 'alpine') {
      this._drawAlpineTerrain(x, y, width, height)
      this._drawGroundTexture('meadow', x, y, width, height)
      return
    }

    ctx.fillStyle = environment === 'meadow' || environment === 'edge' ? '#86a866' : '#637d58'
    ctx.beginPath(); ctx.moveTo(x, y + height * .58)
    ctx.quadraticCurveTo(x + width * .28, y + height * .49, x + width * .52, y + height * .63)
    ctx.quadraticCurveTo(x + width * .76, y + height * .52, x + width, y + height * .6)
    ctx.lineTo(x + width, y + height); ctx.lineTo(x, y + height); ctx.closePath(); ctx.fill()

    if (environment === 'pine') {
      this._drawPine(x + width * .11, ground, height * .72, false)
      this._drawPine(x + width * .36, ground - height * .04, height * .57, true)
      this._drawPine(x + width * .66, ground, height * .76, false)
      this._drawBroadleaf(x + width * .91, ground, height * .55, true)
    } else if (environment === 'birch') {
      this._drawPine(x + width * .08, ground, height * .58, true)
      this._drawBirch(x + width * .24, ground, height * .72, false)
      this._drawBirch(x + width * .54, ground - height * .02, height * .63, true)
      this._drawBirch(x + width * .82, ground, height * .77, false)
      this._drawPine(x + width * .96, ground, height * .52, true)
    } else if (environment === 'mixed') {
      this._drawPine(x + width * .09, ground, height * .7, false)
      this._drawBirch(x + width * .31, ground, height * .61, true)
      this._drawBroadleaf(x + width * .57, ground, height * .7, false)
      this._drawPine(x + width * .85, ground, height * .75, false)
    } else if (environment === 'river') {
      this._drawBroadleaf(x + width * .1, ground - height * .04, height * .68, false)
      this._drawBirch(x + width * .35, ground - height * .1, height * .56, true)
      this._drawBroadleaf(x + width * .88, ground - height * .03, height * .7, false)
      this._drawRiver(x, y, width, height)
    } else if (environment === 'oak') {
      this._drawBroadleaf(x + width * .08, ground, height * .74, false)
      this._drawBroadleaf(x + width * .39, ground - height * .04, height * .58, true)
      this._drawBroadleaf(x + width * .78, ground, height * .78, false)
      this._drawBirch(x + width * .96, ground, height * .54, true)
    } else {
      this._drawForestEdge(x, y, width, height)
      this._drawBroadleaf(x + width * .07, ground, height * .61, false)
      if (environment === 'edge') this._drawBroadleaf(x + width * .94, ground, height * .55, true)
    }

    if (environment === 'river') {
      this._drawFallenLog(x + width * .48, y + height * .7, height * .12)
      this._drawRocks(x, y, width, height, true)
    } else if (environment === 'mixed' || environment === 'oak' || environment === 'birch') {
      this._drawFallenLog(x + width * .47, y + height * .76, height * .1)
    }
    this._drawGroundTexture(environment, x, y, width, height)
  }

  _drawDistantHills(environment, x, y, width, height) {
    const ctx = this.ctx
    ctx.fillStyle = environment === 'alpine' ? '#78909a' : '#8aa596'
    ctx.beginPath(); ctx.moveTo(x, y + height * .42)
    ctx.quadraticCurveTo(x + width * .18, y + height * .18, x + width * .38, y + height * .39)
    ctx.quadraticCurveTo(x + width * .58, y + height * .12, x + width * .78, y + height * .4)
    ctx.quadraticCurveTo(x + width * .9, y + height * .28, x + width, y + height * .38)
    ctx.lineTo(x + width, y + height * .66); ctx.lineTo(x, y + height * .66); ctx.closePath(); ctx.fill()
    ctx.fillStyle = environment === 'alpine' ? '#95a9aa' : '#789481'
    ctx.beginPath(); ctx.moveTo(x, y + height * .52)
    ctx.quadraticCurveTo(x + width * .22, y + height * .35, x + width * .47, y + height * .53)
    ctx.quadraticCurveTo(x + width * .71, y + height * .31, x + width, y + height * .49)
    ctx.lineTo(x + width, y + height * .7); ctx.lineTo(x, y + height * .7); ctx.closePath(); ctx.fill()
  }

  _drawAlpineTerrain(x, y, width, height) {
    const ctx = this.ctx
    ctx.fillStyle = '#617b85'
    ctx.beginPath(); ctx.moveTo(x, y + height * .53); ctx.lineTo(x + width * .23, y + height * .09)
    ctx.lineTo(x + width * .43, y + height * .5); ctx.lineTo(x + width * .7, y + height * .12)
    ctx.lineTo(x + width, y + height * .54); ctx.lineTo(x + width, y + height * .7); ctx.lineTo(x, y + height * .7); ctx.closePath(); ctx.fill()
    ctx.fillStyle = '#dbe2dd'
    ctx.beginPath(); ctx.moveTo(x + width * .16, y + height * .22); ctx.lineTo(x + width * .23, y + height * .09)
    ctx.lineTo(x + width * .3, y + height * .24); ctx.lineTo(x + width * .24, y + height * .2); ctx.lineTo(x + width * .2, y + height * .25); ctx.closePath(); ctx.fill()
    ctx.beginPath(); ctx.moveTo(x + width * .61, y + height * .25); ctx.lineTo(x + width * .7, y + height * .12)
    ctx.lineTo(x + width * .78, y + height * .25); ctx.lineTo(x + width * .72, y + height * .22); ctx.lineTo(x + width * .67, y + height * .28); ctx.closePath(); ctx.fill()
    ctx.fillStyle = '#88a46d'
    ctx.beginPath(); ctx.moveTo(x, y + height * .53); ctx.quadraticCurveTo(x + width * .3, y + height * .43, x + width * .56, y + height * .61)
    ctx.quadraticCurveTo(x + width * .8, y + height * .49, x + width, y + height * .57)
    ctx.lineTo(x + width, y + height); ctx.lineTo(x, y + height); ctx.closePath(); ctx.fill()
    this._drawRocks(x, y, width, height, false)
  }

  _drawPine(x, ground, size, distant = false) {
    const ctx = this.ctx
    const trunkTop = ground - size * .78
    ctx.save(); ctx.globalAlpha = distant ? .72 : 1
    ctx.fillStyle = distant ? '#665c49' : '#594b39'
    ctx.beginPath(); ctx.moveTo(x - size * .035, ground); ctx.lineTo(x - size * .018, trunkTop)
    ctx.lineTo(x + size * .025, trunkTop); ctx.lineTo(x + size * .055, ground); ctx.closePath(); ctx.fill()
    const dark = distant ? '#496b53' : '#315d43'
    const light = distant ? '#5f8063' : '#477a55'
    for (let tier = 0; tier < 6; tier += 1) {
      const cy = ground - size * (.22 + tier * .105)
      const half = size * (.25 - tier * .026)
      ctx.fillStyle = tier % 2 ? light : dark
      ctx.beginPath(); ctx.moveTo(x, cy - size * .18)
      ctx.bezierCurveTo(x - half * .18, cy - size * .07, x - half * .72, cy + size * .04, x - half, cy + size * .12)
      ctx.quadraticCurveTo(x - half * .4, cy + size * .1, x, cy + size * .16)
      ctx.quadraticCurveTo(x + half * .45, cy + size * .1, x + half, cy + size * .12)
      ctx.bezierCurveTo(x + half * .67, cy + size * .02, x + half * .18, cy - size * .08, x, cy - size * .18)
      ctx.fill()
    }
    ctx.restore()
  }

  _drawBirch(x, ground, size, distant = false) {
    const ctx = this.ctx
    const top = ground - size * .76
    ctx.save(); ctx.globalAlpha = distant ? .76 : 1
    ctx.fillStyle = distant ? '#cbcbbf' : '#e2e0d4'
    ctx.beginPath(); ctx.moveTo(x - size * .045, ground); ctx.bezierCurveTo(x - size * .025, ground - size * .3, x - size * .04, ground - size * .58, x - size * .015, top)
    ctx.lineTo(x + size * .025, top); ctx.bezierCurveTo(x + size * .045, ground - size * .5, x + size * .035, ground - size * .24, x + size * .06, ground); ctx.closePath(); ctx.fill()
    ctx.strokeStyle = '#d8d5c8'; ctx.lineWidth = Math.max(1.5, size * .018)
    ;[-1, 1].forEach((direction) => {
      ctx.beginPath(); ctx.moveTo(x, ground - size * .48); ctx.quadraticCurveTo(x + direction * size * .13, ground - size * .58, x + direction * size * .23, ground - size * .65); ctx.stroke()
    })
    ctx.strokeStyle = '#686961'; ctx.lineWidth = Math.max(1, size * .009)
    for (let i = 0; i < 5; i += 1) { const by=ground-size*(.12+i*.12); ctx.beginPath(); ctx.moveTo(x-size*.035,by); ctx.lineTo(x+size*(i%2?.035:.05),by-size*.01); ctx.stroke() }
    this._drawLeafCrown(x, ground - size * .71, size * .25, distant ? '#668064' : '#587a59', distant ? '#789276' : '#709168')
    ctx.restore()
  }

  _drawBroadleaf(x, ground, size, distant = false) {
    const ctx = this.ctx
    const top = ground - size * .7
    ctx.save(); ctx.globalAlpha = distant ? .75 : 1
    ctx.fillStyle = distant ? '#685c49' : '#5a4938'
    ctx.beginPath(); ctx.moveTo(x - size * .065, ground); ctx.bezierCurveTo(x - size * .03, ground - size * .25, x - size * .05, ground - size * .47, x, top)
    ctx.bezierCurveTo(x + size * .055, ground - size * .45, x + size * .035, ground - size * .2, x + size * .075, ground); ctx.closePath(); ctx.fill()
    ctx.strokeStyle = distant ? '#685c49' : '#5a4938'; ctx.lineWidth = Math.max(2, size * .035); ctx.lineCap = 'round'
    ;[-1, 1].forEach((direction) => {
      ctx.beginPath(); ctx.moveTo(x, ground - size * .4); ctx.quadraticCurveTo(x + direction * size * .16, ground - size * .55, x + direction * size * .28, ground - size * .61); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(x + direction * size * .08, ground - size * .5); ctx.lineTo(x + direction * size * .18, ground - size * .69); ctx.stroke()
    })
    this._drawLeafCrown(x, ground - size * .68, size * .31, distant ? '#526f56' : '#3f6849', distant ? '#69846a' : '#5c855b')
    ctx.restore()
  }

  _drawLeafCrown(x, y, radius, dark, light) {
    const ctx = this.ctx
    const lobes = [[-.62,.08,.58,.5],[-.32,-.38,.62,.56],[.08,-.5,.62,.57],[.5,-.18,.59,.52],[.63,.2,.48,.45],[.18,.31,.72,.48],[-.38,.35,.61,.46]]
    lobes.forEach((lobe, index) => {
      ctx.fillStyle = index % 3 === 1 ? light : dark
      ctx.beginPath(); ctx.ellipse(x + radius * lobe[0], y + radius * lobe[1], radius * lobe[2], radius * lobe[3], index * .16, 0, Math.PI * 2); ctx.fill()
    })
    ctx.fillStyle = 'rgba(185,210,166,.2)'
    ctx.beginPath(); ctx.ellipse(x - radius * .24, y - radius * .23, radius * .34, radius * .18, -.35, 0, Math.PI * 2); ctx.fill()
  }

  _drawForestEdge(x, y, width, height) {
    const ctx = this.ctx
    const base = y + height * .58
    for (let i = 0; i < 12; i += 1) {
      const tx = x + i * width / 11; const treeHeight = height * (.17 + (i % 4) * .025)
      ctx.fillStyle = i % 2 ? '#52735a' : '#46684f'
      ctx.beginPath(); ctx.moveTo(tx - treeHeight * .13, base); ctx.lineTo(tx, base - treeHeight); ctx.lineTo(tx + treeHeight * .13, base); ctx.closePath(); ctx.fill()
    }
  }

  _drawRiver(x, y, width, height) {
    const ctx = this.ctx
    ctx.strokeStyle = '#64785e'; ctx.lineWidth = Math.max(24, height * .18)
    ctx.beginPath(); ctx.moveTo(x - width * .05, y + height * .84); ctx.bezierCurveTo(x + width * .25, y + height * .69, x + width * .62, y + height * .98, x + width * 1.05, y + height * .77); ctx.stroke()
    ctx.strokeStyle = '#6f9fa6'; ctx.lineWidth = Math.max(17, height * .12)
    ctx.beginPath(); ctx.moveTo(x - width * .05, y + height * .84); ctx.bezierCurveTo(x + width * .25, y + height * .69, x + width * .62, y + height * .98, x + width * 1.05, y + height * .77); ctx.stroke()
    ctx.strokeStyle = 'rgba(225,239,231,.6)'; ctx.lineWidth = Math.max(1.5, height * .012)
    ctx.beginPath(); ctx.moveTo(x + width * .08, y + height * .8); ctx.bezierCurveTo(x + width * .34, y + height * .75, x + width * .63, y + height * .91, x + width * .87, y + height * .82); ctx.stroke()
  }

  _drawFallenLog(x, y, size) {
    const ctx = this.ctx
    ctx.save(); ctx.translate(x, y); ctx.rotate(-.1)
    this._roundedPath(-size * 2.7, -size * .3, size * 5.4, size * .6, size * .25); ctx.fillStyle = '#66513a'; ctx.fill()
    this._circle(size * 2.35, 0, size * .31, '#927450')
    ctx.strokeStyle = '#644d35'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(size * 2.35, 0, size * .18, 0, Math.PI * 2); ctx.stroke()
    ctx.restore()
  }

  _drawRocks(x, y, width, height, river) {
    const ctx = this.ctx
    for (let i = 0; i < 7; i += 1) {
      const rx=x+width*((i*29%83)/100+.08); const ry=y+height*(river ? .76+(i%3)*.065 : .7+(i%4)*.06)
      const rw=height*(.018+(i%3)*.009)
      ctx.fillStyle = i % 2 ? '#8b9186' : '#757e75'; ctx.beginPath(); ctx.ellipse(rx,ry,rw*1.45,rw,(i%3)*.25,0,Math.PI*2); ctx.fill()
      ctx.fillStyle='rgba(225,230,218,.24)'; ctx.beginPath(); ctx.ellipse(rx-rw*.3,ry-rw*.25,rw*.5,rw*.22,-.3,0,Math.PI*2); ctx.fill()
    }
  }

  _drawGroundTexture(environment, x, y, width, height) {
    const ctx = this.ctx
    const meadow = environment === 'meadow' || environment === 'edge' || environment === 'alpine'
    const pineFloor = environment === 'pine' || environment === 'mixed' || environment === 'birch'
    for (let i = 0; i < 28; i += 1) {
      const gx=x+(i*47%Math.max(1,width-8))+4; const gy=y+height*(.67+(i%6)*.052)
      if (meadow) {
        ctx.strokeStyle = i % 3 ? '#567d4f' : '#789257'; ctx.lineWidth = Math.max(1,height*.006)
        ctx.beginPath(); ctx.moveTo(gx,gy+height*.03); ctx.quadraticCurveTo(gx+(i%2?3:-3),gy,gx+(i%2?5:-4),gy-height*.045); ctx.stroke()
        if (i % 7 === 0) this._circle(gx+3,gy-height*.045,Math.max(1.2,height*.006),i%2?'#e2cf83':'#d3b6c1')
      } else if (pineFloor) {
        ctx.strokeStyle = i % 2 ? '#806b43' : '#6f603e'; ctx.lineWidth = Math.max(.8,height*.004)
        ctx.beginPath(); ctx.moveTo(gx-height*.025,gy); ctx.lineTo(gx+height*.035,gy-height*.018); ctx.stroke()
      } else {
        ctx.fillStyle = i % 2 ? '#8f7047' : '#775f3f'; ctx.beginPath(); ctx.ellipse(gx,gy,height*.018,height*.007,(i%5)*.32,0,Math.PI*2); ctx.fill()
      }
    }
  }

  _drawAnchorBase(spawn, x, y, size) {
    const ctx = this.ctx
    ctx.save()
    if (spawn.anchor === 'tree' || spawn.anchor === 'birch') {
      ctx.strokeStyle = spawn.anchor === 'birch' ? '#ddd9ca' : '#665744'
      ctx.lineWidth = size * .72
      ctx.beginPath(); ctx.moveTo(x + size * .24, y + size * .35); ctx.lineTo(x + size * .12, y - size * 2.6); ctx.stroke()
      if (spawn.anchor === 'birch') {
        ctx.strokeStyle = '#67655e'; ctx.lineWidth = 1.4
        for (let i = 0; i < 3; i += 1) { ctx.beginPath(); ctx.moveTo(x - size * .16, y - size * (.5 + i * .55)); ctx.lineTo(x + size * .35, y - size * (.55 + i * .55)); ctx.stroke() }
      }
    } else if (spawn.anchor === 'log') {
      ctx.translate(x, y + size * .08); ctx.rotate(-.12)
      this._roundedPath(-size * 1.25, -size * .28, size * 2.5, size * .56, size * .22)
      ctx.fillStyle = '#6f5a40'; ctx.fill()
      this._circle(size * 1.05, 0, size * .28, '#8f7552')
    } else if (spawn.anchor === 'stump') {
      this._roundedPath(x - size * .68, y - size * .22, size * 1.36, size * .72, size * .16)
      ctx.fillStyle = '#6d5940'; ctx.fill()
      ctx.fillStyle = '#9a805b'; ctx.beginPath(); ctx.ellipse(x, y - size * .2, size * .68, size * .23, 0, 0, Math.PI * 2); ctx.fill()
    } else if (spawn.anchor === 'roots') {
      ctx.strokeStyle = '#66583f'; ctx.lineWidth = size * .18
      ;[-1, 1].forEach((direction) => { ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + direction * size * .6, y - size * .2, x + direction * size, y + size * .18); ctx.stroke() })
    } else if (spawn.anchor === 'needles') {
      ctx.strokeStyle = '#806c45'; ctx.lineWidth = 1.3
      for (let i = 0; i < 8; i += 1) { const offset=(i-4)*size*.2; ctx.beginPath(); ctx.moveTo(x+offset,y+size*.18); ctx.lineTo(x+offset+size*.45,y-size*.15); ctx.stroke() }
    } else if (spawn.anchor === 'leaves') {
      ctx.fillStyle = '#8d704b'
      for (let i = 0; i < 5; i += 1) { ctx.beginPath(); ctx.ellipse(x+(i-2)*size*.35,y+size*(.02+(i%2)*.15),size*.34,size*.14,(i-2)*.3,0,Math.PI*2); ctx.fill() }
    } else {
      ctx.fillStyle = spawn.anchor === 'mound' ? '#776b50' : '#77885d'
      ctx.beginPath(); ctx.ellipse(x, y + size * .12, size * .9, size * .27, 0, 0, Math.PI * 2); ctx.fill()
    }
    ctx.restore()
  }

  _drawConcealment(spawn, x, y, size) {
    const ctx = this.ctx
    const density = spawn.visibility === 'veryHidden' ? 7 : spawn.visibility === 'hidden' ? 4 : 1
    if (spawn.anchor === 'grass' || spawn.anchor === 'roots' || spawn.anchor === 'soil') {
      ctx.strokeStyle = '#547849'; ctx.lineWidth = 2.4
      for (let i = 0; i < density; i += 1) {
        const offset = (i - density / 2) * 4
        ctx.beginPath(); ctx.moveTo(x + offset, y + 5); ctx.quadraticCurveTo(x + offset * .7, y - size * .3, x + offset + (i % 2 ? 5 : -4), y - size * .85); ctx.stroke()
      }
    } else if (spawn.anchor === 'needles') {
      ctx.strokeStyle = '#665736'; ctx.lineWidth = 1.5
      for (let i = 0; i < density; i += 1) { const offset=(i-density/2)*4; ctx.beginPath(); ctx.moveTo(x+offset,y+4); ctx.lineTo(x+offset+size*.55,y-size*.55); ctx.stroke() }
    } else if (spawn.anchor === 'leaves') {
      ctx.fillStyle = '#987952'
      for (let i = 0; i < density; i += 1) { ctx.beginPath(); ctx.ellipse(x+(i-density/2)*4,y+2,size*.34,size*.13,i*.35,0,Math.PI*2); ctx.fill() }
    } else if (spawn.anchor === 'mound') {
      ctx.fillStyle = '#776b50'; ctx.beginPath(); ctx.ellipse(x, y + 3, size * .82, size * .34, 0, Math.PI, Math.PI * 2); ctx.fill()
    } else if (spawn.anchor === 'tree' || spawn.anchor === 'birch') {
      ctx.fillStyle = spawn.anchor === 'birch' ? '#cbc8bd' : '#594b3b'
      ctx.fillRect(x + size * .18, y - size * 1.45, size * .28, size * 1.7)
    } else if (spawn.anchor === 'log') {
      ctx.strokeStyle = '#4f4434'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.arc(x, y + size * .05, size * .72, Math.PI * .1, Math.PI * .9); ctx.stroke()
    } else if (spawn.anchor === 'stump') {
      ctx.fillStyle = 'rgba(83,67,47,.75)'; ctx.fillRect(x - size * .65, y, size * 1.3, size * .2)
    }
  }

  _specimen({ state }) {
    if (!state.selectedIdentified) {
      this._unknownSpecimen(state)
      return
    }
    this._identifiedSpecimen(state)
  }

  _unknownSpecimen(state) {
    const species = state.selectedSpecies; const run = state.currentRun
    this._topBar('未知菌物观察', 'nav:explore', `${state.selectedClueCount}/${state.selectedClues.length} · 图${run.photoIndex + 1}/${species.photos.length}`)
    const photoY = this.top + 52
    this._photo(species.photos[run.photoIndex], 20, photoY, 335, 226)
    this._button(27, photoY + 185, 43, 31, '上一张', 'photo:prev', { tone: 'ghost', small: true })
    this._button(305, photoY + 185, 43, 31, '下一张', 'photo:next', { tone: 'ghost', small: true })
    const infoY = photoY + 238
    this._panel(20, infoY, 335, 220, C.paper, 17)
    this._label('未知菌物', 36, infoY + 31, 21, C.ink, 800)
    this._label('名称、稀有度、研究价值和风险资料尚未解锁', 36, infoY + 53, 9, C.muted, 550)
    state.selectedClues.forEach((clue, index) => {
      const visible = index < state.selectedClueCount
      const rowY = infoY + 69 + index * 46
      this._panel(34, rowY, 307, 39, visible ? C.blueSoft : 'rgba(232,235,226,.78)', 9)
      this._pill(42, rowY + 8, 54, 22, visible ? clue.label : `线索${index + 1}`, visible ? C.blue : '#9aa49d')
      this._wrappedText(visible ? clue.text : '继续观察后显示', 104, rowY + 17, 226, 13, 8.3, visible ? C.ink : '#919a94', 2)
    })
    const buttonY = this.logicalHeight - 108
    const ready = state.canIdentifySelected()
    this._button(19, buttonY, 337, 43, ready ? '根据三条线索鉴定名称' : '观察下一条特征', ready ? 'nav:identify' : 'clue:next', { tone: ready ? 'green' : 'blue', small: true })
    this._button(19, buttonY + 52, 337, 39, '暂存未知记录，返回场景', 'observe:leave', { tone: 'paper', small: true })
  }

  _identifiedSpecimen(state) {
    const species = state.selectedSpecies; const run = state.currentRun
    const research = RESEARCH_VALUE_LABELS[RESEARCH_VALUE_BY_ID[species.id]]
    this._topBar('已鉴定菌物', 'nav:explore', `${run.photoIndex + 1}/${species.photos.length}`)
    const photoY = this.top + 52
    this._photo(species.photos[run.photoIndex], 20, photoY, 335, 226)
    this._button(27, photoY + 185, 43, 31, '上一张', 'photo:prev', { tone: 'ghost', small: true })
    this._button(305, photoY + 185, 43, 31, '下一张', 'photo:next', { tone: 'ghost', small: true })
    const infoY = photoY + 238
    this._panel(20, infoY, 335, 220, C.paper, 17)
    this._label(species.name, 36, infoY + 29, 21, C.ink, 800)
    this._label(`${species.scientificName} · 这处约${state.selectedSpawn.count}朵`, 36, infoY + 49, 9.5, C.muted, 550)
    this._pill(36, infoY + 60, 67, 22, RARITY_LABELS[species.rarity], species.rarity >= 3 ? C.amber : C.blue)
    this._pill(112, infoY + 60, 105, 22, `研究价值 ${research}`, C.green)
    this._label('游戏维度，不代表经济、药用或食用价值', 339, infoY + 75, 7.5, C.muted, 500, 'right')
    this._label(species.isHighRisk ? '高风险摄入危害' : species.observeOnly ? '本关建议仅记录' : '未提供食用结论', 36, infoY + 102, 10, species.isHighRisk ? C.danger : species.observeOnly ? C.amber : C.green, 750)
    this._wrappedText(species.description, 36, infoY + 126, 303, 16, 9.5, C.ink, 2)
    this._wrappedText(species.ecology, 36, infoY + 160, 303, 15, 8.8, C.muted, 2)
    this._wrappedText(species.riskSummary, 36, infoY + 192, 303, 14, 8.5, species.isHighRisk ? C.danger : '#73573a', 2)
    if (species.isHighRisk) this._label('现实误食：停止进食，尽快联系120或前往急诊', 36, infoY + 214, 8.3, C.danger, 750)
    else this._label('真实照片与资料仅用于固定游戏案例', 36, infoY + 214, 8, C.muted, 500)

    const buttonY = this.logicalHeight - 108
    const leftLabel = species.isHighRisk ? '标记高风险，留在原地' : species.observeOnly ? '仅记录，不采集' : '仅作观察记录'
    const leftAction = species.isHighRisk ? 'risk:mark' : 'observe:leave'
    this._button(19, buttonY, 337, 43, leftLabel, leftAction, { tone: species.isHighRisk ? 'danger' : 'green', small: true })
    const rightLabel = species.observeOnly ? '尝试采集（违反仅观察规则）' : species.isHighRisk ? '误采到篮子（立即失败）' : `采集这一簇（${state.selectedSpawn.count}朵）`
    this._button(19, buttonY + 52, 337, 39, rightLabel, 'basket:add', { tone: species.isHighRisk || species.observeOnly ? 'amber' : 'paper', small: true })
  }

  _identify({ state }) {
    this._topBar('名称鉴定', 'nav:explore', '三选一')
    const y = this.top + 55
    this._panel(20, y, 335, 226, C.paper, 18)
    this._label('根据记录判断它最可能是哪一种', 36, y + 31, 17, C.ink, 800)
    state.selectedClues.forEach((clue, index) => {
      const rowY = y + 51 + index * 55
      this._pill(36, rowY + 5, 58, 22, clue.label, C.blue)
      this._wrappedText(clue.text, 104, rowY + 13, 229, 14, 8.5, C.muted, 3)
    })
    const promptY = y + 251
    this._label('请选择名称', 187.5, promptY, 13, C.ink, 750, 'center')
    state.selectedCandidates.forEach((candidate, index) => {
      this._button(25, promptY + 18 + index * 60, 325, 49, candidate.name, `identify:${candidate.id}`, { tone: 'paper', small: true })
    })
    this._wrappedText('选项颜色不提示答案。答错不会公布正确名称，可以回到照片和线索重新比较。', 45, promptY + 211, 285, 15, 8.8, C.danger, 3, 'center')
  }

  _basket({ state }) {
    const run = state.currentRun; const scene = state.sceneData; const items = state.basketItems
    const status = scene.goalType === 'observe' ? `记录 ${run.foundSpawnIds.length}/${scene.targetFindCount}` : `已采 ${run.collectedMushroomCount}/${scene.targetCollectCount}朵`
    this._topBar('调查篮', 'nav:explore', status)
    this._panel(20, this.top + 54, 335, 70, C.amberSoft, 15)
    this._label('先鉴定，再决定采集或留在原地', 36, this.top + 79, 13, '#714c2c', 750)
    this._wrappedText('已识别高风险菌仍尝试采集会立即失败；普通菌物入篮也只代表本关计数，不表示现实可食。', 36, this.top + 101, 303, 15, 9, '#714c2c', 2)
    const startY = this.top + 139
    for (let i = 0; i < scene.capacity; i += 1) {
      const item = items[i]; const y = startY + i * 85
      this._panel(22, y, 331, 72, item ? C.paper : 'rgba(238,237,226,.75)', 14)
      if (!item) {
        this._label(`空篮位 ${i + 1}`, 187.5, y + 41, 11, '#929b94', 600, 'center')
        continue
      }
      this._drawFungus(item.species, 58, y + 51, 29)
      this._label(item.species.name, 91, y + 26, 14, C.ink, 750)
      this._label(`这一簇 ${item.spawn.count}朵 · 游戏计数`, 91, y + 48, 9, C.muted, 650)
      this._button(278, y + 21, 59, 31, '移出', `basketRemove:${item.spawn.id}`, { tone: 'paper', small: true })
    }
    const summaryY = startY + scene.capacity * 85 + 8
    this._label(`${status} · 发现${run.foundSpawnIds.length}处 · 成功鉴定${state.identifiedSpeciesCount}种`, 187.5, summaryY, 9, C.muted, 650, 'center')
    const buttonY = this.logicalHeight - 102
    this._button(20, buttonY, 335, 43, '返回林间继续寻找', 'nav:explore', { tone: 'paper', small: true })
    this._button(20, buttonY + 52, 335, 43, state.canFinish() ? '数量达标 · 提交调查' : '数量不足 · 提前结束', 'finish:scene', { tone: state.canFinish() ? 'green' : 'amber', small: true })
  }
  _result({ state, ads = {} }) {
    const result = state.lastResult; const scene = SCENE_BY_ID[result.sceneId]; const region = ECO_REGION_BY_ID[result.regionId]
    const config = {
      success: ['挑战完成', '在动物到达前完成目标，并正确处理了已识别风险。', C.green, C.greenSoft],
      incomplete: ['调查提前结束', '采集或观察数量尚未达标，可以重新进入场景。', C.amber, C.amberSoft],
      'animal-timeout': [`挑战失败：${result.animalName}抢先`, `时间耗尽，剩余${result.eatenCount}处菌物已被动物吃掉。`, C.danger, C.dangerSoft],
      'risk-failure': ['挑战失败：误采高风险菌物', '已识别高风险菌仍被尝试采集，本局立即结束。', C.danger, C.dangerSoft],
      'observation-rule-failure': ['挑战失败：违反仅观察规则', '本关要求只记录该资源压力物种，尝试采集会立即结束。', C.danger, C.dangerSoft]
    }[result.status]
    this._topBar('场景调查报告', 'nav:home', region.name)
    const y = this.top + 61
    this._panel(22, y, 331, 116, config[3], 20)
    this._label(config[0], 187.5, y + 38, 19, config[2], 800, 'center')
    this._wrappedText(config[1], 47, y + 70, 281, 18, 10.5, C.ink, 2, 'center')
    if (result.status === 'risk-failure') this._label('现实误食：停止进食，尽快联系120或前往急诊', 187.5, y + 105, 8.5, C.danger, 750, 'center')
    const statY = y + 132
    this._panel(22, statY, 331, 72, C.paper, 16)
    const goalValue = result.goalType === 'observe' ? `${result.foundCount}/${result.targetFindCount}处` : `${result.collectedMushroomCount}/${result.targetCollectCount}朵`
    this._stat(77, statY + 22, result.goalType === 'observe' ? '观察记录' : '安全采集', goalValue)
    this._stat(187.5, statY + 22, '成功鉴定', `${result.identifiedCount}种`)
    this._stat(298, statY + 22, result.huntMode === 'relaxed' ? '模式' : '剩余时间', result.huntMode === 'relaxed' ? '悠闲' : `${Math.ceil(result.timeRemainingMs / 1000)}秒`)
    const noteY = statY + 87
    this._panel(22, noteY, 331, 159, C.paper, 17)
    this._label(`${region.name} · ${scene.name}`, 38, noteY + 29, 16, C.ink, 750)
    this._wrappedText('立体林地与菌物模型组成固定关卡，不是现实采集点。菌物位置与朵数均为游戏设计，不能替代专业鉴定。', 38, noteY + 58, 299, 18, 10, C.muted, 4)
    this._panel(37, noteY + 111, 301, 34, C.dangerSoft, 10)
    this._label('高分或成功 ≠ 现实鉴定、采集或食用能力', 187.5, noteY + 133, 9.5, C.danger, 750, 'center')
    const buttonY = this.logicalHeight - 111
    if (result.status === 'success' && ads.rewardedAvailable) {
      const rewardDisabled = ads.rainBadgeClaimed || ads.rewardedBusy
      const rewardLabel = ads.rainBadgeClaimed
        ? `本场景雨滴支持章已领取 · 共${ads.rainBadgeCount || 0}枚`
        : ads.rewardedBusy
          ? '视频正在加载或播放…'
          : '自愿看广告 · 领装饰性雨滴支持章'
      this._button(22, buttonY - 52, 331, 41, rewardLabel, rewardDisabled ? 'none' : 'ad:rainBadge', { tone: rewardDisabled ? 'disabled' : 'blue', small: true })
    }
    this._button(22, buttonY, 331, 45, '重新调查这个场景', `scene:${scene.id}`, { tone: 'paper', small: true })
    this._button(22, buttonY + 56, 160, 43, '选择其他场景', 'nav:scenes', { tone: 'green', small: true })
    this._button(193, buttonY + 56, 160, 43, '查看菌物收藏', 'nav:collection', { tone: 'green', small: true })
  }
  _collection({ state, collectionPage = 0, journalAction, collectionSpecies=EXPLORATION_SPECIES, collectionFilter }) {
    const pageSize = 6; const maxPage = Math.max(0,Math.ceil(collectionSpecies.length / pageSize) - 1)
    const page = Math.max(0, Math.min(maxPage, collectionPage))
    const discovered = EXPLORATION_SPECIES.filter((item) => state.profile.collection[item.id]?.seen).length
    const identified = EXPLORATION_SPECIES.filter((item) => state.profile.collection[item.id]?.identified).length
    this._topBar('菌物收藏', 'nav:home', `发现 ${discovered} · 鉴别 ${identified}`)
    this._label(journalAction?'采集后比较线索，解锁名称':'点开已采集的菌物，比较线索并解锁名称', 20, this.top + 61, 9.2, C.muted, 550)
    if(journalAction)this._button(250,this.top+44,105,29,'寻找笔记',journalAction,{tone:'green',small:true})
    if(collectionFilter){
      const pending=EXPLORATION_SPECIES.filter(s=>state.profile.collection[s.id]?.sampled>0&&!state.profile.collection[s.id]?.identified).length
      ;[['all','全部'],['pending',`待鉴别 ${pending}`],['identified',`已鉴别 ${identified}`]].forEach(([id,title],i)=>
        this._button(20+i*114,this.top+80,107,36,title,`collectionFilter:${id}`,{tone:collectionFilter===id?'green':'paper',small:true}))
    }
    const items = collectionSpecies.slice(page * pageSize, page * pageSize + pageSize)
    const startY = this.top + (collectionFilter?130:80)
    items.forEach((species, index) => {
      const col = index % 2; const row = Math.floor(index / 2)
      this._collectionCard(species, state.getCollectionEntry(species.id), 18 + col * 171, startY + row * 151, 164, 138)
    })
    if(!items.length){
      this._panel(20,startY,335,172,C.paper,18)
      this._label(collectionFilter==='pending'?'暂无待鉴别标本':'还没有已鉴别菌物',187.5,startY+52,18,C.ink,700,'center')
      this._wrappedText(collectionFilter==='pending'?'去林间采集新的菌物，回来比较照片与线索。':'采集菌物后，查看三条线索并选择名称，就能解锁收藏。',40,startY+88,295,22,13,C.muted,3,'center')
      this._button(20,startY+193,335,44,'去林间寻找','nav:home')
    }
    this._pagination(page,maxPage+1,'collectionPage')
  }

  _collectionCard(species, entry, x, y, width, height) {
    const seen = Boolean(entry?.seen)
    const identified = Boolean(entry?.identified)
    this._panel(x, y, width, height, seen ? C.paper : 'rgba(231,235,224,.82)', 16)
    if (identified) this._photo(species.photos[0], x + 7, y + 7, width - 14, 70, 10)
    else this._unknownFungus(x + width / 2, y + 49)
    const title = identified ? species.name : seen ? '未知菌物' : '尚未发现'
    this._wrappedText(title, x + 12, y + 96, width-24,17,14, identified ? C.ink : C.muted,1)
    const research = RESEARCH_VALUE_LABELS[RESEARCH_VALUE_BY_ID[species.id]]
    const meta = identified ? `${RARITY_LABELS[species.rarity]} · 研究价值 ${research}` : seen ? entry.sampled>0?'待鉴别 · 点击查看线索':'待采集 · 已有目击记录' : '去林间寻找它'
    this._wrappedText(meta, x + 12, y + 116,width-24,14,9.5,identified && species.rarity >= 3 ? C.amber : C.muted,1)
    if (seen) {
      const status = identified ? `已鉴别 · 发现 ${entry.encounters} 次` : entry.sampled>0?`已采集 · 鉴别 ${entry.identificationAttempts} 次`:'采集后可鉴别'
      this._label(status, x + 12, y + 132, 9, identified ? C.green : C.blue, 650)
      this._hit(x, y, width, height, `collection:${species.id}`)
    }
  }

  _collectionDetail({ state, noteAction }) {
    const species = state.selectedCollectionSpecies; const entry = state.getCollectionEntry(species.id)
    if (!entry.identified) {
      this._topBar('图鉴详情', 'nav:collection', '未鉴定')
      const y = this.top + 74
      this._panel(24, y, 327, 358, C.paper, 22)
      this._unknownFungus(187.5, y + 111)
      this._label('未知菌物', 187.5, y + 169, 23, C.ink, 800, 'center')
      this._label('名称、稀有度与研究价值尚未解锁', 187.5, y + 196, 10, C.muted, 600, 'center')
      this._panel(43, y + 222, 289, 70, C.blueSoft, 13)
      this._label(`目击 ${entry.encounters} 次 · 鉴定尝试 ${entry.identificationAttempts} 次`, 187.5, y + 247, 10, C.blue, 700, 'center')
      this._wrappedText('请回到发现它的生态场景，记录生境、整体或幼体和关键结构，再完成三选一名称鉴定。', 62, y + 271, 251, 15, 9, C.muted, 3, 'center')
      this._label('答错不会在图鉴中提前显示正确答案', 187.5, y + 329, 9, C.danger, 700, 'center')
      this._label('固定图鉴不构成现实鉴定、采集或食用建议', 187.5, this.logicalHeight - 15, 8.5, C.danger, 650, 'center')
      return
    }

    const research = RESEARCH_VALUE_LABELS[RESEARCH_VALUE_BY_ID[species.id]]
    this._topBar('图鉴详情', 'nav:collection', '已鉴别')
    if (noteAction) this._button(20, this.top + 44, 335, 36, '查看寻找笔记', noteAction, { tone: 'green', small: true })
    const photoY = this.top + (noteAction ? 90 : 52)
    const photoHeight = noteAction ? 146 : 184
    this._photo(species.photos[0], 20, photoY, 162, photoHeight, 15, {fit:'contain'})
    this._photo(species.photos[1], 193, photoY, 162, photoHeight, 15, {fit:'contain'})
    const y = photoY + photoHeight + 13
    const detailHeight = species.isHighRisk ? 362 : 316
    this._panel(20, y, 335, detailHeight, C.paper, 18)
    this._label(species.name, 36, y + 31, 21, C.ink, 800)
    this._wrappedText(species.scientificName,36,y+52,303,15,10.5,C.muted,1)
    this._pill(36, y + 63, 66, 22, RARITY_LABELS[species.rarity], species.rarity >= 3 ? C.amber : C.blue)
    this._pill(112, y + 63, 106, 22, `研究价值 ${research}`, C.green)
    this._label('游戏维度，不代表经济、药用或食用价值', 36, y + 100, 8.5, C.muted, 500)
    this._label(`记录：发现 ${entry.encounters} 次 · 采集 ${entry.sampled} 朵 · 已鉴别`, 36, y + 117, 9, C.green, 700)
    this._label('生长环境', 36, y + 144, 12, C.ink, 750)
    this._wrappedText(species.ecology, 36, y + 166, 303, 17, 11, C.muted, 3)
    this._label('识别与安全边界', 36, y + 219, 12, species.isHighRisk ? C.danger : C.ink, 750)
    this._wrappedText(`${species.riskSummary}${species.boundary}`, 36, y + 241, 303, 17, 11, species.isHighRisk ? C.danger : C.muted, 3)
    if (species.isHighRisk) this._label('误食或不适：停止进食，尽快联系120或前往急诊', 36, y + 302, 9, C.danger, 750)
    const sourceY = species.isHighRisk ? y + 331 : y + 300
    this._label('资料依据', 36, sourceY, 9, C.blue, 700)
    this._wrappedText(species.source, 90, sourceY, 247, 14, 8.5, C.muted, 2)
    this._label('固定图鉴不构成现实鉴定、采集或食用建议', 187.5, this.logicalHeight - 15, 8.5, C.danger, 650, 'center')
  }

  _guide() {
    this._topBar('调查手册', 'nav:home')
    const y = this.top + 57
    this._panel(21, y, 333, 500, C.paper, 21)
    this._label('走进林间，慢慢寻找', 39, y + 34, 18, C.ink, 800)
    const steps = [
      ['1', '先选择节奏', '90秒模式有动物争夺；悠闲模式无倒计时，内容和安全规则相同。'],
      ['2', '行走寻找，轻点观察', '左侧摇杆行走，右侧滑动环顾。走近菌物轻点观察；放大镜仅辅助查看。'],
      ['3', '鉴定时自动暂停', '进入照片、三类线索和名称鉴定后不消耗搜索时间。'],
      ['4', '按朵数安全采集', '普通菌物每簇包含不同朵数；数量达标后提交。'],
      ['5', '毒菌误采立即失败', '已识别高风险菌应标记并留在原地；仍采集会立刻结束本局。'],
      ['6', '特殊物种只观察', '资源压力物种不以采集为目标，找到并记录即可。']
    ]
    steps.forEach((step, index) => {
      const sy = y + 62 + index * 66
      this._circle(52, sy + 8, 14, index === 4 ? C.danger : C.green)
      this._label(step[0], 52, sy + 12, 11, C.white, 750, 'center')
      this._label(step[1], 76, sy + 6, 13, C.ink, 750)
      this._wrappedText(step[2], 76, sy + 27, 246, 15, 9.2, C.muted, 2)
    })
    this._panel(37, y + 446, 301, 34, C.dangerSoft, 10)
    this._label('挑战成功不代表现实中能鉴定、采摘或食用菌物', 187.5, y + 468, 8.5, C.danger, 750, 'center')
  }
  _sources() {
    this._topBar('资料与图片来源', 'nav:map')
    const y = this.top + 57
    this._panel(20, y, 335, 502, C.paper, 20)
    this._label('资料与素材说明', 38, y + 32, 18, C.ink, 800)
    this._wrappedText('物种依据来自论文、馆藏凭证和中国疾控等资料。生态分区、隐藏点位、朵数、动物与倒计时均是游戏化设计，不代表现实分布或采集建议。', 38, y + 58, 299, 17, 10, C.muted, 4)
    ECO_REGIONS.forEach((region, index) => {
      const py = y + 129 + index * 66
      this._panel(36, py, 303, 54, index % 2 ? C.blueSoft : C.greenSoft, 12)
      this._label(region.name, 50, py + 22, 13, C.ink, 750)
      this._wrappedText(region.climate, 50, py + 41, 275, 15, 9, C.muted, 1)
    })
    const imageY = y + 404
    this._label('实景与菌物照片', 38, imageY, 11, C.ink, 750)
    this._wrappedText('生境照片：Martin Vorel / LibreShot。菌物实拍：iNaturalist；早期素材含非商业许可，扩展照片采用CC BY或CC0。逐图作者、来源与许可见素材目录的ATTRIBUTION.json；仅供游戏学习。', 38, imageY + 23, 299, 15, 8.8, C.muted, 4)
    this._label('组合生境和固定点位不代表现实拍摄地或采集点', 187.5, y + 483, 8.4, C.danger, 700, 'center')
  }
  _drawFungus(species, x, y, size) {
    if (!species) return
    const ctx = this.ctx; const style = species.style
    ctx.save(); ctx.translate(x, y); ctx.shadowColor = C.shadow; ctx.shadowBlur = size * .14; ctx.shadowOffsetY = 2
    if (style.shape === 'coral') {
      ctx.strokeStyle = style.cap; ctx.lineWidth = size * .15
      ;[-.45,-.2,0,.23,.45].forEach((v, i) => { ctx.beginPath(); ctx.moveTo(0, 2); ctx.quadraticCurveTo(v * size * .5, -size * .35, v * size, -size * (.55 + (i % 2) * .2)); ctx.stroke() })
    } else if (style.shape === 'club') {
      ctx.strokeStyle = style.stem; ctx.lineWidth = size * .18; ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(0, -size * .75); ctx.stroke()
      this._circle(0, -size * .8, size * .11, style.cap)
    } else if (style.shape === 'fan') {
      ctx.fillStyle = style.cap; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, size * .55, Math.PI, Math.PI * 2); ctx.closePath(); ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, size * .37, Math.PI, Math.PI * 2); ctx.stroke()
    } else if (style.shape === 'tooth') {
      ctx.fillStyle = style.cap; ctx.beginPath(); ctx.arc(0, -size * .35, size * .48, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = style.stem; ctx.lineWidth = 1.5
      for (let i=-4;i<=4;i+=1) { ctx.beginPath(); ctx.moveTo(i*size*.09,-size*.15); ctx.lineTo(i*size*.09,size*.15+Math.abs(i)*.8); ctx.stroke() }
    } else {
      ctx.fillStyle = style.stem; this._roundedPath(-size * .09, -size * .05, size * .18, size * .58, size * .08); ctx.fill()
      ctx.fillStyle = style.cap; ctx.beginPath()
      if (style.shape === 'cone') { ctx.moveTo(-size*.42,0); ctx.lineTo(0,-size*.72); ctx.lineTo(size*.42,0) }
      else { ctx.moveTo(-size*.48,0); ctx.quadraticCurveTo(-size*.25,-size*.55,0,-size*.58); ctx.quadraticCurveTo(size*.28,-size*.53,size*.48,0) }
      ctx.quadraticCurveTo(0,size*.12,-size*.48,0); ctx.fill()
      if (style.spots) { this._circle(-size*.2,-size*.2,size*.05,C.white); this._circle(size*.13,-size*.34,size*.045,C.white) }
    }
    ctx.restore()
  }

  _unknownFungus(x, y) {
    this.ctx.globalAlpha = .45
    this._drawFungus({ style: { cap: '#65756d', stem: '#7f8c85', shape: 'round' } }, x, y, 35)
    this.ctx.globalAlpha = 1
    this._label('?', x, y + 5, 13, C.white, 800, 'center')
  }

  _photo(path, x, y, width, height, radius = 17, options = {}) {
    const record = this.imageStore.get(path)
    this.ctx.save(); this._roundedPath(x, y, width, height, radius); this.ctx.clip()
    if (record?.status === 'ready' && record.image) {
      const image = record.image; const sw = image.width || width; const sh = image.height || height
      if(options.fit==='contain'||path.includes('/catalogue/')||path.includes('/catalogue-photos/')){
        // Preserve the full specimen, including stem, margin and underside.
        this.ctx.fillStyle='#eee9da';this.ctx.fillRect(x,y,width,height)
        const scale=Math.min(width/sw,height/sh)
        this.ctx.drawImage(image,x+(width-sw*scale)/2,y+(height-sh*scale)/2,sw*scale,sh*scale)
      }else{
        const scale = Math.max(width / sw, height / sh); const sourceW = width / scale; const sourceH = height / scale
        this.ctx.drawImage(image, (sw - sourceW) / 2, (sh - sourceH) / 2, sourceW, sourceH, x, y, width, height)
      }
    } else {
      this.ctx.fillStyle = '#cbd7ca'; this.ctx.fillRect(x, y, width, height)
      this._label(record?.status==='error'?'图片暂不可用':'图片加载中…', x + width / 2, y + height / 2, 10, C.muted, 600, 'center')
    }
    this.ctx.restore()
  }

  _topBar(title, backAction, status = '') {
    const y = this.top + 17
    this._button(14, y - 17, 60, 40, '‹ 返回', backAction, { tone: 'ghost', small: true })
    this._label(title, 187.5, y + 3, 18, C.ink, 800, 'center')
    if (status) {
      this.ctx.font = `600 8.5px "PingFang SC", sans-serif`
      const statusWidth = this.ctx.measureText(String(status)).width
      this.ctx.font = `800 18px "PingFang SC", sans-serif`
      const titleWidth = this.ctx.measureText(String(title)).width
      if (187.5 + titleWidth / 2 + 8 > 360 - statusWidth) this._label(status, 187.5, y + 19, 8, C.muted, 600, 'center')
      else this._label(status, 360, y + 3, 8.5, C.muted, 600, 'right')
    }
  }
  _pause({state}) {
    this._topBar('探索暂停','nav:explore')
    const y=this.top+82,run=state.currentRun
    this._panel(20,y,335,210,C.paper,18)
    this._label(state.sceneData.name,38,y+38,22,C.ink,750)
    this._label(`本局已采集 ${state.goalProgress}/${state.goalTarget} 朵`,38,y+77,16,C.green,650)
    this._label(run.huntMode==='timed'?`剩余时间 ${Math.ceil(run.timeRemainingMs/1000)} 秒`:'悠闲采集 · 不限时',38,y+109,13,C.muted)
    this._wrappedText('阅读时计时与动物行动已暂停，继续探索会回到原来的位置。',38,y+148,299,21,13,C.muted,2)
    this._button(20,y+237,335,48,'继续探索','nav:explore')
    this._button(20,y+300,335,44,'返回场景列表','nav:scenes',{tone:'paper'})
    this._wrappedText('返回列表将离开本局；已采集的菌物会保留在收藏中。',26,y+372,323,20,12,C.muted,2)
  }
  _panel(x, y, width, height, fill, radius = 14, stroke = null) {
    this.ctx.save(); this.ctx.shadowColor = C.shadow; this.ctx.shadowBlur = 8; this.ctx.shadowOffsetY = 2
    this._roundedPath(x, y, width, height, radius); this.ctx.fillStyle = fill; this.ctx.fill(); this.ctx.restore()
    if (stroke) { this._roundedPath(x, y, width, height, radius); this.ctx.strokeStyle = stroke; this.ctx.lineWidth = 1.2; this.ctx.stroke() }
  }

  _button(x, y, width, height, label, action, options = {}) {
    const button={x,y,w:width,h:height,label,action}
    this.buttonDraws.push(button)
    const tones = { green: [C.green,C.white], blue: [C.blue,C.white], paper: [C.paper,C.ink], amber: [C.amber,C.white], danger: [C.danger,C.white], ghost: ['rgba(255,253,248,.7)',C.green], disabled: ['rgba(210,216,208,.82)','#8c9790'] }
    const tone = options.tone || 'green'; const [fill,text] = tones[tone]
    this._roundedPath(x, y, width, height, 12); this.ctx.fillStyle = fill; this.ctx.fill(); this.ctx.strokeStyle = tone === 'paper' ? C.line : 'rgba(255,255,255,.2)'; this.ctx.lineWidth=1; this.ctx.stroke()
    let fontSize = options.small ? 12 : 14
    this.ctx.font = `700 ${fontSize}px "PingFang SC", sans-serif`
    while (fontSize > 7.5 && this.ctx.measureText(String(label)).width > width - 14) {
      fontSize -= .5
      this.ctx.font = `700 ${fontSize}px "PingFang SC", sans-serif`
    }
    this._label(label, x + width/2, y + height/2 + fontSize * .36, fontSize, text, 700, 'center')
    this.textDraws[this.textDraws.length-1].button=button
    if (tone !== 'disabled' && action !== 'none') this._hit(x, y, width, height, action, { touchTarget: true })
  }
  _pill(x, y, width, height, text, fill) {
    this._roundedPath(x,y,width,height,height/2); this.ctx.fillStyle=fill; this.ctx.fill()
    this._label(text,x+width/2,y+height/2+3.5,8.5,C.white,700,'center')
  }
  _pagination(page,pages,action,{y=this.logicalHeight-66,height=44}={}) {
    this._button(20,y,88,height,'上一页',`${action}:prev`,{tone:page>0?'paper':'disabled',small:true})
    this._label(`${page+1} / ${pages}`,187.5,y+height/2+4,12,C.muted,600,'center')
    this._button(267,y,88,height,'下一页',`${action}:next`,{tone:page+1<pages?'paper':'disabled',small:true})
  }

  _stat(x, y, label, value) {
    this._label(label, x, y, 8.5, C.muted, 550, 'center')
    this._label(value, x, y + 22, 15, C.ink, 800, 'center')
  }

  _toast(text) {
    this.ctx.font='600 11px "PingFang SC", sans-serif'
    const textWidth=this.ctx.measureText(String(text)).width
    const width = Math.min(335, Math.max(150,textWidth+32))
    const x = (375 - width) / 2
    const lines=Math.max(1,Math.min(3,Math.ceil(textWidth/(width-28))))
    const height = 20+lines*16
    const overlapsHitArea = (candidateY) => this.hitAreas.some((area) => {
      const areaX = (area.x - this.offsetX) / this.scale; const areaY = area.y / this.scale
      const areaWidth = area.w / this.scale; const areaHeight = area.h / this.scale
      return x < areaX + areaWidth && x + width > areaX && candidateY < areaY + areaHeight && candidateY + height > areaY
    })
    const minY = this.top + 43
    let y = this.logicalHeight - 162
    while (y >= minY && overlapsHitArea(y)) y -= 8
    if (y < minY) y = minY
    this.toastBounds = { x, y, w: width, h: height }
    this._roundedPath(x,y,width,height,18); this.ctx.fillStyle='rgba(20,48,39,.94)'; this.ctx.fill()
    this._wrappedText(text,x+14,y+22,width-28,16,11,C.white,lines,'center')
  }

  _label(text, x, y, size, color, weight = 400, align = 'left') {
    const value = String(text)
    this.ctx.fillStyle = color; this.ctx.font = `${weight} ${size}px "PingFang SC", "Helvetica Neue", sans-serif`; this.ctx.textAlign = align; this.ctx.textBaseline = 'alphabetic'
    this.textDraws.push({ text: value, x, y, size, align, width: this.ctx.measureText(value).width })
    this.ctx.fillText(value, x, y)
  }

  _wrappedText(text, x, y, maxWidth, lineHeight, size, color, maxLines = 3, align = 'left') {
    const chars = Array.from(String(text))
    const layout = (fontSize) => {
      const lines=[]; let line=''
      this.ctx.font = `400 ${fontSize}px "PingFang SC", sans-serif`
      chars.forEach((char) => { const test=line+char; if (line && this.ctx.measureText(test).width>maxWidth) { lines.push(line); line=char } else line=test })
      if (line) lines.push(line)
      return lines
    }
    let fontSize = size; let lines = layout(fontSize)
    while (lines.length > maxLines && fontSize > Math.max(6.8, size * .72)) {
      fontSize -= .4
      lines = layout(fontSize)
    }
    if (lines.length > maxLines) this.truncatedTexts.push(String(text))
    const drawX = align === 'center' ? x + maxWidth / 2 : align === 'right' ? x + maxWidth : x
    lines.slice(0,maxLines).forEach((item,index) => {
      const output = index===maxLines-1 && lines.length>maxLines ? `${item.slice(0,-1)}…` : item
      this._label(output,drawX,y+index*lineHeight,fontSize,color,400,align)
    })
  }
  _circle(x, y, radius, fill) { this.ctx.fillStyle=fill; this.ctx.beginPath(); this.ctx.arc(x,y,radius,0,Math.PI*2); this.ctx.fill() }

  _roundedPath(x, y, width, height, radius) {
    const r=Math.min(radius,width/2,height/2); this.ctx.beginPath(); this.ctx.moveTo(x+r,y); this.ctx.lineTo(x+width-r,y); this.ctx.quadraticCurveTo(x+width,y,x+width,y+r); this.ctx.lineTo(x+width,y+height-r); this.ctx.quadraticCurveTo(x+width,y+height,x+width-r,y+height); this.ctx.lineTo(x+r,y+height); this.ctx.quadraticCurveTo(x,y+height,x,y+height-r); this.ctx.lineTo(x,y+r); this.ctx.quadraticCurveTo(x,y,x+r,y); this.ctx.closePath()
  }

  _hitCircle(x, y, radius, action) {
    this.hitAreas.push({ x: this.offsetX + (x - radius) * this.scale, y: (y - radius) * this.scale, w: radius * 2 * this.scale, h: radius * 2 * this.scale, cx: this.offsetX + x * this.scale, cy: y * this.scale, r: radius * this.scale, shape: 'circle', action })
  }

  _hit(x, y, width, height, action, options = {}) { this.hitAreas.push({ x: this.offsetX + x * this.scale, y: y * this.scale, w: width * this.scale, h: height * this.scale, action, ...options }) }
}

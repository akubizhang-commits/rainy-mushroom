import {
  EXPLORATION_SPECIES,
  ECO_REGION_BY_ID,
  SCENE_BY_ID,
  SPECIES_BY_ID,
  getIdentificationCandidates,
  getIdentificationClues
} from '../data/explorationData.js'

export const EXPLORATION_SCREEN = Object.freeze({
  HOME: 'exploration-home',
  MAP: 'exploration-map',
  SCENES: 'exploration-scenes',
  EXPLORE: 'exploration-scene',
  PAUSE: 'exploration-pause',
  SPECIMEN: 'exploration-specimen',
  IDENTIFY: 'exploration-identify',
  BASKET: 'exploration-basket',
  RESULT: 'exploration-result',
  COLLECTION: 'exploration-collection',
  COLLECTION_DETAIL: 'exploration-collection-detail',
  GUIDE: 'exploration-guide',
  SCENE_SPECIES: 'exploration-scene-species',
  FIELD_JOURNAL: 'exploration-field-journal',
  SOURCES: 'exploration-sources'
})

export function createExplorationProfile() {
  return {
    version: 2,
    completedScenes: {},
    sceneAttempts: {},
    collection: {},
    rainBadgeScenes: {},
    successfulChallenges: 0
  }
}

function cleanCount(value) {
  return Math.max(0, Math.floor(Number(value) || 0))
}

function sanitizeSceneFlags(raw) {
  const flags = {}
  if (!raw || typeof raw !== 'object') return flags
  Object.keys(raw).forEach((sceneId) => {
    if (SCENE_BY_ID[sceneId] && raw[sceneId]) flags[sceneId] = true
  })
  return flags
}

function sanitizeCollection(raw) {
  const collection = {}
  if (!raw || typeof raw !== 'object') return collection
  EXPLORATION_SPECIES.forEach((species) => {
    const entry = raw[species.id]
    if (!entry || typeof entry !== 'object') return
    collection[species.id] = {
      seen: Boolean(entry.seen),
      examined: Boolean(entry.examined),
      identified: Boolean(entry.identified),
      identificationAttempts: cleanCount(entry.identificationAttempts),
      riskRecognized: Boolean(entry.riskRecognized),
      encounters: cleanCount(entry.encounters),
      sampled: cleanCount(entry.sampled),
      regions: entry.regions && typeof entry.regions === 'object'
        ? { ...entry.regions }
        : entry.provinces && typeof entry.provinces === 'object' ? { ...entry.provinces } : {}
    }
  })
  return collection
}

export function sanitizeExplorationProfile(raw) {
  const defaults = createExplorationProfile()
  if (!raw || typeof raw !== 'object') return defaults
  return {
    version: 2,
    completedScenes: raw.completedScenes && typeof raw.completedScenes === 'object' ? { ...raw.completedScenes } : {},
    sceneAttempts: raw.sceneAttempts && typeof raw.sceneAttempts === 'object' ? { ...raw.sceneAttempts } : {},
    collection: sanitizeCollection(raw.collection),
    rainBadgeScenes: sanitizeSceneFlags(raw.rainBadgeScenes),
    successfulChallenges: cleanCount(raw.successfulChallenges)
  }
}

export class ExplorationState {
  constructor(profile = null) {
    this.profile = sanitizeExplorationProfile(profile)
    this.selectedRegionId = null
    this.currentRun = null
    this.lastResult = null
    this.selectedCollectionSpeciesId = null
  }

  get regionData() {
    return this.selectedRegionId ? ECO_REGION_BY_ID[this.selectedRegionId] : null
  }

  get sceneData() {
    return this.currentRun ? SCENE_BY_ID[this.currentRun.sceneId] : null
  }

  get selectedSpawn() {
    if (!this.currentRun?.selectedSpawnId) return null
    return this.sceneData.spawns.find((spawn) => spawn.id === this.currentRun.selectedSpawnId) || null
  }

  get selectedSpecies() {
    return this.selectedSpawn ? SPECIES_BY_ID[this.selectedSpawn.speciesId] : null
  }

  get selectedClues() {
    return this.selectedSpecies ? getIdentificationClues(this.selectedSpecies.id) : []
  }

  get selectedClueCount() {
    if (!this.currentRun?.selectedSpawnId) return 0
    return this.currentRun.clueCounts[this.currentRun.selectedSpawnId] || 0
  }

  get selectedCandidates() {
    return this.selectedSpecies ? getIdentificationCandidates(this.selectedSpecies.id) : []
  }

  get selectedIdentified() {
    return Boolean(this.selectedSpecies && this.profile.collection[this.selectedSpecies.id]?.identified)
  }

  get targetIdentificationCount() {
    return this.sceneData ? new Set(this.sceneData.spawns.map((spawn) => spawn.speciesId)).size : 0
  }

  get identifiedSpeciesCount() {
    if (!this.currentRun) return 0
    const foundSpecies = new Set(this.currentRun.foundSpawnIds.map((spawnId) => this.sceneData.spawns.find((spawn) => spawn.id === spawnId)?.speciesId).filter(Boolean))
    return Array.from(foundSpecies).filter((speciesId) => this.profile.collection[speciesId]?.identified).length
  }

  get goalTarget() {
    if (!this.sceneData) return 0
    return this.sceneData.goalType === 'observe' ? this.sceneData.targetFindCount : this.sceneData.targetCollectCount
  }

  get goalProgress() {
    if (!this.currentRun) return 0
    return this.sceneData.goalType === 'observe' ? this.currentRun.foundSpawnIds.length : this.currentRun.collectedMushroomCount
  }

  get selectedCollectionSpecies() {
    return this.selectedCollectionSpeciesId ? SPECIES_BY_ID[this.selectedCollectionSpeciesId] : null
  }

  get basketItems() {
    if (!this.currentRun) return []
    return this.currentRun.basketSpawnIds.map((spawnId) => {
      const spawn = this.sceneData.spawns.find((item) => item.id === spawnId)
      return { spawn, species: SPECIES_BY_ID[spawn.speciesId] }
    })
  }

  selectRegion(regionId) {
    if (!ECO_REGION_BY_ID[regionId]) throw new Error(`未知生态分区：${regionId}`)
    this.selectedRegionId = regionId
    return ECO_REGION_BY_ID[regionId]
  }

  sceneDefinition(sceneId) { return SCENE_BY_ID[sceneId] }

  startScene(sceneId) {
    const scene = this.sceneDefinition(sceneId)
    if (!scene) throw new Error(`未知场景：${sceneId}`)
    this.selectedRegionId = scene.regionId
    this.currentRun = {
      sceneId,
      foundSpawnIds: [],
      basketSpawnIds: [],
      markedRiskSpawnIds: [],
      attemptedRiskSpawnIds: [],
      eatenSpawnIds: [],
      everSampledSpawnIds: [],
      clueCounts: {},
      selectedSpawnId: null,
      photoIndex: 0,
      huntStarted: false,
      huntMode: null,
      timeRemainingMs: scene.timeLimitMs,
      lastHuntTickAt: null,
      lensFocus: { x: .5, y: .62 },
      lensActive: false,
      lensEnabled: false,
      cameraX: .12,
      hasPanned: false,
      collectedMushroomCount: 0,
      completed: false
    }
    this.lastResult = null
    return this.currentRun
  }

  startHunt(mode = 'timed', now = Date.now()) {
    const run = this._requireRun()
    if (!['timed', 'relaxed'].includes(mode)) throw new Error(`未知调查模式：${mode}`)
    run.huntStarted = true
    run.huntMode = mode
    run.timeRemainingMs = this.sceneData.timeLimitMs
    run.lastHuntTickAt = mode === 'timed' ? Number(now) || Date.now() : null
    return run
  }

  setLensFocus(x, y) {
    const run = this._requireRun()
    run.lensFocus = {
      x: Math.max(0, Math.min(1, Number.isFinite(Number(x)) ? Number(x) : .5)),
      y: Math.max(0, Math.min(1, Number.isFinite(Number(y)) ? Number(y) : .62))
    }
    return run.lensFocus
  }

  setCameraPosition(position) {
    const run = this._requireRun()
    run.cameraX = Math.max(0, Math.min(1, Number(position) || 0))
    return run.cameraX
  }

  toggleLens() {
    const run = this._requireRun()
    run.lensEnabled = !run.lensEnabled
    run.lensActive = false
    return run.lensEnabled
  }

  showLensAt(x, y) {
    const focus = this.setLensFocus(x, y)
    this.currentRun.lensActive = true
    return focus
  }

  hideLens() {
    if (this.currentRun && !this.currentRun.completed) this.currentRun.lensActive = false
  }

  pauseHunt() {
    if (this.currentRun && !this.currentRun.completed) {
      this.currentRun.lastHuntTickAt = null
      this.currentRun.lensActive = false
    }
  }

  tickHunt(now = Date.now()) {
    const run = this.currentRun
    if (!run || run.completed || !run.huntStarted || run.huntMode !== 'timed') return null
    if (this.canFinish()) {
      run.lastHuntTickAt = null
      return null
    }
    const current = Number(now) || Date.now()
    if (!Number.isFinite(run.lastHuntTickAt)) {
      run.lastHuntTickAt = current
      return null
    }
    const elapsed = Math.max(0, current - run.lastHuntTickAt)
    run.lastHuntTickAt = current
    run.timeRemainingMs = Math.max(0, run.timeRemainingMs - elapsed)
    if (run.timeRemainingMs > 0) return null
    run.eatenSpawnIds = this.sceneData.spawns
      .filter((spawn) => !run.basketSpawnIds.includes(spawn.id) && !run.markedRiskSpawnIds.includes(spawn.id))
      .map((spawn) => spawn.id)
    return this._completeRun('animal-timeout')
  }

  discover(spawnId) {
    const run = this._requireRun()
    const spawn = this.sceneData.spawns.find((item) => item.id === spawnId)
    if (!spawn) throw new Error(`场景中不存在该菌物：${spawnId}`)
    const firstDiscovery = !run.foundSpawnIds.includes(spawnId)
    if (firstDiscovery) run.foundSpawnIds.push(spawnId)
    run.selectedSpawnId = spawnId
    if (!(spawnId in run.clueCounts)) run.clueCounts[spawnId] = 0
    const species = SPECIES_BY_ID[spawn.speciesId]
    const clues = getIdentificationClues(spawn.speciesId)
    const nextClue = clues[Math.min(run.clueCounts[spawnId], clues.length - 1)]
    run.photoIndex = species.photos.length > 1 ? ((nextClue?.photoIndex || 0) + 1) % species.photos.length : 0
    const entry = this._entry(spawn.speciesId)
    entry.seen = true
    entry.regions[this.sceneData.regionId] = true
    if (firstDiscovery) entry.encounters += 1
    return { spawn, species, firstDiscovery }
  }

  setPhotoIndex(index) {
    const run = this._requireRun()
    const species = this.selectedSpecies
    if (!species) throw new Error('请先发现并查看一种菌物')
    const total = species.photos.length
    run.photoIndex = ((Number(index) || 0) % total + total) % total
    return run.photoIndex
  }

  observeSelectedClue() {
    const run = this._requireRun()
    if (!this.selectedSpecies) throw new Error('请先发现一个未知菌物')
    const clues = this.selectedClues
    const count = Math.min(clues.length, this.selectedClueCount + 1)
    const clue = clues[count - 1]
    run.clueCounts[run.selectedSpawnId] = count
    if (Number.isInteger(clue?.photoIndex)) run.photoIndex = this.setPhotoIndex(clue.photoIndex)
    this._entry(this.selectedSpecies.id).examined = count > 0
    return { clue, count, complete: count === clues.length, photoIndex: run.photoIndex }
  }

  canIdentifySelected() {
    return Boolean(this.selectedSpecies && this.selectedClueCount >= this.selectedClues.length)
  }

  identifySelected(candidateId) {
    this._requireRun()
    if (!this.canIdentifySelected()) throw new Error('请先观察完整的生境、整体与关键结构线索')
    if (!this.selectedCandidates.some((candidate) => candidate.id === candidateId)) throw new Error(`未知鉴定候选：${candidateId}`)
    const entry = this._entry(this.selectedSpecies.id)
    entry.identificationAttempts += 1
    const correct = candidateId === this.selectedSpecies.id
    if (correct) entry.identified = true
    return { correct, candidate: SPECIES_BY_ID[candidateId], species: correct ? this.selectedSpecies : null }
  }

  addSelectedToBasket() {
    const run = this._requireRun()
    const spawn = this.selectedSpawn
    if (!spawn) throw new Error('请先选择一个调查对象')
    if (!this.selectedIdentified) throw new Error('请先成功鉴定，再决定是否放入调查篮')
    const species = SPECIES_BY_ID[spawn.speciesId]
    if (species.isHighRisk) {
      if (!run.attemptedRiskSpawnIds.includes(spawn.id)) run.attemptedRiskSpawnIds.push(spawn.id)
      return { added: false, failed: true, result: this._completeRun('risk-failure', { highRiskSpecies: [species.id] }) }
    }
    if (species.observeOnly) {
      return { added: false, failed: true, result: this._completeRun('observation-rule-failure', { observationOnlySpecies: [species.id] }) }
    }
    if (run.basketSpawnIds.includes(spawn.id)) return { added: false, full: run.basketSpawnIds.length >= this.sceneData.capacity }
    if (run.basketSpawnIds.length >= this.sceneData.capacity) throw new Error('调查篮已经装满，请先整理')
    run.basketSpawnIds.push(spawn.id)
    run.collectedMushroomCount += spawn.count
    if (!run.everSampledSpawnIds.includes(spawn.id)) {
      run.everSampledSpawnIds.push(spawn.id)
      this._entry(spawn.speciesId).sampled += spawn.count
    }
    if (this.goalProgress >= this.goalTarget) run.lastHuntTickAt = null
    return { added: true, full: run.basketSpawnIds.length >= this.sceneData.capacity, count: spawn.count, goalReached: this.canFinish() }
  }

  markSelectedRisk() {
    const run = this._requireRun()
    const spawn = this.selectedSpawn
    if (!spawn) throw new Error('请先选择一个调查对象')
    if (!this.selectedIdentified) throw new Error('请先成功鉴定，再进行风险处置')
    if (!run.markedRiskSpawnIds.includes(spawn.id)) run.markedRiskSpawnIds.push(spawn.id)
    run.basketSpawnIds = run.basketSpawnIds.filter((id) => id !== spawn.id)
    if (SPECIES_BY_ID[spawn.speciesId].isHighRisk) this._entry(spawn.speciesId).riskRecognized = true
    return SPECIES_BY_ID[spawn.speciesId].isHighRisk
  }

  removeFromBasket(spawnId) {
    const run = this._requireRun()
    const spawn = this.sceneData.spawns.find((item) => item.id === spawnId)
    const hadItem = run.basketSpawnIds.includes(spawnId)
    run.basketSpawnIds = run.basketSpawnIds.filter((id) => id !== spawnId)
    if (hadItem && spawn) run.collectedMushroomCount = Math.max(0, run.collectedMushroomCount - spawn.count)
    return hadItem
  }

  canFinish() {
    if (!this.currentRun || this.currentRun.completed || this.goalProgress < this.goalTarget) return false
    return this.sceneData.goalType !== 'observe' || this.identifiedSpeciesCount >= this.targetIdentificationCount
  }

  finishScene() {
    const run = this._requireRun()
    const highRiskSpecies = this.basketItems.filter((item) => item.species.isHighRisk).map((item) => item.species.id)
    const observationOnlySpecies = this.basketItems.filter((item) => item.species.observeOnly).map((item) => item.species.id)
    let status = 'success'
    if (highRiskSpecies.length) status = 'risk-failure'
    else if (observationOnlySpecies.length) status = 'observation-rule-failure'
    else if (!this.canFinish()) status = 'incomplete'
    return this._completeRun(status, { highRiskSpecies, observationOnlySpecies })
  }

  _completeRun(status, overrides = {}) {
    const run = this._requireRun()
    const highRiskSpecies = overrides.highRiskSpecies || this.basketItems.filter((item) => item.species.isHighRisk).map((item) => item.species.id)
    const observationOnlySpecies = overrides.observationOnlySpecies || this.basketItems.filter((item) => item.species.observeOnly).map((item) => item.species.id)
    const basketSpeciesIds = this.basketItems.map((item) => item.species.id)
    run.completed = true
    run.lastHuntTickAt = null
    this.profile.sceneAttempts[run.sceneId] = (this.profile.sceneAttempts[run.sceneId] || 0) + 1
    if (status === 'success' && !this.profile.completedScenes[run.sceneId]) {
      this.profile.completedScenes[run.sceneId] = true
      this.profile.successfulChallenges += 1
    }
    this.lastResult = {
      sceneId: run.sceneId,
      regionId: this.sceneData.regionId,
      status,
      foundCount: run.foundSpawnIds.length,
      targetFindCount: this.sceneData.targetFindCount,
      identifiedCount: this.identifiedSpeciesCount,
      targetIdentificationCount: this.targetIdentificationCount,
      collectedMushroomCount: run.collectedMushroomCount,
      targetCollectCount: this.sceneData.targetCollectCount,
      goalType: this.sceneData.goalType,
      basketSpeciesIds,
      highRiskSpecies,
      observationOnlySpecies,
      markedRiskCount: run.markedRiskSpawnIds.length,
      eatenCount: run.eatenSpawnIds.length,
      animalName: this.sceneData.animalName,
      huntMode: run.huntMode,
      timeRemainingMs: run.timeRemainingMs
    }
    return this.lastResult
  }

  get rainBadgeCount() {
    return Object.keys(this.profile.rainBadgeScenes).length
  }

  canClaimRainBadge(sceneId = this.lastResult?.sceneId) {
    return Boolean(
      sceneId
      && this.lastResult?.sceneId === sceneId
      && this.lastResult.status === 'success'
      && !this.profile.rainBadgeScenes[sceneId]
    )
  }

  claimRainBadge(sceneId = this.lastResult?.sceneId) {
    if (!this.canClaimRainBadge(sceneId)) return false
    this.profile.rainBadgeScenes[sceneId] = true
    return true
  }

  selectCollectionSpecies(speciesId) {
    if (!SPECIES_BY_ID[speciesId]) throw new Error(`未知菌物：${speciesId}`)
    if (!this.profile.collection[speciesId]?.seen) throw new Error('尚未在场景中发现这种菌物')
    this.selectedCollectionSpeciesId = speciesId
    return SPECIES_BY_ID[speciesId]
  }

  getCollectionEntry(speciesId) {
    return this.profile.collection[speciesId] || null
  }

  _entry(speciesId) {
    if (!this.profile.collection[speciesId]) {
      this.profile.collection[speciesId] = {
        seen: false,
        examined: false,
        identified: false,
        identificationAttempts: 0,
        studiedClues: 0,
        identificationFailures: 0,
        identificationLockedUntil: 0,
        lastMistakeId: null,
        riskRecognized: false,
        encounters: 0,
        sampled: 0,
        regions: {}
      }
    }
    return this.profile.collection[speciesId]
  }

  _requireRun() {
    if (!this.currentRun || this.currentRun.completed) throw new Error('当前没有进行中的场景调查')
    return this.currentRun
  }
}

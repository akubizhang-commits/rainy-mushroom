import { clamp, PROFILE_VERSION, WEATHERS } from '../constants.js'
import { SPECIES, SPECIES_BY_ID } from '../data/species.js'
import { EVENTS, ROUTE_BY_ID } from '../data/routes.js'
import { RunGenerator } from './RunGenerator.js'

export function xpForNextLevel(level) {
  return 50 + level * 25
}

export function xpToReachLevel(level) {
  let total = 0
  for (let current = 1; current < level; current += 1) total += xpForNextLevel(current)
  return total
}

export function levelForXp(xp) {
  let level = 1
  while (level < 20 && xp >= xpToReachLevel(level + 1)) level += 1
  return level
}

export function createDefaultProfile() {
  return {
    version: PROFILE_VERSION,
    xp: 0,
    level: 1,
    coins: 0,
    research: 0,
    ecology: 60,
    completedRuns: 0,
    runsWithoutNew: 0,
    selectedTool: 'lens',
    collection: {}
  }
}

export function sanitizeProfile(raw) {
  const defaults = createDefaultProfile()
  if (!raw || typeof raw !== 'object') return defaults
  const numberOr = (value, fallback = 0) => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  const rawCollection = raw.collection && typeof raw.collection === 'object' ? raw.collection : {}
  const collection = {}
  SPECIES.forEach((species) => {
    const entry = rawCollection[species.id]
    if (!entry || typeof entry !== 'object') return
    collection[species.id] = {
      seen: Math.max(0, Math.floor(numberOr(entry.seen))),
      identified: Math.max(0, Math.floor(numberOr(entry.identified))),
      photographed: Math.max(0, Math.floor(numberOr(entry.photographed))),
      samples: Math.max(0, Math.floor(numberOr(entry.samples))),
      left: Math.max(0, Math.floor(numberOr(entry.left)))
    }
  })
  const profile = { ...defaults, ...raw, version: PROFILE_VERSION, collection }
  profile.xp = Math.max(0, numberOr(profile.xp))
  profile.level = levelForXp(profile.xp)
  profile.coins = Math.max(0, numberOr(profile.coins))
  profile.research = Math.max(0, numberOr(profile.research))
  profile.ecology = clamp(numberOr(profile.ecology, defaults.ecology), 0, 100)
  profile.completedRuns = Math.max(0, Math.floor(numberOr(profile.completedRuns)))
  profile.runsWithoutNew = Math.max(0, Math.floor(numberOr(profile.runsWithoutNew)))
  if (!['lens', 'sampleBox', 'tracker'].includes(profile.selectedTool)) profile.selectedTool = 'lens'
  return profile
}

export class GameState {
  constructor(profile = null, generator = new RunGenerator()) {
    this.profile = sanitizeProfile(profile)
    this.generator = generator
    this.currentRun = null
    this.lastResult = null
  }

  selectTool(toolId) {
    if (!['lens', 'sampleBox', 'tracker'].includes(toolId)) throw new Error(`Unknown tool: ${toolId}`)
    this.profile.selectedTool = toolId
  }

  startRun(routeId, seed = Date.now()) {
    if (!ROUTE_BY_ID[routeId]) throw new Error(`Unknown route: ${routeId}`)
    const undiscoveredIds = SPECIES
      .filter((species) => !this.profile.collection[species.id]?.seen)
      .map((species) => species.id)

    this.currentRun = this.generator.generate({
      routeId,
      toolId: this.profile.selectedTool,
      seed,
      ecology: this.profile.ecology,
      undiscoveredIds,
      pity: this.profile.runsWithoutNew
    })
    this.currentRun.weatherId = WEATHERS[this.profile.completedRuns % WEATHERS.length].id
    this.lastResult = null
    return this.currentRun
  }

  get currentEncounter() {
    if (!this.currentRun || this.currentRun.completed) return null
    return this.currentRun.encounters[this.currentRun.index]
  }

  get currentSpecies() {
    const encounter = this.currentEncounter
    return encounter?.kind === 'fungus' ? SPECIES_BY_ID[encounter.speciesId] : null
  }

  get currentEvent() {
    const encounter = this.currentEncounter
    return encounter?.kind === 'event' ? EVENTS[encounter.eventId] : null
  }

  observe() {
    const encounter = this._requireFungusEncounter()
    if (encounter.identifiedId) return encounter.observed
    const amount = this.currentRun.toolId === 'lens' && encounter.observed === 0 ? 2 : 1
    encounter.observed = Math.min(3, encounter.observed + amount)
    return encounter.observed
  }

  canIdentify() {
    const encounter = this.currentEncounter
    return Boolean(encounter?.kind === 'fungus' && encounter.observed >= 2 && !encounter.identifiedId)
  }

  identify(speciesId) {
    const encounter = this._requireFungusEncounter()
    if (encounter.observed < 2) throw new Error('At least two clues are required')
    if (encounter.identifiedId) throw new Error('Encounter already identified')
    if (!encounter.candidates.includes(speciesId)) throw new Error('Species is not a candidate')

    const entry = this._runCollectionEntry(encounter.speciesId)
    const alreadySeen = (this.profile.collection[encounter.speciesId]?.seen || 0) + entry.seen
    const isNew = alreadySeen === 0
    encounter.identifiedId = speciesId
    encounter.correct = speciesId === encounter.speciesId
    entry.seen += 1

    if (encounter.correct) {
      entry.identified += 1
      this.currentRun.totals.correct += 1
      this.currentRun.totals.research += 2
    }
    if (isNew && !this.currentRun.newSpecies.includes(encounter.speciesId)) {
      this.currentRun.newSpecies.push(encounter.speciesId)
    }

    return { correct: encounter.correct, answer: encounter.speciesId, isNew }
  }

  decide(decisionId) {
    const encounter = this._requireFungusEncounter()
    if (!encounter.identifiedId) throw new Error('Identify before making a field decision')
    if (encounter.decision) throw new Error('Decision already made')

    const validDecisions = ['photo', 'collect', 'leave']
    if (!validDecisions.includes(decisionId)) throw new Error(`Unknown decision: ${decisionId}`)
    const entry = this._runCollectionEntry(encounter.speciesId)
    encounter.decision = decisionId

    if (decisionId === 'photo') {
      this.currentRun.totals.coins += 1
      this.currentRun.totals.research += 1
      entry.photographed += 1
    } else if (decisionId === 'collect') {
      this.currentRun.totals.coins += 6
      if (this.currentRun.toolId === 'sampleBox') this.currentRun.totals.coins += 4
      this.currentRun.ecologyCurrent = clamp(this.currentRun.ecologyCurrent - 3, 0, 100)
      entry.samples += 1
    } else if (decisionId === 'leave') {
      this.currentRun.totals.research += 2
      this.currentRun.ecologyCurrent = clamp(this.currentRun.ecologyCurrent + 3, 0, 100)
      entry.left += 1
    } else {
      throw new Error(`Unknown decision: ${decisionId}`)
    }

    return this._advance()
  }

  resolveEvent(optionId) {
    const encounter = this.currentEncounter
    if (!encounter || encounter.kind !== 'event') throw new Error('Current encounter is not an event')
    if (encounter.resolvedOptionId) throw new Error('Event already resolved')
    const event = EVENTS[encounter.eventId]
    const option = event.options.find((item) => item.id === optionId)
    if (!option) throw new Error(`Unknown event option: ${optionId}`)

    encounter.resolvedOptionId = optionId
    this.currentRun.totals.coins += option.coins
    this.currentRun.totals.research += option.research
    this.currentRun.ecologyCurrent = clamp(this.currentRun.ecologyCurrent + option.ecology, 0, 100)
    return this._advance()
  }

  _runCollectionEntry(speciesId) {
    if (!this.currentRun.collectionDelta[speciesId]) {
      this.currentRun.collectionDelta[speciesId] = {
        seen: 0,
        identified: 0,
        photographed: 0,
        samples: 0,
        left: 0
      }
    }
    return this.currentRun.collectionDelta[speciesId]
  }

  _requireFungusEncounter() {
    const encounter = this.currentEncounter
    if (!encounter || encounter.kind !== 'fungus') throw new Error('Current encounter is not a fungus')
    return encounter
  }

  _advance() {
    const run = this.currentRun
    if (run.index < run.encounters.length - 1) {
      run.index += 1
      return { completed: false, encounter: this.currentEncounter }
    }
    return { completed: true, result: this._finalizeRun() }
  }

  _finalizeRun() {
    const run = this.currentRun
    if (run.completed) return run.result

    run.completed = true
    run.totals.coins += 8
    const positiveEcology = Math.max(0, run.ecologyCurrent - run.ecologyStart)
    run.totals.xp = 10 + run.totals.correct * 5 + run.newSpecies.length * 8 + positiveEcology

    Object.entries(run.collectionDelta).forEach(([speciesId, delta]) => {
      const target = this.profile.collection[speciesId] || {
        seen: 0,
        identified: 0,
        photographed: 0,
        samples: 0,
        left: 0
      }
      Object.keys(delta).forEach((key) => { target[key] += delta[key] })
      this.profile.collection[speciesId] = target
    })

    this.profile.coins += run.totals.coins
    this.profile.research += run.totals.research
    this.profile.ecology = run.ecologyCurrent
    this.profile.xp += run.totals.xp
    this.profile.level = levelForXp(this.profile.xp)
    this.profile.completedRuns += 1
    this.profile.runsWithoutNew = run.newSpecies.length > 0 ? 0 : this.profile.runsWithoutNew + 1

    run.result = {
      routeId: run.routeId,
      coins: run.totals.coins,
      research: run.totals.research,
      xp: run.totals.xp,
      correct: run.totals.correct,
      ecologyDelta: run.ecologyCurrent - run.ecologyStart,
      newSpecies: run.newSpecies.slice(),
      level: this.profile.level
    }
    this.lastResult = run.result
    return run.result
  }
}

import test from 'node:test'
import assert from 'node:assert/strict'

import { GameState, levelForXp, sanitizeProfile, xpToReachLevel } from '../js/core/GameState.js'
import { SeededRandom } from '../js/core/Random.js'
import { RunGenerator } from '../js/core/RunGenerator.js'
import { StorageService } from '../js/core/StorageService.js'
import { SPECIES } from '../js/data/species.js'
import { ROUTE_BY_ID } from '../js/data/routes.js'

test('seeded random is deterministic', () => {
  const first = new SeededRandom('rain')
  const second = new SeededRandom('rain')
  assert.deepEqual(
    [first.next(), first.next(), first.next()],
    [second.next(), second.next(), second.next()]
  )
})

test('run generator creates three fungus encounters and one event', () => {
  const generator = new RunGenerator()
  const run = generator.generate({
    routeId: 'mistPath',
    toolId: 'lens',
    seed: 42,
    ecology: 60,
    undiscoveredIds: SPECIES.map((species) => species.id),
    pity: 0
  })
  assert.equal(run.encounters.length, 4)
  assert.equal(run.encounters.filter((item) => item.kind === 'fungus').length, 3)
  assert.equal(run.encounters.filter((item) => item.kind === 'event').length, 1)
  run.encounters.filter((item) => item.kind === 'fungus').forEach((encounter) => {
    assert.equal(encounter.candidates.length, 3)
    assert.ok(encounter.candidates.includes(encounter.speciesId))
    assert.equal(new Set(encounter.candidates).size, 3)
  })
})

test('tracker guarantees an unseen species available on the route', () => {
  const generator = new RunGenerator()
  const unseen = ['rainBell']
  const run = generator.generate({
    routeId: 'mistPath',
    toolId: 'tracker',
    seed: 12,
    ecology: 60,
    undiscoveredIds: unseen,
    pity: 0
  })
  const generatedIds = run.encounters
    .filter((item) => item.kind === 'fungus')
    .map((item) => item.speciesId)
  assert.ok(generatedIds.includes('rainBell'))
})

test('lens reveals two clues on first observation', () => {
  const state = new GameState()
  state.selectTool('lens')
  state.startRun('mistPath', 3)
  while (state.currentEncounter.kind === 'event') state.resolveEvent(state.currentEvent.options[0].id)
  assert.equal(state.observe(), 2)
  assert.equal(state.canIdentify(), true)
})

test('a complete careful run updates ecology, collection and progression', () => {
  const state = new GameState()
  state.selectTool('lens')
  state.startRun('mistPath', 9)

  while (!state.currentRun.completed) {
    if (state.currentEncounter.kind === 'event') {
      state.resolveEvent(state.currentEvent.options[0].id)
      continue
    }
    state.observe()
    const speciesId = state.currentEncounter.speciesId
    const identification = state.identify(speciesId)
    assert.equal(identification.correct, true)
    state.decide('leave')
  }

  assert.equal(state.profile.completedRuns, 1)
  assert.equal(state.lastResult.correct, 3)
  assert.equal(state.lastResult.newSpecies.length, 3)
  assert.ok(state.profile.ecology > 60)
  assert.ok(state.profile.research >= 12)
  assert.ok(state.profile.xp > 0)
  state.lastResult.newSpecies.forEach((id) => {
    assert.equal(state.profile.collection[id].identified, 1)
    assert.equal(state.profile.collection[id].left, 1)
  })
})

test('sample box grants collection bonus and collection costs ecology', () => {
  const state = new GameState()
  state.selectTool('sampleBox')
  state.startRun('oldLog', 5)
  while (state.currentEncounter.kind === 'event') state.resolveEvent(state.currentEvent.options[0].id)
  state.observe()
  state.observe()
  state.identify(state.currentEncounter.speciesId)
  const ecologyBefore = state.currentRun.ecologyCurrent
  state.decide('collect')
  assert.equal(state.currentRun.ecologyCurrent, ecologyBefore - 3)
  assert.equal(state.currentRun.totals.coins, 10)
})

test('level calculations use cumulative total experience', () => {
  assert.equal(xpToReachLevel(1), 0)
  assert.equal(xpToReachLevel(2), 75)
  assert.equal(xpToReachLevel(3), 175)
  assert.equal(levelForXp(74), 1)
  assert.equal(levelForXp(75), 2)
  assert.equal(levelForXp(175), 3)
})

test('invalid saved values are sanitized', () => {
  const profile = sanitizeProfile({
    xp: -20,
    coins: 'bad',
    research: -1,
    ecology: 500,
    selectedTool: 'axe',
    collection: null
  })
  assert.equal(profile.xp, 0)
  assert.equal(profile.coins, 0)
  assert.equal(profile.research, 0)
  assert.equal(profile.ecology, 100)
  assert.equal(profile.selectedTool, 'lens')
  assert.deepEqual(profile.collection, {})
})

test('storage service saves and restores a profile object', () => {
  const memory = new Map()
  const api = {
    getStorageSync: (key) => memory.get(key),
    setStorageSync: (key, value) => memory.set(key, value),
    removeStorageSync: (key) => memory.delete(key)
  }
  const storage = new StorageService(api, 'test-save')
  assert.equal(storage.load(), null)
  assert.equal(storage.save({ ecology: 72 }), true)
  assert.deepEqual(storage.load(), { ecology: 72 })
  assert.equal(storage.clear(), true)
  assert.equal(storage.load(), null)
})

test('all route species references are valid', () => {
  const ids = new Set(SPECIES.map((species) => species.id))
  Object.values(ROUTE_BY_ID).forEach((route) => {
    route.speciesPool.forEach((id) => assert.ok(ids.has(id), `${route.id} references ${id}`))
  })
})


test('zero ecology is preserved and collection counters are repaired', () => {
  const profile = sanitizeProfile({
    ecology: 0,
    collection: {
      rainBell: { seen: '2', identified: -3, photographed: 'bad', samples: 1.9, left: 4 }
    }
  })
  assert.equal(profile.ecology, 0)
  assert.deepEqual(profile.collection.rainBell, {
    seen: 2,
    identified: 0,
    photographed: 0,
    samples: 1,
    left: 4
  })
})


test('abandoned run does not commit partial collection progress', () => {
  const state = new GameState()
  state.selectTool('lens')
  state.startRun('mistPath', 77)
  state.observe()
  state.identify(state.currentEncounter.speciesId)
  assert.deepEqual(state.profile.collection, {})
  state.startRun('oldLog', 78)
  assert.deepEqual(state.profile.collection, {})
  assert.equal(state.profile.completedRuns, 0)
})

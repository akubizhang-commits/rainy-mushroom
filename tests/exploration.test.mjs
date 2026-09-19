import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

import {
  ALL_EXPLORATION_IMAGES,
  ALL_CARD_ILLUSTRATIONS,
  ALL_HABITAT_IMAGES,
  ALL_SCENE_ILLUSTRATIONS,
  ALL_SPECIES_IMAGES,
  ALL_TARGET_ILLUSTRATIONS,
  EXPLORATION_SPECIES,
  LEGACY_SPECIES,
  IDENTIFICATION_OPTIONS,
  ECO_REGIONS,
  ECO_REGION_BY_ID,
  RARITY_LABELS,
  RESEARCH_VALUE_BY_ID,
  SCENES,
  SCENE_BY_ID,
  SPECIES_BY_ID,
  getIdentificationClues
} from '../js/data/explorationData.js'
import { ExplorationState, EXPLORATION_SCREEN, sanitizeExplorationProfile } from '../js/core/ExplorationState.js'
import { ExplorationRenderer } from '../js/ui/ExplorationRenderer.js'
import { ExplorationGame } from '../js/ExplorationGame.js'
import { habitatGeometry, targetGeometry } from '../js/ui/HabitatView.js'

const WARM_MOUNTAIN_SCENE = SCENE_BY_ID['yn-pine']

function discoverAll(state, scene = state.sceneData) {
  scene.spawns.forEach((spawn) => state.discover(spawn.id))
}

function identifyCurrent(state, candidateId = state.selectedSpecies.id) {
  if (state.selectedIdentified) return { correct: true, species: state.selectedSpecies }
  while (!state.canIdentifySelected()) state.observeSelectedClue()
  return state.identifySelected(candidateId)
}

function discoverAndIdentify(state, spawn) {
  state.discover(spawn.id)
  return identifyCurrent(state)
}

function completeSafeWarmMountainRun(state) {
  state.startScene(WARM_MOUNTAIN_SCENE.id)
  state.startHunt('relaxed')
  WARM_MOUNTAIN_SCENE.spawns.forEach((spawn) => {
    state.discover(spawn.id)
    identifyCurrent(state)
    const species = SPECIES_BY_ID[spawn.speciesId]
    if (species.isHighRisk) state.markSelectedRisk()
    else if (!species.observeOnly && state.goalProgress < state.goalTarget) state.addSelectedToBasket()
  })
  return state.finishScene()
}

test('species define concise rarity, research value and three-option identification data', () => {
  assert.deepEqual(RARITY_LABELS, { 1: '常见', 2: '少见', 3: '罕见', 4: '珍稀' })
  EXPLORATION_SPECIES.forEach((species) => {
    assert.ok(RESEARCH_VALUE_BY_ID[species.id] >= 1 && RESEARCH_VALUE_BY_ID[species.id] <= 4)
    const clues = getIdentificationClues(species.id)
    assert.equal(clues.length, 3)
    assert.deepEqual(clues.map((clue) => clue.label), ['生境', '整体与幼体', '关键结构'])
    clues.forEach((clue) => assert.ok(Number.isInteger(clue.photoIndex) && clue.photoIndex >= 0 && clue.photoIndex < species.photos.length))
    if(species.expanded)assert.deepEqual(clues.map(clue=>clue.photoIndex),[0,0,1])
    else assert.notEqual(clues[0].photoIndex, clues[1].photoIndex)
    assert.notEqual(clues[1].photoIndex, clues[2].photoIndex)
    assert.equal(new Set(IDENTIFICATION_OPTIONS[species.id]).size, 3)
    assert.ok(IDENTIFICATION_OPTIONS[species.id].includes(species.id))
    IDENTIFICATION_OPTIONS[species.id].forEach((id) => assert.ok(SPECIES_BY_ID[id]))
  })
})

test('map uses four non-administrative ecological regions with two habitats each', () => {
  assert.deepEqual(ECO_REGIONS.map((item) => item.name), ['暖湿山地', '寒温带森林', '冷湿过渡带', '温带丘陵林地'])
  assert.equal(ECO_REGIONS.some((item) => /云南|黑龙江|吉林|辽宁|东北/.test(item.name)), false)
  ECO_REGIONS.forEach((region) => assert.equal(region.sceneIds.length, 2))
})

test('all habitats have real backgrounds, timed goals and fixed valid fungus clusters', () => {
  assert.equal(SCENES.length, 8)
  const environments = new Set(SCENES.map((item) => item.environment))
  assert.ok(environments.has('river'))
  assert.ok(environments.has('meadow'))
  assert.ok(environments.has('alpine'))
  SCENES.forEach((scene) => {
    assert.ok(ECO_REGION_BY_ID[scene.regionId])
    assert.ok(ECO_REGION_BY_ID[scene.regionId].sceneIds.includes(scene.id))
    assert.ok(scene.background.startsWith('assets/exploration/habitats/'))
    assert.ok(fs.existsSync(scene.background), scene.background)
    assert.equal(scene.timeLimitMs, 90000)
    assert.ok(['collect', 'observe'].includes(scene.goalType))
    assert.ok(scene.animalName && scene.animalIcon)
    assert.equal(scene.spawns.length, scene.targetFindCount)
    assert.ok(scene.capacity >= 2 && scene.capacity <= 3)
    const safeCount = scene.spawns.reduce((sum, spawn) => {
      const species = SPECIES_BY_ID[spawn.speciesId]
      return sum + (!species.isHighRisk && !species.observeOnly ? spawn.count : 0)
    }, 0)
    if (scene.goalType === 'collect') assert.ok(safeCount >= scene.targetCollectCount, `${scene.id}: safe route`)
    else assert.equal(scene.targetCollectCount, 0)
    scene.spawns.forEach((spawn) => {
      assert.ok(SPECIES_BY_ID[spawn.speciesId], `${scene.id}: missing ${spawn.speciesId}`)
      assert.ok(spawn.x > 0 && spawn.x < 1 && spawn.y > 0 && spawn.y < 1)
      assert.ok(['easy', 'hidden', 'veryHidden'].includes(spawn.visibility))
      assert.ok(Number.isInteger(spawn.count) && spawn.count > 0)
    })
  })
})

test('every scene has a safe quantity route through identification', () => {
  SCENES.forEach((scene) => {
    const state = new ExplorationState()
    state.startScene(scene.id)
    state.startHunt('relaxed')
    scene.spawns.forEach((spawn) => {
      state.discover(spawn.id)
      assert.equal(identifyCurrent(state).correct, true)
      const species = SPECIES_BY_ID[spawn.speciesId]
      if (species.isHighRisk) state.markSelectedRisk()
      else if (!species.observeOnly && state.goalProgress < state.goalTarget) state.addSelectedToBasket()
    })
    assert.equal(state.canFinish(), true, scene.id)
    const result = state.finishScene()
    assert.equal(result.status, 'success', scene.id)
    if (scene.goalType === 'collect') assert.ok(result.collectedMushroomCount >= scene.targetCollectCount)
    else assert.equal(result.foundCount, scene.targetFindCount)
  })
})

test('every configured anchor has a dedicated local environment drawing path', () => {
  const anchors = new Set(SCENES.flatMap((scene) => scene.spawns.map((spawn) => spawn.anchor)))
  assert.deepEqual([...anchors].sort(), ['birch', 'grass', 'leaves', 'log', 'mound', 'needles', 'roots', 'soil', 'stump', 'tree'])
  const operations = []
  const context = createMockContext()
  ;['fill', 'stroke', 'fillRect'].forEach((method) => { context[method] = () => operations.push(method) })
  const renderer = new ExplorationRenderer({ width: 375, height: 812, getContext: () => context }, 78, createReadyImageStore())
  anchors.forEach((anchor) => {
    const before = operations.length
    const spawn = { anchor, visibility: 'veryHidden' }
    assert.doesNotThrow(() => renderer._drawAnchorBase(spawn, 100, 100, 20))
    assert.doesNotThrow(() => renderer._drawConcealment(spawn, 100, 100, 20))
    assert.ok(operations.length > before, `${anchor} should draw a local anchor`)
  })
})

test('all eight real habitat photos and their CC0 source records are local', () => {
  assert.equal(ALL_HABITAT_IMAGES.length, 8)
  assert.equal(new Set(ALL_HABITAT_IMAGES).size, 8)
  ALL_HABITAT_IMAGES.forEach((image) => assert.ok(fs.existsSync(image), image))
  const attribution = JSON.parse(fs.readFileSync('assets/exploration/HABITAT_ATTRIBUTION.json', 'utf8'))
  assert.equal(attribution.length, 8)
  attribution.forEach((item) => {
    assert.equal(item.license, 'cc0')
    assert.equal(item.creator, 'Martin Vorel')
    assert.ok(item.source.startsWith('https://libreshot.com/'))
    assert.ok(item.url.startsWith('https://libreshot.com/'))
    assert.ok(fs.existsSync(item.localPath), item.localPath)
    assert.match(item.usageNote, /not a collection location/)
    assert.equal(SCENE_BY_ID[item.sceneId].background, item.localPath)
  })
})

test('species photos and generated scene illustration assets are complete', () => {
  assert.equal(LEGACY_SPECIES.length, 13)
  assert.equal(EXPLORATION_SPECIES.length, 41)
  assert.equal(ALL_SPECIES_IMAGES.length, EXPLORATION_SPECIES.length*2)
  assert.equal(ALL_SCENE_ILLUSTRATIONS.length, 8)
  assert.equal(ALL_CARD_ILLUSTRATIONS.length, 8)
  assert.equal(ALL_TARGET_ILLUSTRATIONS.length, 32)
  assert.equal(ALL_EXPLORATION_IMAGES.length, 82+(EXPLORATION_SPECIES.length-LEGACY_SPECIES.length)*2)
  ALL_SCENE_ILLUSTRATIONS.forEach((image) => assert.ok(fs.existsSync(image), `missing ${image}`))
  ALL_CARD_ILLUSTRATIONS.forEach((image) => assert.ok(fs.existsSync(image), `missing ${image}`))
  ALL_TARGET_ILLUSTRATIONS.forEach((image) => assert.ok(fs.existsSync(image), `missing ${image}`))
  SCENES.forEach((scene) => {
    assert.match(scene.illustration, new RegExp(`/scenes/${scene.id}\\.jpg$`))
    assert.match(scene.cardIllustration, new RegExp(`/cards/${scene.id}\\.jpg$`))
    scene.spawns.forEach((spawn) => assert.match(spawn.illustration, new RegExp(`/targets/${spawn.id}\\.png$`)))
  })
  const illustrationManifest = JSON.parse(fs.readFileSync('assets/exploration/illustrations/MANIFEST.json', 'utf8'))
  assert.equal(illustrationManifest.sceneIllustrations.length, 8)
  assert.equal(illustrationManifest.targetIllustrations.length, 32)
  illustrationManifest.sceneIllustrations.forEach((item) => {
    assert.equal(item.referenceLicense, 'cc0')
    assert.ok(fs.existsSync(item.localPath), item.localPath)
    assert.ok(fs.existsSync(item.cardPath), item.cardPath)
  })
  illustrationManifest.targetIllustrations.forEach((item) => {
    assert.match(item.method, /no pixels copied/)
    assert.ok(fs.existsSync(item.localPath), item.localPath)
  })
  EXPLORATION_SPECIES.forEach((species) => {
    assert.equal(species.photos.length, 2)
    species.photos.forEach((path) => assert.ok(fs.existsSync(path), `missing ${path}`))
    assert.ok(species.sourceUrl.startsWith('https://'))
    assert.ok(species.boundary)
  })
  const attribution = JSON.parse(fs.readFileSync('assets/exploration/ATTRIBUTION.json', 'utf8'))
  assert.equal(attribution.length, 26)
  attribution.forEach((item) => {
    assert.ok(item.license.startsWith('cc'))
    assert.ok(item.attribution)
    assert.ok(item.observation.startsWith('https://'))
    assert.ok(fs.existsSync(item.localPath))
  })
})

test('scene cards and exploration use the same current photographic habitat', () => {
  const drawn = []
  const ctx = createMockContext()
  ctx.drawImage = image => drawn.push(image.path)
  const renderer = new ExplorationRenderer({width:375,height:812,getContext:()=>ctx},78,
    {get:path=>({status:'ready',image:{path,width:861,height:574}})})
  const state = new ExplorationState()
  ECO_REGIONS.forEach(region => {
    state.selectRegion(region.id)
    renderer.render({screen:EXPLORATION_SCREEN.SCENES,state},1000)
    region.sceneIds.forEach(id => assert.ok(drawn.includes(SCENE_BY_ID[id].habitat.fallbackPhoto)))
  })
})

test('discovering a fungus creates an unknown collection entry without revealing identity', () => {
  const state = new ExplorationState()
  state.startScene('yn-alpine')
  const spawn = state.sceneData.spawns[0]
  const result = state.discover(spawn.id)
  const entry = state.getCollectionEntry(spawn.speciesId)
  assert.equal(result.firstDiscovery, true)
  assert.equal(entry.seen, true)
  assert.equal(entry.examined, false)
  assert.equal(entry.identified, false)
  assert.equal(entry.sampled, 0)
  assert.equal(entry.regions['warm-mountain'], true)
})

test('three clues unlock identification and a wrong choice does not reveal the answer', () => {
  const state = new ExplorationState()
  state.startScene('yn-pine')
  const spawn = state.sceneData.spawns[0]
  state.discover(spawn.id)
  assert.equal(state.canIdentifySelected(), false)
  assert.throws(() => state.identifySelected(spawn.speciesId), /观察完整/)
  let previousPhotoIndex = state.currentRun.photoIndex
  getIdentificationClues(spawn.speciesId).forEach((expectedClue, index) => {
    const observation = state.observeSelectedClue()
    assert.equal(observation.clue.id, expectedClue.id)
    assert.equal(observation.photoIndex, expectedClue.photoIndex)
    assert.equal(state.currentRun.photoIndex, expectedClue.photoIndex)
    assert.notEqual(state.currentRun.photoIndex, previousPhotoIndex)
    assert.equal(observation.complete, index === 2)
    previousPhotoIndex = state.currentRun.photoIndex
  })
  assert.equal(state.canIdentifySelected(), true)
  const wrongId = IDENTIFICATION_OPTIONS[spawn.speciesId].find((id) => id !== spawn.speciesId)
  const wrong = state.identifySelected(wrongId)
  assert.equal(wrong.correct, false)
  assert.equal(wrong.species, null)
  assert.equal(state.getCollectionEntry(spawn.speciesId).identified, false)
  const correct = state.identifySelected(spawn.speciesId)
  assert.equal(correct.correct, true)
  assert.equal(state.getCollectionEntry(spawn.speciesId).identified, true)
})

test('every fungus observation advances through alternating clue-linked photos', () => {
  const coveredSpecies = new Set()
  SCENES.forEach((scene) => {
    scene.spawns.forEach((spawn) => {
      if (coveredSpecies.has(spawn.speciesId)) return
      coveredSpecies.add(spawn.speciesId)
      const state = new ExplorationState()
      state.startScene(scene.id)
      state.discover(spawn.id)
      let previousPhotoIndex = state.currentRun.photoIndex
      getIdentificationClues(spawn.speciesId).forEach((clue) => {
        const result = state.observeSelectedClue()
        assert.equal(result.photoIndex, clue.photoIndex, `${spawn.speciesId}: ${clue.id}`)
        assert.notEqual(result.photoIndex, previousPhotoIndex, `${spawn.speciesId}: ${clue.id} should switch photo`)
        previousPhotoIndex = result.photoIndex
      })
    })
  })
  assert.equal(coveredSpecies.size, LEGACY_SPECIES.length)
})

test('unidentified fungi cannot be sampled, risk-marked or counted as scene completion', () => {
  const state = new ExplorationState()
  state.startScene('yn-alpine')
  const spawn = state.sceneData.spawns[0]
  state.discover(spawn.id)
  assert.throws(() => state.addSelectedToBasket(), /成功鉴定/)
  assert.throws(() => state.markSelectedRisk(), /成功鉴定/)
  discoverAll(state)
  assert.equal(state.identifiedSpeciesCount, 0)
  assert.equal(state.canFinish(), false)
  assert.equal(state.finishScene().status, 'incomplete')
})

test('basket tracks mushroom quantities and removal decrements the total', () => {
  const state = new ExplorationState()
  state.startScene('hl-meadow')
  state.startHunt('relaxed')
  const safe = state.sceneData.spawns.filter((spawn) => {
    const species = SPECIES_BY_ID[spawn.speciesId]
    return !species.isHighRisk && !species.observeOnly
  })
  safe.forEach((spawn) => {
    discoverAndIdentify(state, spawn)
    state.addSelectedToBasket()
  })
  assert.equal(state.currentRun.basketSpawnIds.length, state.sceneData.capacity)
  assert.equal(state.currentRun.collectedMushroomCount, safe.reduce((sum, spawn) => sum + spawn.count, 0))
  const removed = safe[0]
  assert.equal(state.removeFromBasket(removed.id), true)
  assert.equal(state.currentRun.collectedMushroomCount, safe.slice(1).reduce((sum, spawn) => sum + spawn.count, 0))
})

test('collecting an identified high-risk fungus fails immediately without adding it', () => {
  const state = new ExplorationState()
  state.startScene(WARM_MOUNTAIN_SCENE.id)
  state.startHunt('relaxed')
  const toxic = WARM_MOUNTAIN_SCENE.spawns.find((spawn) => SPECIES_BY_ID[spawn.speciesId].isHighRisk)
  state.discover(toxic.id)
  identifyCurrent(state)
  const action = state.addSelectedToBasket()
  assert.equal(action.added, false)
  assert.equal(action.failed, true)
  assert.equal(action.result.status, 'risk-failure')
  assert.deepEqual(action.result.highRiskSpecies, [toxic.speciesId])
  assert.equal(action.result.basketSpeciesIds.length, 0)
  assert.equal(state.currentRun.completed, true)
  assert.equal(state.profile.successfulChallenges, 0)
})

test('sampling an identified observe-only fungus fails immediately', () => {
  const state = new ExplorationState()
  state.startScene(WARM_MOUNTAIN_SCENE.id)
  state.startHunt('relaxed')
  const rare = WARM_MOUNTAIN_SCENE.spawns.find((spawn) => SPECIES_BY_ID[spawn.speciesId].observeOnly)
  state.discover(rare.id)
  identifyCurrent(state)
  const action = state.addSelectedToBasket()
  assert.equal(action.failed, true)
  assert.equal(action.result.status, 'observation-rule-failure')
  assert.deepEqual(action.result.observationOnlySpecies, [rare.speciesId])
  assert.equal(action.result.basketSpeciesIds.length, 0)
})

test('safe challenge completion is counted only once and risk recognition persists', () => {
  const state = new ExplorationState()
  const first = completeSafeWarmMountainRun(state)
  assert.equal(first.status, 'success')
  assert.equal(state.profile.successfulChallenges, 1)
  const toxicId = WARM_MOUNTAIN_SCENE.spawns.find((spawn) => SPECIES_BY_ID[spawn.speciesId].isHighRisk).speciesId
  assert.equal(state.getCollectionEntry(toxicId).riskRecognized, true)
  const second = completeSafeWarmMountainRun(state)
  assert.equal(second.status, 'success')
  assert.equal(state.profile.successfulChallenges, 1)
  assert.equal(state.profile.sceneAttempts[WARM_MOUNTAIN_SCENE.id], 2)
})

test('high-alpine rare scene succeeds through observation without collecting', () => {
  const state = new ExplorationState()
  state.startScene('yn-alpine')
  discoverAll(state)
  identifyCurrent(state)
  assert.equal(state.sceneData.goalType, 'observe')
  assert.equal(state.sceneData.targetCollectCount, 0)
  assert.equal(state.canFinish(), true)
  assert.equal(state.finishScene().status, 'success')
  const entry = state.getCollectionEntry('ophiocordyceps-sinensis')
  assert.equal(entry.seen, true)
  assert.equal(entry.sampled, 0)
})

test('foreground elapsed time is exact while paused time is excluded', () => {
  const foreground = new ExplorationState()
  foreground.startScene('hl-meadow')
  foreground.startHunt('timed', 1000)
  const timedOut = foreground.tickHunt(91000)
  assert.equal(timedOut.status, 'animal-timeout')
  assert.equal(timedOut.timeRemainingMs, 0)
  assert.ok(timedOut.eatenCount > 0)

  const paused = new ExplorationState()
  paused.startScene('hl-meadow')
  paused.startHunt('timed', 1000)
  paused.tickHunt(2000)
  assert.equal(paused.currentRun.timeRemainingMs, 89000)
  paused.pauseHunt()
  paused.tickHunt(100000)
  assert.equal(paused.currentRun.timeRemainingMs, 89000)
  paused.tickHunt(100500)
  assert.equal(paused.currentRun.timeRemainingMs, 88500)
})

test('relaxed search has no countdown and lens focus is safely clamped', () => {
  const state = new ExplorationState()
  state.startScene('jl-river')
  state.startHunt('relaxed', 1000)

  state.tickHunt(999999)
  assert.equal(state.currentRun.timeRemainingMs, state.sceneData.timeLimitMs)
  assert.deepEqual(state.showLensAt(-5, 8), { x: 0, y: 1 })
  assert.equal(state.currentRun.lensActive, true)
  state.hideLens()
  assert.equal(state.currentRun.lensActive, false)
})

test('wx onHide pauses the timed hunt before a long background gap', () => {
  const platform = createPlatform()
  const canvas = { width: 375, height: 812, getContext: () => createMockContext(), requestAnimationFrame: () => {} }
  const game = new ExplorationGame(canvas, 78, platform)
  game.state.startScene('hl-meadow')
  game.state.startHunt('timed', 1000)
  platform.handlers.hide()
  game.state.tickHunt(91000)
  assert.equal(game.state.currentRun.timeRemainingMs, 90000)
  assert.equal(game.state.currentRun.completed, false)
})

function centerOnSpawn(renderer, state, spawn) {
  const view = renderer.habitatView || habitatGeometry(375, renderer.logicalHeight)
  const x = state.sceneData.habitat.hasGeneratedArt ? spawn.x : spawn.photoX
  state.setCameraPosition((x * view.worldWidth - 187.5) / view.travel)
  renderer.render({screen:EXPLORATION_SCREEN.EXPLORE,state,feedback:''},1000)
  return renderer.hitAreas.find(area => area.action === `fungus:${spawn.id}`)
}

test('all 32 fungi are rendered and directly tappable without a magnifier on every phone size', () => {
  for (const [width,height,safeTop] of [[320,568,50],[375,667,54],[375,812,78],[430,932,90]]) {
    const drawn = []
    const ctx = createMockContext()
    ctx.drawImage = image => drawn.push(image.path)
    const renderer = new ExplorationRenderer({width,height,getContext:()=>ctx},safeTop,
      {get:path=>({status:'ready',image:{path,width:861,height:574}})})
    for (const scene of SCENES) {
      const state = new ExplorationState()
      state.startScene(scene.id); state.startHunt('relaxed')
      renderer.render({screen:EXPLORATION_SCREEN.EXPLORE,state},1000)
      assert.equal(renderer.sceneBounds.w * renderer.sceneBounds.h / (width * height),1)
      assert.equal(renderer.lensBounds,null)
      for (const spawn of scene.spawns) {
        const area = centerOnSpawn(renderer,state,spawn)
        assert.ok(area, `${width}x${height}/${spawn.id}: inaccessible`)
        assert.ok(drawn.includes(spawn.naturalSprite),`${spawn.id}: sprite not drawn`)
        assert.equal(renderer.getFungusActionAt({x:area.cx,y:area.cy},scene,state.currentRun),`fungus:${spawn.id}`)
        for (const control of renderer.habitatControls) {
          const ax=area.cx/renderer.scale, ay=area.cy/renderer.scale
          assert.equal(ax >= control.x && ax <= control.x+control.w && ay >= control.y && ay <= control.y+control.h,false,`${spawn.id}: overlaps controls`)
        }
      }
    }
  }
})

test('profile sanitizer preserves collection progress and repairs counters', () => {
  const profile = sanitizeExplorationProfile({
    completedScenes: { 'yn-pine': true }, successfulChallenges: -3,
    collection: { 'amanita-exitialis': { seen: true, examined: true, identified: true, identificationAttempts: '3', riskRecognized: true, encounters: '2', sampled: -5, provinces: { yunnan: true } } }
  })
  assert.equal(profile.successfulChallenges, 0)
  assert.equal(profile.collection['amanita-exitialis'].encounters, 2)
  assert.equal(profile.collection['amanita-exitialis'].sampled, 0)
  assert.equal(profile.collection['amanita-exitialis'].identified, true)
  assert.equal(profile.collection['amanita-exitialis'].identificationAttempts, 3)
  assert.equal(profile.collection['amanita-exitialis'].riskRecognized, true)
  assert.equal(profile.collection['amanita-exitialis'].regions.yunnan, true)
})

function createMockContext(texts = []) {
  const gradient = { addColorStop() {} }
  const methods = ['setTransform','clearRect','fillRect','save','restore','beginPath','moveTo','lineTo','quadraticCurveTo','bezierCurveTo','stroke','fill','rect','clip','arc','ellipse','translate','rotate','transform','closePath','drawImage']
  const context = { createLinearGradient: () => gradient, fillText: (text) => texts.push(String(text)) }
  context.measureText = (text) => {
    const size = Number.parseFloat(String(context.font || '10px').match(/[\d.]+(?=px)/)?.[0] || '10')
    const width = Array.from(String(text)).reduce((sum, char) => sum + (/[^\u0000-\u00ff]/.test(char) ? size : size * .58), 0)
    return { width }
  }
  methods.forEach((method) => { context[method] = () => {} })
  return context
}

function createReadyImageStore() {
  return { get: (path) => ({ path, status: 'ready', image: { width: 800, height: 600 } }) }
}

test('unidentified collection detail stays unknown and does not load species photos', () => {
  const texts = []
  let photoReads = 0
  const renderer = new ExplorationRenderer(
    { width: 375, height: 812, getContext: () => createMockContext(texts) },
    78,
    { get: () => { photoReads += 1; return { status: 'ready', image: { width: 800, height: 600 } } } }
  )
  const state = new ExplorationState()
  state.startScene('yn-pine')
  const spawn = state.sceneData.spawns[0]
  state.discover(spawn.id)
  state.selectCollectionSpecies(spawn.speciesId)
  renderer.render({ screen: EXPLORATION_SCREEN.COLLECTION_DETAIL, state, feedback: '', collectionPage: 0 }, 1000)
  const species = SPECIES_BY_ID[spawn.speciesId]
  assert.ok(texts.includes('未知菌物'))
  assert.equal(texts.includes(species.name), false)
  assert.equal(texts.includes(RARITY_LABELS[species.rarity]), false)
  assert.equal(texts.some((text) => text.startsWith('研究价值 ')), false)
  assert.equal(photoReads, 0)
})

test('feedback toast avoids actionable controls on a 375x812 canvas', () => {
  const renderer = new ExplorationRenderer(
    { width: 375, height: 812, getContext: () => createMockContext() },
    78,
    createReadyImageStore()
  )
  const state = new ExplorationState()
  renderer.render({ screen: EXPLORATION_SCREEN.HOME, state, feedback: '本地档案保存失败，本次仍可继续', collectionPage: 0 }, 1000)
  assert.ok(renderer.toastBounds)
  const toast = renderer.toastBounds
  renderer.hitAreas.forEach((area) => {
    const control = { x: area.x / renderer.scale, y: area.y / renderer.scale, w: area.w / renderer.scale, h: area.h / renderer.scale }
    const intersects = toast.x < control.x + control.w && toast.x + toast.w > control.x && toast.y < control.y + control.h && toast.y + toast.h > control.y
    assert.equal(intersects, false, area.action)
  })
})

test('all new exploration screens render with their key controls', () => {
  const texts = []
  const canvas = { width: 375, height: 812, getContext: () => createMockContext(texts) }
  const renderer = new ExplorationRenderer(canvas, 78, createReadyImageStore())
  const state = new ExplorationState()
  const render = (screen, extra = {}) => {
    assert.doesNotThrow(() => renderer.render({ screen, state, feedback: '布局反馈', collectionPage: 0, ...extra }, 1000))
    const toast = renderer.toastBounds
    assert.ok(toast)
    renderer.hitAreas.forEach((area) => {
      const control = { x: area.x / renderer.scale, y: area.y / renderer.scale, w: area.w / renderer.scale, h: area.h / renderer.scale }
      const intersects = toast.x < control.x + control.w && toast.x + toast.w > control.x && toast.y < control.y + control.h && toast.y + toast.h > control.y
      assert.equal(intersects, false, `${screen}: ${area.action}`)
    })
  }

  render(EXPLORATION_SCREEN.HOME)
  assert.ok(renderer.hitAreas.some((area) => area.action === 'nav:map'))
  assert.ok(texts.includes('走进林间，寻找菌物'))
  assert.ok(texts.includes('四类生态分区，各有不同的林间风景'))
  assert.equal(texts.some((text) => ['云南', '黑龙江', '吉林', '辽宁', '黑', '吉', '辽'].includes(text)), false)
  texts.length = 0
  render(EXPLORATION_SCREEN.MAP)
  assert.ok(ECO_REGIONS.every((region) => renderer.hitAreas.some((area) => area.action === `region:${region.id}`)))
  state.selectRegion('wet-transition')
  render(EXPLORATION_SCREEN.SCENES)
  assert.ok(ECO_REGION_BY_ID['wet-transition'].sceneIds.every((id) => renderer.hitAreas.some((area) => area.action === `scene:${id}`)))
  state.startScene('jl-river')
  render(EXPLORATION_SCREEN.EXPLORE)
  assert.ok(renderer.hitAreas.some((area) => area.action === 'hunt:timed'))
  assert.ok(renderer.hitAreas.some((area) => area.action === 'hunt:relaxed'))
  state.startHunt('relaxed')
  const selectedSpawn = state.sceneData.spawns[0]
  render(EXPLORATION_SCREEN.EXPLORE)
  assert.equal(renderer.lensBounds, null)
  state.sceneData.spawns.forEach((spawn) => {
    assert.ok(centerOnSpawn(renderer,state,spawn),spawn.id)
    assert.equal(renderer.lensBounds,null)
  })
  state.discover(selectedSpawn.id)
  texts.length = 0
  render(EXPLORATION_SCREEN.SPECIMEN)
  assert.ok(texts.includes('未知菌物'))
  assert.equal(texts.includes(SPECIES_BY_ID[selectedSpawn.speciesId].name), false)
  assert.ok(renderer.hitAreas.some((area) => area.action === 'clue:next'))
  state.observeSelectedClue(); state.observeSelectedClue(); state.observeSelectedClue()
  render(EXPLORATION_SCREEN.IDENTIFY)
  assert.ok(state.selectedCandidates.every((candidate) => renderer.hitAreas.some((area) => area.action === `identify:${candidate.id}`)))
  state.identifySelected(selectedSpawn.speciesId)
  texts.length = 0
  render(EXPLORATION_SCREEN.SPECIMEN)
  assert.ok(texts.includes(SPECIES_BY_ID[selectedSpawn.speciesId].name))
  assert.ok(texts.some((text) => text.startsWith('研究价值 ')))
  assert.ok(renderer.hitAreas.some((area) => area.action === 'basket:add'))
  render(EXPLORATION_SCREEN.BASKET)
  discoverAll(state)
  const regular = state.sceneData.spawns.find((spawn) => !SPECIES_BY_ID[spawn.speciesId].isHighRisk && !SPECIES_BY_ID[spawn.speciesId].observeOnly)
  state.discover(regular.id); identifyCurrent(state); state.addSelectedToBasket()
  state.finishScene()
  render(EXPLORATION_SCREEN.RESULT)
  render(EXPLORATION_SCREEN.COLLECTION)
  state.selectCollectionSpecies(regular.speciesId)
  render(EXPLORATION_SCREEN.COLLECTION_DETAIL)
  render(EXPLORATION_SCREEN.GUIDE)
  render(EXPLORATION_SCREEN.SOURCES)
  assert.ok(texts.includes('高分或成功 ≠ 现实鉴定、采集或食用能力'))
  assert.ok(texts.includes('点开已采集的菌物，比较线索并解锁名称'))
})

test('identified high-risk views and failed result show emergency guidance', () => {
  const texts = []
  const context = createMockContext(texts)
  const renderer = new ExplorationRenderer({ width: 375, height: 812, getContext: () => context }, 78, createReadyImageStore())
  const state = new ExplorationState()
  state.startScene(WARM_MOUNTAIN_SCENE.id)
  const toxic = WARM_MOUNTAIN_SCENE.spawns.find((spawn) => SPECIES_BY_ID[spawn.speciesId].isHighRisk)
  state.discover(toxic.id)
  renderer.render({ screen: EXPLORATION_SCREEN.SPECIMEN, state, feedback: '', collectionPage: 0 }, 1000)
  assert.equal(texts.some((text) => text.includes('120') && text.includes('急诊')), false)

  identifyCurrent(state)
  texts.length = 0
  renderer.render({ screen: EXPLORATION_SCREEN.SPECIMEN, state, feedback: '', collectionPage: 0 }, 1000)
  assert.ok(texts.some((text) => text.includes('120') && text.includes('急诊')))
  assert.ok(texts.includes('游戏维度，不代表经济、药用或食用价值'))

  state.selectCollectionSpecies(toxic.speciesId)
  texts.length = 0
  renderer.render({ screen: EXPLORATION_SCREEN.COLLECTION_DETAIL, state, feedback: '', collectionPage: 0 }, 1000)
  assert.ok(texts.some((text) => text.includes('120') && text.includes('急诊')))
  assert.ok(texts.includes('游戏维度，不代表经济、药用或食用价值'))

  discoverAll(state)
  state.discover(toxic.id); identifyCurrent(state); state.addSelectedToBasket()
  texts.length = 0
  renderer.render({ screen: EXPLORATION_SCREEN.RESULT, state, feedback: '', collectionPage: 0 }, 1000)
  assert.ok(texts.some((text) => text.includes('120') && text.includes('急诊')))
})

function createPlatform() {
  const memory = new Map()
  const handlers = {}
  return {
    handlers,
    onTouchStart: (handler) => { handlers.start = handler },
    onTouchMove: (handler) => { handlers.move = handler },
    onTouchEnd: (handler) => { handlers.end = handler },
    onTouchCancel: (handler) => { handlers.cancel = handler },
    onHide: (handler) => { handlers.hide = handler },
    getStorageSync: (key) => memory.get(key), setStorageSync: (key, value) => memory.set(key, value), removeStorageSync: (key) => memory.delete(key),
    createImage() {
      const image = { width: 800, height: 600, onload: null, onerror: null }
      Object.defineProperty(image, 'src', { set() { if (image.onload) image.onload() } })
      return image
    }
  }
}

test('rendered home button responds through registered wx touch callbacks', () => {
  const platform = createPlatform()
  const canvas = { width: 375, height: 812, getContext: () => createMockContext(), requestAnimationFrame: () => {} }
  const game = new ExplorationGame(canvas, 78, platform)
  assert.equal(game.images.records.size, 0)
  game.renderer.render({ screen: game.screen, state: game.state, feedback: '', collectionPage: 0 }, 1000)
  assert.equal(game.images.records.size, 0)
  const area = game.renderer.hitAreas.find((item) => item.action === 'nav:map')
  assert.ok(area)
  assert.ok(Number.isFinite(area.w) && Number.isFinite(area.h))
  const point = { pageX: area.x + area.w / 2, pageY: area.y + area.h / 2 }
  platform.handlers.start({ touches: [point] })
  platform.handlers.end({ changedTouches: [point] })
  assert.equal(game.screen, EXPLORATION_SCREEN.MAP)
})

test('optional exploration lens follows touch and disappears on release', () => {
  const platform = createPlatform()
  const canvas = { width: 375, height: 812, getContext: () => createMockContext(), requestAnimationFrame: () => {} }
  const game = new ExplorationGame(canvas, 78, platform)
  game.state.startScene('hl-meadow')
  game.state.startHunt('relaxed')
  game.state.toggleLens()
  game.screen = EXPLORATION_SCREEN.EXPLORE
  game.renderer.render({ screen: game.screen, state: game.state, feedback: '', collectionPage: 0 }, 1000)
  const bounds = game.renderer.sceneBounds
  const point = (x, y) => ({ clientX: bounds.x + bounds.w * x, clientY: bounds.y + bounds.h * y })
  platform.handlers.start({ touches: [point(.2, .3)] })
  assert.equal(game.state.currentRun.lensActive, true)
  assert.ok(Math.abs(game.state.currentRun.lensFocus.x - .2) < .01)
  platform.handlers.move({ touches: [point(.75, .8)] })
  assert.ok(Math.abs(game.state.currentRun.lensFocus.x - .75) < .01)
  assert.ok(Math.abs(game.state.currentRun.lensFocus.y - .8) < .01)
  game.renderer.render({ screen: game.screen, state: game.state, feedback: '', collectionPage: 0 }, 1000)
  assert.ok(game.renderer.lensBounds)
  platform.handlers.end({ changedTouches: [point(.75, .8)] })
  assert.equal(game.state.currentRun.lensActive, false)
  game.renderer.render({ screen: game.screen, state: game.state, feedback: '', collectionPage: 0 }, 1000)
  assert.equal(game.renderer.lensBounds, null)

  const outside = { clientX: bounds.x - 5, clientY: bounds.y + bounds.h / 2 }
  platform.handlers.start({ touches: [outside] })
  assert.equal(game.state.currentRun.lensActive, false)
  platform.handlers.cancel({ changedTouches: [outside] })

  platform.handlers.start({ touches: [point(.5, .5)] })
  assert.equal(game.state.currentRun.lensActive, true)
  platform.handlers.cancel({ changedTouches: [point(.5, .5)] })
  assert.equal(game.state.currentRun.lensActive, false)
})

test('optional lens can select on immediate release without a rendered frame', () => {
  const platform=createPlatform()
  const canvas={width:375,height:812,getContext:()=>createMockContext(),requestAnimationFrame:()=>{}}
  const game=new ExplorationGame(canvas,78,platform)
  game.handleAction('scene:hl-meadow'); game.handleAction('hunt:relaxed')
  const spawn=game.state.sceneData.spawns[0]
  game.renderer.render({screen:game.screen,state:game.state},1000)
  const area=centerOnSpawn(game.renderer,game.state,spawn)
  game.state.toggleLens()
  const target={clientX:area.cx,clientY:area.cy}
  platform.handlers.start({touches:[{clientX:180,clientY:250}]})
  platform.handlers.move({touches:[target]})
  platform.handlers.end({changedTouches:[target]})
  assert.equal(game.state.currentRun.selectedSpawnId,spawn.id)
  assert.equal(game.screen,EXPLORATION_SCREEN.SPECIMEN)
  assert.equal(game.state.currentRun.lensActive,false)
})

test('stale fungus hit areas cannot select after cancel and an outside start', () => {
  const platform = createPlatform()
  const canvas = { width: 375, height: 812, getContext: () => createMockContext(), requestAnimationFrame: () => {} }
  const game = new ExplorationGame(canvas, 78, platform)
  game.state.startScene('hl-meadow')
  game.state.startHunt('relaxed')
  game.screen = EXPLORATION_SCREEN.EXPLORE
  game.renderer.render({ screen: game.screen, state: game.state, feedback: '', collectionPage: 0 }, 1000)
  const bounds = game.renderer.sceneBounds
  const point = (x, y) => ({ clientX: bounds.x + bounds.w * x, clientY: bounds.y + bounds.h * y })
  const spawn = game.state.sceneData.spawns[0]
  const spawnPoint = point(spawn.x, spawn.y)
  platform.handlers.start({ touches: [spawnPoint] })
  game.renderer.render({ screen: game.screen, state: game.state, feedback: '', collectionPage: 0 }, 1001)
  const staleArea = game.renderer.hitAreas.find((area) => area.action === `fungus:${spawn.id}`)
  assert.ok(staleArea)
  platform.handlers.cancel({ changedTouches: [spawnPoint] })

  const outside = { clientX: bounds.x - 5, clientY: bounds.y + bounds.h / 2 }
  const staleCenter = { clientX: staleArea.cx, clientY: staleArea.cy }
  platform.handlers.start({ touches: [outside] })
  platform.handlers.move({ touches: [staleCenter] })
  platform.handlers.end({ changedTouches: [staleCenter] })
  assert.equal(game.state.currentRun.selectedSpawnId, null)
  assert.equal(game.screen, EXPLORATION_SCREEN.EXPLORE)
})

test('scene fungus illustration stays transparent while loading and uses vector fallback only on error', () => {
  const spawn = SCENES[0].spawns[0]
  const species = SPECIES_BY_ID[spawn.speciesId]
  const fallbackCounts = {}
  for (const status of ['loading', 'error', 'ready']) {
    const imageStore = { get: () => ({ status, image: status === 'ready' ? { width: 256, height: 256 } : null }) }
    const renderer = new ExplorationRenderer({ width: 375, height: 812, getContext: () => createMockContext() }, 78, imageStore)
    fallbackCounts[status] = 0
    renderer._drawFungus = () => { fallbackCounts[status] += 1 }
    renderer._drawSceneFungusIllustration(spawn, species, 100, 100, 40)
  }
  assert.deepEqual(fallbackCounts, { loading: 0, error: 1, ready: 0 })
})

test('exploration pages fit common short and tall screens without text truncation', () => {
  const sizes = [
    { width: 320, height: 568, safeTop: 50 },
    { width: 375, height: 667, safeTop: 54 },
    { width: 375, height: 812, safeTop: 78 },
    { width: 430, height: 932, safeTop: 90 }
  ]
  sizes.forEach(({ width, height, safeTop }) => {
    const renderer = new ExplorationRenderer({ width, height, getContext: () => createMockContext() }, safeTop, createReadyImageStore())
    const state = new ExplorationState()
    const check = (screen) => {
      renderer.render({ screen, state, feedback: '', collectionPage: 0, ads: {} }, 1000)
      assert.deepEqual(renderer.truncatedTexts, [], `${width}x${height}/${screen}: ${renderer.truncatedTexts.join('|')}`)
      renderer.textDraws.forEach((item) => {
        assert.ok(item.y >= 0 && item.y <= renderer.logicalHeight, `${screen}: text y ${item.y}`)
        const textWidth = Array.from(item.text).reduce((sum, char) => sum + (/[^\u0000-\u00ff]/.test(char) ? item.size : item.size * .58), 0)
        const left = item.align === 'center' ? item.x - textWidth / 2 : item.align === 'right' ? item.x - textWidth : item.x
        const right = item.align === 'center' ? item.x + textWidth / 2 : item.align === 'right' ? item.x : item.x + textWidth
        assert.ok(left >= -1 && right <= 376, `${screen}: text overflow ${item.text} [${left}, ${right}]`)
      })
      renderer.hitAreas.forEach((area) => {
        assert.ok(area.x >= -1 && area.y >= -1, `${screen}: negative hit ${area.action}`)
        assert.ok(area.x + area.w <= width + 1 && area.y + area.h <= height + 1, `${screen}: overflow hit ${area.action}`)
      })
    }
    check(EXPLORATION_SCREEN.HOME)
    check(EXPLORATION_SCREEN.MAP)
    state.selectRegion('warm-mountain'); check(EXPLORATION_SCREEN.SCENES)
    state.startScene('yn-pine'); check(EXPLORATION_SCREEN.EXPLORE)
    state.startHunt('relaxed'); check(EXPLORATION_SCREEN.EXPLORE)
    const toxic = state.sceneData.spawns.find((spawn) => SPECIES_BY_ID[spawn.speciesId].isHighRisk)
    state.discover(toxic.id); check(EXPLORATION_SCREEN.SPECIMEN)
    while (!state.canIdentifySelected()) state.observeSelectedClue()
    check(EXPLORATION_SCREEN.IDENTIFY)
    state.identifySelected(toxic.speciesId); check(EXPLORATION_SCREEN.SPECIMEN)
    check(EXPLORATION_SCREEN.BASKET)
    state.addSelectedToBasket(); check(EXPLORATION_SCREEN.RESULT)
    check(EXPLORATION_SCREEN.COLLECTION)
    state.selectCollectionSpecies(toxic.speciesId); check(EXPLORATION_SCREEN.COLLECTION_DETAIL)
    check(EXPLORATION_SCREEN.GUIDE)
    check(EXPLORATION_SCREEN.SOURCES)
  })
})

test('game coordinator handles modes, hidden fungi, quantity goal and result', () => {
  const canvas = { width: 375, height: 812, getContext: () => createMockContext(), requestAnimationFrame: () => {} }
  const game = new ExplorationGame(canvas, 78, createPlatform())
  game.handleAction('nav:map')
  game.handleAction('region:wet-transition')
  assert.equal(game.screen, EXPLORATION_SCREEN.SCENES)
  game.handleAction('scene:hl-meadow')
  assert.equal(game.screen, EXPLORATION_SCREEN.EXPLORE)
  game.handleAction('hunt:relaxed')
  assert.equal(game.state.currentRun.huntMode, 'relaxed')
  const scene = game.state.sceneData
  const safe = scene.spawns.filter((spawn) => !SPECIES_BY_ID[spawn.speciesId].isHighRisk && !SPECIES_BY_ID[spawn.speciesId].observeOnly)
  for (const spawn of safe) {
    if (game.state.canFinish()) break
    game.handleAction(`fungus:${spawn.id}`)
    if (!game.state.selectedIdentified) {
      assert.equal(game.feedback.includes(SPECIES_BY_ID[spawn.speciesId].name), false)
      game.handleAction('clue:next')
      game.handleAction('clue:next')
      game.handleAction('clue:next')
      game.handleAction('nav:identify')
      game.handleAction(`identify:${spawn.speciesId}`)
    }
    game.handleAction('basket:add')
  }
  assert.ok(game.state.currentRun.collectedMushroomCount >= scene.targetCollectCount)
  game.handleAction('nav:basket')
  assert.equal(game.screen, EXPLORATION_SCREEN.BASKET)
  game.handleAction('finish:scene')
  assert.equal(game.screen, EXPLORATION_SCREEN.RESULT)
  assert.equal(game.state.lastResult.status, 'success')
})

test('rain badge progress is backward compatible and restricted to configured scenes', () => {
  const legacy = sanitizeExplorationProfile({ completedScenes: { 'yn-pine': true } })
  assert.deepEqual(legacy.rainBadgeScenes, {})
  const repaired = sanitizeExplorationProfile({ rainBadgeScenes: { 'yn-pine': 1, invented: true, 'hl-meadow': false } })
  assert.deepEqual(repaired.rainBadgeScenes, { 'yn-pine': true })

  const state = new ExplorationState()
  assert.equal(state.claimRainBadge(), false)
  assert.equal(completeSafeWarmMountainRun(state).status, 'success')
  assert.equal(state.claimRainBadge(), true)
  assert.equal(state.claimRainBadge(), false)
  assert.equal(state.rainBadgeCount, 1)
})

test('rewarded ad control appears only on a successful report and never overlaps actions or toast', () => {
  const texts = []
  const renderer = new ExplorationRenderer(
    { width: 375, height: 812, getContext: () => createMockContext(texts) },
    78,
    createReadyImageStore()
  )
  const state = new ExplorationState()
  completeSafeWarmMountainRun(state)
  const ads = { rewardedAvailable: true, rewardedBusy: false, rainBadgeClaimed: false, rainBadgeCount: 0 }
  renderer.render({ screen: EXPLORATION_SCREEN.RESULT, state, feedback: '广告入口布局检查', collectionPage: 0, ads }, 1000)
  assert.ok(texts.includes('自愿看广告 · 领装饰性雨滴支持章'))
  assert.ok(renderer.hitAreas.some((area) => area.action === 'ad:rainBadge'))
  const toast = renderer.toastBounds
  renderer.hitAreas.forEach((area) => {
    const control = { x: area.x / renderer.scale, y: area.y / renderer.scale, w: area.w / renderer.scale, h: area.h / renderer.scale }
    const intersectsToast = toast.x < control.x + control.w && toast.x + toast.w > control.x && toast.y < control.y + control.h && toast.y + toast.h > control.y
    assert.equal(intersectsToast, false, area.action)
  })

  state.claimRainBadge()
  texts.length = 0
  renderer.render({ screen: EXPLORATION_SCREEN.RESULT, state, feedback: '', collectionPage: 0, ads: { ...ads, rainBadgeClaimed: true, rainBadgeCount: 1 } }, 1000)
  assert.ok(texts.includes('本场景雨滴支持章已领取 · 共1枚'))
  assert.equal(renderer.hitAreas.some((area) => area.action === 'ad:rainBadge'), false)

  const failed = new ExplorationState()
  failed.startScene(WARM_MOUNTAIN_SCENE.id)
  const toxic = WARM_MOUNTAIN_SCENE.spawns.find((spawn) => SPECIES_BY_ID[spawn.speciesId].isHighRisk)
  discoverAll(failed)
  failed.discover(toxic.id); identifyCurrent(failed); failed.addSelectedToBasket()
  texts.length = 0
  renderer.render({ screen: EXPLORATION_SCREEN.RESULT, state: failed, feedback: '', collectionPage: 0, ads }, 1000)
  assert.ok(texts.some((text) => text.includes('120') && text.includes('急诊')))
  assert.equal(renderer.hitAreas.some((area) => area.action === 'ad:rainBadge'), false)
})

test('game grants a persisted badge only after complete rewarded viewing and only once per scene', async () => {
  const platform = createPlatform()
  let closeHandler = () => {}
  let shows = 0
  platform.createRewardedVideoAd = () => ({
    onClose(handler) { closeHandler = handler },
    onError() {},
    show() { shows += 1; return Promise.resolve() },
    load() { return Promise.resolve() }
  })
  const canvas = { width: 375, height: 812, getContext: () => createMockContext(), requestAnimationFrame: () => {} }
  const config = { enabled: true, adUnitIds: { rewardedVideo: 'reward-id', interstitial: '' } }
  const game = new ExplorationGame(canvas, 78, platform, config)
  completeSafeWarmMountainRun(game.state)
  game.screen = EXPLORATION_SCREEN.RESULT

  const pending = game.handleAction('ad:rainBadge')
  closeHandler({ isEnded: true })
  assert.equal((await pending).status, 'rewarded')
  assert.equal(game.state.rainBadgeCount, 1)
  assert.match(game.feedback, /已领取雨滴支持章/)
  assert.equal(shows, 1)

  assert.equal((await game.handleAction('ad:rainBadge')).status, 'ineligible')
  assert.equal(game.state.rainBadgeCount, 1)
  assert.equal(shows, 1)
  const restored = new ExplorationGame(canvas, 78, platform, config)
  assert.equal(restored.state.rainBadgeCount, 1)
})

test('game does not grant a badge for incomplete viewing or unavailable ads', async () => {
  const platform = createPlatform()
  let closeHandler = () => {}
  platform.createRewardedVideoAd = () => ({
    onClose(handler) { closeHandler = handler }, onError() {}, show() { return Promise.resolve() }, load() { return Promise.resolve() }
  })
  const canvas = { width: 375, height: 812, getContext: () => createMockContext(), requestAnimationFrame: () => {} }
  const config = { enabled: true, adUnitIds: { rewardedVideo: 'reward-id', interstitial: '' } }
  const game = new ExplorationGame(canvas, 78, platform, config)
  completeSafeWarmMountainRun(game.state)
  game.screen = EXPLORATION_SCREEN.RESULT
  const pending = game.handleAction('ad:rainBadge')
  closeHandler({ isEnded: false })
  assert.equal((await pending).status, 'skipped')
  assert.equal(game.state.rainBadgeCount, 0)
  assert.match(game.feedback, /未完整播放/)

  const unavailable = new ExplorationGame(canvas, 78, createPlatform(), { enabled: true, adUnitIds: {} })
  completeSafeWarmMountainRun(unavailable.state)
  unavailable.screen = EXPLORATION_SCREEN.RESULT
  assert.equal((await unavailable.handleAction('ad:rainBadge')).status, 'unavailable')
  assert.equal(unavailable.state.rainBadgeCount, 0)
  assert.match(unavailable.feedback, /暂无可用视频/)
})

test('game requests interstitial only after successful scene results', async () => {
  const canvas = { width: 375, height: 812, getContext: () => createMockContext(), requestAnimationFrame: () => {} }
  const game = new ExplorationGame(canvas, 78, createPlatform())
  const calls = []
  game.ads.maybeShowInterstitial = async (input) => { calls.push(input); return { status: 'frequency' } }
  game.state.finishScene = () => ({ status: 'success' })
  game._finishScene()
  await Promise.resolve()
  assert.deepEqual(calls, [{ successful: true }])

  game.state.finishScene = () => ({ status: 'risk-failure' })
  game._finishScene()
  await Promise.resolve()
  assert.equal(calls.length, 1)
})


test('a completed scene run cannot be submitted twice', () => {
  const state = new ExplorationState()
  assert.equal(completeSafeWarmMountainRun(state).status, 'success')
  assert.throws(() => state.finishScene(), /当前没有进行中的场景调查/)
  assert.equal(state.profile.sceneAttempts[WARM_MOUNTAIN_SCENE.id], 1)
})

test('normal taps discover fungi, while panorama swipes never trigger an accidental discovery', () => {
  const platform = createPlatform()
  const canvas = {width:375,height:812,getContext:()=>createMockContext(),requestAnimationFrame:()=>{}}
  const game = new ExplorationGame(canvas,78,platform)
  game.handleAction('scene:hl-meadow'); game.handleAction('hunt:relaxed')
  game.renderer.render({screen:game.screen,state:game.state},1000)
  const originalCamera = game.state.currentRun.cameraX
  platform.handlers.start({touches:[{clientX:290,clientY:350}]})
  platform.handlers.move({touches:[{clientX:50,clientY:350}]})
  platform.handlers.end({changedTouches:[{clientX:50,clientY:350}]})
  assert.ok(game.state.currentRun.cameraX > originalCamera)
  assert.equal(game.state.currentRun.lensActive,false)
  assert.equal(game.screen,EXPLORATION_SCREEN.EXPLORE)
  assert.deepEqual(game.state.currentRun.foundSpawnIds,[])

  const spawn = game.state.sceneData.spawns[0]
  const area = centerOnSpawn(game.renderer,game.state,spawn)
  const point = {clientX:area.cx,clientY:area.cy}
  const camera = game.state.currentRun.cameraX
  platform.handlers.start({touches:[point]})
  platform.handlers.end({changedTouches:[point]})
  assert.equal(game.screen,EXPLORATION_SCREEN.SPECIMEN)
  assert.equal(game.state.currentRun.selectedSpawnId,spawn.id)
  assert.equal(game.state.currentRun.lensEnabled,false)
  game.handleAction('nav:explore')
  assert.equal(game.state.currentRun.cameraX,camera)
})

test('camera clamps to both ends, cancellation and backgrounding clear active gestures', () => {
  const platform=createPlatform()
  const game=new ExplorationGame({width:320,height:568,getContext:()=>createMockContext(),requestAnimationFrame:()=>{}},50,platform)
  game.handleAction('scene:yn-pine'); game.handleAction('hunt:timed')
  game.renderer.render({screen:game.screen,state:game.state},1000)
  game.state.setCameraPosition(-1); assert.equal(game.state.currentRun.cameraX,0)
  game.state.setCameraPosition(5); assert.equal(game.state.currentRun.cameraX,1)
  platform.handlers.start({touches:[{clientX:150,clientY:250}]})
  platform.handlers.cancel({changedTouches:[{clientX:150,clientY:250}]})
  assert.equal(game.sceneGesture,null)
  game.state.toggleLens()
  platform.handlers.start({touches:[{clientX:150,clientY:250}]})
  assert.equal(game.state.currentRun.lensActive,true)
  platform.handlers.hide()
  assert.equal(game.sceneGesture,null)
  assert.equal(game.input.start,null)
  assert.equal(game.state.currentRun.lensActive,false)
  assert.equal(game.state.currentRun.lastHuntTickAt,null)
})

test('collected and eaten fungi disappear from drawing and direct hit testing; removal restores them', () => {
  const drawn=[]
  const ctx=createMockContext()
  ctx.drawImage=image=>drawn.push(image.path)
  const renderer=new ExplorationRenderer({width:375,height:812,getContext:()=>ctx},78,
    {get:path=>({status:'ready',image:{path,width:861,height:574}})})
  const state=new ExplorationState()
  state.startScene('hl-meadow'); state.startHunt('relaxed')
  renderer.render({screen:EXPLORATION_SCREEN.EXPLORE,state},1000)
  const spawn=state.sceneData.spawns[0]
  const area=centerOnSpawn(renderer,state,spawn)
  const point={x:area.cx,y:area.cy}
  discoverAndIdentify(state,spawn)
  state.addSelectedToBasket()
  drawn.length=0
  renderer.render({screen:EXPLORATION_SCREEN.EXPLORE,state},1000)
  assert.equal(renderer.getFungusActionAt(point,state.sceneData,state.currentRun),null)
  assert.equal(renderer.hitAreas.some(area=>area.action===`fungus:${spawn.id}`),false)
  assert.equal(drawn.includes(spawn.naturalSprite),false)
  state.removeFromBasket(spawn.id)
  assert.ok(centerOnSpawn(renderer,state,spawn))
  state.currentRun.eatenSpawnIds.push(spawn.id)
  renderer.render({screen:EXPLORATION_SCREEN.EXPLORE,state},1000)
  assert.equal(renderer.getFungusActionAt(point,state.sceneData,state.currentRun),null)
})

test('loading images never create invisible selectable targets', () => {
  const state=new ExplorationState()
  state.startScene('yn-pine'); state.startHunt('relaxed')
  const renderer=new ExplorationRenderer({width:375,height:812,getContext:()=>createMockContext()},78,
    {get:path=>path.includes('/targets/') ? {status:'loading'} : {status:'ready',image:{width:861,height:574}}})
  renderer.render({screen:EXPLORATION_SCREEN.EXPLORE,state},1000)
  assert.equal(renderer.hitAreas.some(area=>area.action.startsWith('fungus:')),false)
  const spawn=state.sceneData.spawns[0]
  const target=targetGeometry(spawn,renderer.habitatView)
  assert.equal(renderer.getFungusActionAt(target,state.sceneData,state.currentRun),null)
})

test('natural sprite assets preserve transparent PNGs and the original attribution', () => {
  const manifest=JSON.parse(fs.readFileSync('assets/exploration/natural/MANIFEST.json','utf8'))
  assert.equal(manifest.sprites.length,13)
  manifest.sprites.forEach(sprite=>{
    const png=fs.readFileSync(sprite.localPath)
    assert.equal(png.subarray(1,4).toString(),'PNG')
    assert.equal(png[25],6,`${sprite.speciesId}: missing RGBA`)
    assert.ok(fs.existsSync(sprite.source.localPath))
    assert.ok(sprite.source.attribution && sprite.source.license && sprite.source.observation)
  })
})

test('search controls stay at the top and progress still provides basket and completion access', () => {
  for (const [width,height] of [[320,568],[375,812],[430,932]]) {
    const renderer=new ExplorationRenderer({width,height,getContext:()=>createMockContext()},54,createReadyImageStore())
    const state=new ExplorationState()
    state.startScene('yn-pine'); state.startHunt('relaxed')
    renderer.render({screen:EXPLORATION_SCREEN.EXPLORE,state},1000)
    const lens=renderer.hitAreas.find(area=>area.action==='lens:toggle')
    assert.ok(lens)
    assert.equal(lens.shape,'circle')
    assert.ok(lens.cx > width*.8 && lens.cy < height*.3)
    assert.ok(lens.w >= 44 && lens.h >= 44)
    assert.equal(renderer.textDraws.some(item=>/辅助放大镜|收起放大镜|结束调查|调查篮/.test(item.text)),false)
    const controls=renderer.hitAreas.filter(area=>!area.action.startsWith('fungus:'))
    assert.ok(controls.every(area=>area.y+area.h < height*.35))
    assert.ok(controls.some(area=>area.action==='nav:basket'))
    state.sceneData.spawns.forEach(spawn=>{
      if (SPECIES_BY_ID[spawn.speciesId].isHighRisk || SPECIES_BY_ID[spawn.speciesId].observeOnly) return
      discoverAndIdentify(state,spawn); state.addSelectedToBasket()
    })
    renderer.render({screen:EXPLORATION_SCREEN.EXPLORE,state},1000)
    assert.ok(renderer.hitAreas.some(area=>area.action==='finish:scene' && area.y < height*.2))
  }
})

test('horizontal dragging dismisses guidance for the run, but taps, vertical movement and lens use do not', () => {
  const platform=createPlatform()
  const game=new ExplorationGame({width:375,height:812,getContext:()=>createMockContext(),requestAnimationFrame:()=>{}},78,platform)
  game.handleAction('scene:hl-meadow'); game.handleAction('hunt:relaxed')
  const guidanceVisible=()=>{
    game.renderer.render({screen:game.screen,state:game.state,feedback:game.feedback},1000)
    return game.renderer.textDraws.some(item=>item.text==='左右拖动寻觅，轻点菌物观察')
  }
  const gesture=(start,end)=>{
    platform.handlers.start({touches:[start]})
    platform.handlers.move({touches:[end]})
    platform.handlers.end({changedTouches:[end]})
  }
  assert.equal(guidanceVisible(),true)
  gesture({clientX:180,clientY:300},{clientX:182,clientY:301})
  assert.equal(guidanceVisible(),true)
  gesture({clientX:180,clientY:300},{clientX:180,clientY:350})
  assert.equal(guidanceVisible(),true)
  game.handleAction('lens:toggle')
  gesture({clientX:180,clientY:300},{clientX:130,clientY:300})
  assert.equal(guidanceVisible(),true)
  game.handleAction('lens:toggle')
  game.feedback='上一次操作提示'
  platform.handlers.start({touches:[{clientX:180,clientY:300}]})
  platform.handlers.move({touches:[{clientX:140,clientY:300}]})
  assert.equal(guidanceVisible(),false) // Hide during movement, before release.
  assert.equal(game.feedback,'')
  platform.handlers.end({changedTouches:[{clientX:140,clientY:300}]})
  game.handleAction('nav:basket'); game.handleAction('nav:explore')
  assert.equal(guidanceVisible(),false)
  game.handleAction('lens:toggle'); game.handleAction('lens:toggle')
  assert.equal(guidanceVisible(),false)
  assert.equal(game.feedback,'')
  game.handleAction('scene:hl-meadow'); game.handleAction('hunt:timed')
  assert.equal(guidanceVisible(),true)
})

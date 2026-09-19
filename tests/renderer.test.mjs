import test from 'node:test'
import assert from 'node:assert/strict'

import { SCREEN } from '../js/constants.js'
import { GameState } from '../js/core/GameState.js'
import { Renderer } from '../js/ui/Renderer.js'

function createMockContext() {
  const gradient = { addColorStop() {} }
  const methods = [
    'setTransform', 'clearRect', 'fillRect', 'save', 'restore', 'beginPath', 'moveTo',
    'lineTo', 'quadraticCurveTo', 'bezierCurveTo', 'stroke', 'fill', 'rect', 'clip',
    'arc', 'ellipse', 'translate', 'rotate', 'closePath', 'fillText'
  ]
  const context = {
    createLinearGradient: () => gradient,
    measureText: (text) => ({ width: Array.from(String(text)).length * 10 })
  }
  methods.forEach((method) => { context[method] = () => {} })
  return context
}

function render(renderer, scene, state, feedback = '') {
  assert.doesNotThrow(() => renderer.render({ scene, state, feedback }, 1000))
}

test('all prototype screens render and expose expected actions', () => {
  const context = createMockContext()
  const canvas = { width: 375, height: 812, getContext: () => context }
  const renderer = new Renderer(canvas, 78)
  const state = new GameState()

  render(renderer, SCREEN.HOME, state)
  assert.ok(renderer.hitAreas.some((area) => area.action === 'nav:start'))
  render(renderer, SCREEN.ROUTES, state)
  assert.equal(renderer.hitAreas.filter((area) => area.action.startsWith('route:')).length, 4)
  render(renderer, SCREEN.COLLECTION, state)
  render(renderer, SCREEN.GUIDE, state)

  state.startRun('mistPath', 41)
  while (state.currentEncounter.kind === 'event') {
    render(renderer, SCREEN.EXPLORE, state)
    state.resolveEvent(state.currentEvent.options[0].id)
  }
  render(renderer, SCREEN.EXPLORE, state, '观察中')
  assert.ok(renderer.hitAreas.some((area) => area.action === 'observe:next'))
  state.observe()
  render(renderer, SCREEN.IDENTIFY, state)
  assert.equal(renderer.hitAreas.filter((area) => area.action.startsWith('identify:')).length, 3)
  state.identify(state.currentEncounter.speciesId)
  render(renderer, SCREEN.DECIDE, state, '辨识正确')
  assert.equal(renderer.hitAreas.filter((area) => area.action.startsWith('decision:')).length, 3)

  while (!state.currentRun.completed) {
    if (state.currentEncounter.kind === 'event') {
      state.resolveEvent(state.currentEvent.options[0].id)
    } else {
      if (!state.currentEncounter.identifiedId) {
        while (!state.canIdentify()) state.observe()
        state.identify(state.currentEncounter.speciesId)
      }
      state.decide('leave')
    }
  }
  render(renderer, SCREEN.RESULT, state)
  assert.ok(renderer.hitAreas.some((area) => area.action === 'nav:routes'))
})

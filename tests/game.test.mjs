import test from 'node:test'
import assert from 'node:assert/strict'

import { SCREEN } from '../js/constants.js'
import { Game } from '../js/Game.js'
import { InputManager } from '../js/ui/InputManager.js'

function createPlatform({ failSave = false } = {}) {
  const handlers = {}
  const memory = new Map()
  return {
    handlers,
    onTouchStart: (handler) => { handlers.start = handler },
    onTouchMove: (handler) => { handlers.move = handler },
    onTouchEnd: (handler) => { handlers.end = handler },
    onTouchCancel: (handler) => { handlers.cancel = handler },
    onHide: (handler) => { handlers.hide = handler },
    getStorageSync: (key) => memory.get(key),
    setStorageSync: (key, value) => {
      if (failSave) throw new Error('storage unavailable')
      memory.set(key, value)
    },
    removeStorageSync: (key) => memory.delete(key)
  }
}

function createCanvas() {
  return {
    width: 375,
    height: 812,
    getContext: () => ({}),
    requestAnimationFrame: (callback) => { void callback }
  }
}

test('input manager binds standard wx touch callbacks without Canvas DOM events', () => {
  const platform = createPlatform()
  let action = null
  new InputManager(
    createCanvas(),
    () => [{ x: 10, y: 10, w: 100, h: 50, action: 'nav:start' }],
    (value) => { action = value },
    platform
  )
  platform.handlers.start({ touches: [{ clientX: 20, clientY: 20 }] })
  platform.handlers.end({ changedTouches: [{ clientX: 20, clientY: 20 }] })
  assert.equal(action, 'nav:start')
})

test('input manager accepts fallback touch coordinates and area dimensions', () => {
  const platform = createPlatform()
  let action = null
  new InputManager(
    createCanvas(),
    () => [{ x: 10, y: 10, width: 100, height: 50, action: 'nav:fallback' }],
    (value) => { action = value },
    platform
  )
  platform.handlers.start({ touches: [{ x: 20, y: 20 }] })
  platform.handlers.end({ changedTouches: [{ x: 20, y: 20 }] })
  assert.equal(action, 'nav:fallback')
})

test('input manager respects circular hit areas instead of rectangular corners', () => {
  const platform = createPlatform()
  const actions = []
  const manager = new InputManager(
    createCanvas(),
    () => [{ x: 50, y: 50, w: 40, h: 40, cx: 70, cy: 70, r: 20, shape: 'circle', action: 'fungus:inside-lens' }],
    (value) => { actions.push(value) },
    platform
  )
  platform.handlers.start({ touches: [{ clientX: 51, clientY: 51 }] })
  platform.handlers.end({ changedTouches: [{ clientX: 51, clientY: 51 }] })
  assert.deepEqual(actions, [])
  manager.lastActionAt = 0
  platform.handlers.start({ touches: [{ clientX: 70, clientY: 70 }] })
  platform.handlers.end({ changedTouches: [{ clientX: 70, clientY: 70 }] })
  assert.deepEqual(actions, ['fungus:inside-lens'])
})

test('input manager emits hold, move and release pointer gestures', () => {
  const platform = createPlatform()
  const pointers = []
  new InputManager(
    createCanvas(),
    () => [],
    () => {},
    platform,
    (pointer) => pointers.push(pointer)
  )
  platform.handlers.start({ touches: [{ clientX: 30, clientY: 40 }] })
  platform.handlers.move({ touches: [{ clientX: 80, clientY: 120 }] })
  platform.handlers.end({ changedTouches: [{ clientX: 80, clientY: 120 }] })
  assert.deepEqual(pointers.map((item) => item.type), ['start', 'move', 'end'])
  assert.deepEqual(pointers[1], { type: 'move', x: 80, y: 120 })
})

test('input manager selects fungus after dragging and never acts on cancel', () => {
  const platform = createPlatform()
  const actions = []
  const pointers = []
  new InputManager(
    createCanvas(),
    () => [{ x: 50, y: 50, w: 40, h: 40, cx: 70, cy: 70, r: 20, shape: 'circle', action: 'fungus:drag-release' }],
    (value) => actions.push(value),
    platform,
    (pointer) => pointers.push(pointer)
  )
  platform.handlers.start({ touches: [{ clientX: 5, clientY: 5 }] })
  platform.handlers.move({ touches: [{ clientX: 70, clientY: 70 }] })
  platform.handlers.end({ changedTouches: [{ clientX: 70, clientY: 70 }] })
  assert.deepEqual(actions, ['fungus:drag-release'])

  platform.handlers.start({ touches: [{ clientX: 70, clientY: 70 }] })
  platform.handlers.cancel({ changedTouches: [{ clientX: 70, clientY: 70 }] })
  assert.deepEqual(actions, ['fungus:drag-release'])
  assert.deepEqual(pointers.map((item) => item.type), ['start', 'move', 'end', 'start', 'cancel'])
})

test('game coordinator reaches result and returns home through public actions', () => {
  const game = new Game(createCanvas(), 78, createPlatform())
  game.handleAction('nav:start')
  assert.equal(game.scene, SCREEN.ROUTES)
  game.handleAction('route:mistPath')
  assert.equal(game.scene, SCREEN.EXPLORE)

  while (!game.state.currentRun.completed) {
    if (game.state.currentEncounter.kind === 'event') {
      game.handleAction(`event:${game.state.currentEvent.options[0].id}`)
    } else {
      game.handleAction('observe:next')
      const speciesId = game.state.currentEncounter.speciesId
      game.handleAction(`identify:${speciesId}`)
      assert.equal(game.scene, SCREEN.DECIDE)
      game.handleAction('decision:leave')
    }
  }

  assert.equal(game.scene, SCREEN.RESULT)
  assert.equal(game.state.profile.completedRuns, 1)
  game.handleAction('nav:home')
  assert.equal(game.scene, SCREEN.HOME)
})

test('save failure is surfaced without blocking play', () => {
  const game = new Game(createCanvas(), 78, createPlatform({ failSave: true }))
  game.handleAction('tool:tracker')
  assert.equal(game.state.profile.selectedTool, 'tracker')
  assert.match(game.feedback, /存档失败/)
})

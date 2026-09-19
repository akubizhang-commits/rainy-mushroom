import test from 'node:test'
import assert from 'node:assert/strict'
import { ForagingApplication } from '../js/voxel/ForagingApplication.js'
import { ExplorationGame } from '../js/ExplorationGame.js'
import { ForagingState } from '../js/core/ForagingState.js'
import { EXPLORATION_SCREEN } from '../js/core/ExplorationState.js'
import { EXPLORATION_SPECIES } from '../js/data/explorationData.js'

for (const Controller of [ForagingApplication, ExplorationGame]) {
  test(`${Controller.name}: collection returns to the same page after details and other menus`, () => {
    const app = Object.create(Controller.prototype)
    Object.assign(app, { state: new ForagingState(), collectionPage: 0, feedback: '' })
    app.handleAction('nav:collection')
    assert.equal(app.collectionPage, 0)
    const lastPage = Math.ceil(EXPLORATION_SPECIES.length / 6) - 1
    for (let page = 1; page <= lastPage; page++) {
      app.handleAction('collectionPage:next')
      const id = EXPLORATION_SPECIES[page * 6].id
      app.state.profile.collection[id] = { seen: true, sampled: 1, identified: true }
      app.handleAction(`collection:${id}`)
      assert.equal(app.screen, EXPLORATION_SCREEN.COLLECTION_DETAIL)
      app.handleAction('nav:collection')
      assert.equal(app.screen, EXPLORATION_SCREEN.COLLECTION)
      assert.equal(app.collectionPage, page)
    }
    app.handleAction('nav:home')
    app.handleAction('nav:collection')
    assert.equal(app.collectionPage, lastPage)
    app.handleAction('collectionPage:next')
    assert.equal(app.collectionPage, lastPage)
    app.handleAction('collectionPage:prev')
    assert.equal(app.collectionPage, lastPage - 1)
  })
}

test('returning after either identification outcome preserves the collection page', () => {
  for (const correct of [true, false]) {
    const app = Object.create(ForagingApplication.prototype)
    Object.assign(app, { state: new ForagingState(), collectionPage: 2, feedback: '' })
    const id = EXPLORATION_SPECIES[12].id
    app.state.profile.collection[id] = { seen: true, sampled: 1, identified: false }
    app.handleAction(`collection:${id}`)
    for (let i = 0; i < 3; i++) app.state.studyCollection()
    const answer = correct ? id : app.state.collectionCandidates.find(s => s.id !== id).id
    assert.equal(app.state.identifyCollection(answer).correct, correct)
    app.handleAction('nav:collection')
    assert.equal(app.collectionPage, 2)
  }
})

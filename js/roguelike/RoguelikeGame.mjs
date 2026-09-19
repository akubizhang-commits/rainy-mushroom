import { loadMushroomsForHabitat } from './speciesAdapter.mjs'
import { generateRoute } from './routeGenerator.mjs'

export class RoguelikeGame {
  constructor(config) {
    this._route = generateRoute(config.seed)
    this._pool = loadMushroomsForHabitat(config.habitatId)
    this._hp = config.startHp ?? 5
    this._state = 'traveling'
    this._current = this._route.startId
    this._harvested = []
    this._listeners = new Map()
  }
  get state() { return this._state }
  get hp() { return this._hp }
  get route() { return this._route }
  get currentNodeId() { return this._current }
  get harvested() { return [...this._harvested] }
  get pool() { return [...this._pool] }

  availableNextIds() {
    const node = this._route.nodes.find(n => n.id === this._current)
    return node ? [...node.nextIds] : []
  }

  enterNode(nodeId) {
    if (this._state !== 'traveling') throw new Error('not traveling')
    if (!this.availableNextIds().includes(nodeId)) throw new Error('not reachable')
    this._current = nodeId
    this._state = 'inEncounter'
    this._emit('nodeChanged', { nodeId })
    const node = this._route.nodes.find(n => n.id === nodeId)
    return node.type
  }

  resolveEncounter({ harvested, hpDelta } = {}) {
    if (this._state !== 'inEncounter') throw new Error('not in encounter')
    if (harvested) {
      this._harvested.push(harvested)
      this._emit('harvested', { card: harvested })
    }
    if (hpDelta) {
      this._hp = Math.max(0, this._hp + hpDelta)
      this._emit('hpChanged', { hp: this._hp })
    }
    if (this._hp <= 0) return this._end()
    if (this.availableNextIds().length === 0) return this._end()
    this._state = 'traveling'
  }

  on(event, cb) {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set())
    this._listeners.get(event).add(cb)
    return () => this._listeners.get(event).delete(cb)
  }
  _emit(event, payload) {
    const set = this._listeners.get(event)
    if (set) for (const cb of set) cb(payload)
  }
  _end() {
    this._state = 'ended'
    this._emit('gameEnded', { harvested: this.harvested, hp: this._hp })
  }
}

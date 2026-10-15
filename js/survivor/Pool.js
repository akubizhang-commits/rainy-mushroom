// Fixed-capacity object pool (03 §3.5). Pre-allocates every object up front so the
// battle loop never calls `new`. Pure logic only: no Math.random, no Date.now.
//
// - Each object gets a stable `slot` (its index in the backing store, never changes).
// - acquire() returns a free object and appends it to the dense `active` table; the
//   object is reset by `reset(obj, ...args)` and given a fresh incrementing `uid`.
// - release(o) uses swap-remove against `active`: the last active element moves into
//   o's position, so removal is O(1). `active` stays dense for cheap iteration.
// - Pool full → acquire returns null (caller skips the spawn and counts it).

export class Pool {
  constructor(capacity, factory, reset) {
    this.capacity = capacity
    this.reset = typeof reset === 'function' ? reset : null
    // Backing store: every object exists for the whole run.
    this.items = new Array(capacity)
    // Dense list of currently-acquired objects (indices 0..count-1 are valid).
    this.active = new Array(capacity)
    this.count = 0
    // Position of each slot inside `active` (-1 when the slot is free).
    this.activeIndex = new Int32Array(capacity).fill(-1)
    // Free-list stack of slot indices; O(1) acquire/release.
    this.free = new Int32Array(capacity)
    this.freeTop = capacity
    this.nextUid = 1
    for (let slot = 0; slot < capacity; slot += 1) {
      const obj = factory(slot)
      obj.slot = slot
      this.items[slot] = obj
      // Fill the free stack so slot 0 is popped first (deterministic order).
      this.free[slot] = capacity - 1 - slot
    }
  }

  acquire(...args) {
    if (this.freeTop <= 0) return null
    this.freeTop -= 1
    const slot = this.free[this.freeTop]
    const obj = this.items[slot]
    const indexInActive = this.count
    this.active[indexInActive] = obj
    this.activeIndex[slot] = indexInActive
    this.count += 1
    obj.uid = this.nextUid
    this.nextUid += 1
    if (this.reset) this.reset(obj, ...args)
    return obj
  }

  release(obj) {
    if (!obj) return false
    const slot = obj.slot
    const index = this.activeIndex[slot]
    if (index < 0) return false
    const lastIndex = this.count - 1
    const last = this.active[lastIndex]
    // Swap-remove: move the last active object into the freed position.
    this.active[index] = last
    this.activeIndex[last.slot] = index
    this.active[lastIndex] = undefined
    this.activeIndex[slot] = -1
    this.count = lastIndex
    // Return the slot to the free stack.
    this.free[this.freeTop] = slot
    this.freeTop += 1
    return true
  }

  releaseAll() {
    for (let i = 0; i < this.count; i += 1) {
      const slot = this.active[i].slot
      this.activeIndex[slot] = -1
      this.active[i] = undefined
    }
    this.count = 0
    this.freeTop = this.capacity
    for (let slot = 0; slot < this.capacity; slot += 1) {
      this.free[slot] = this.capacity - 1 - slot
    }
  }

  isActive(obj) {
    return !!obj && this.activeIndex[obj.slot] >= 0
  }
}

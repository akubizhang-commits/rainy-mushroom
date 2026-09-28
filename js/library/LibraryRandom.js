// Same algorithm as js/core/Random.js; duplicated so js/library stays self-contained for the Cocos sync.
export function hashSeed(value) {
  const text = String(value)
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export class SeededRandom {
  constructor(seed) {
    this.state = hashSeed(seed) || 0x6d2b79f5
  }

  next() {
    let value = this.state += 0x6d2b79f5
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }

  int(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min
  }

  shuffle(items) {
    const result = items.slice()
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = this.int(0, i)
      const current = result[i]
      result[i] = result[j]
      result[j] = current
    }
    return result
  }
}

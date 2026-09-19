export class HarvestProgress {
  constructor(durationMs = 1500) {
    this._duration = durationMs
    this._startAt = null
    this._complete = false
  }

  start(nowMs) {
    if (this._complete) return
    this._startAt = nowMs
  }

  release(nowMs) {
    this._startAt = null
  }

  tick(nowMs) {
    if (this._startAt == null) return 0
    const p = Math.min(1, (nowMs - this._startAt) / this._duration)
    if (p >= 1) this._complete = true
    return p
  }

  get isComplete() {
    return this._complete
  }
}

import { LIBRARY_LEVELS } from './LibraryLevels.js'

export const LIBRARY_PROGRESS_KEY = 'rainyLibrary.progress.v1'
export const LIBRARY_IDS = LIBRARY_LEVELS.map(level => level.id)

export class LibraryProgress {
  // Ids and key are parameters so each game mode keeps its own save.
  constructor(storage, ids = LIBRARY_IDS, key = LIBRARY_PROGRESS_KEY) {
    this.storage = storage
    this.ids = ids
    this.key = key
    this.completed = []
    this.saved = true
    this.locked = false
    let raw = null
    try { raw = storage.getItem(key) } catch { this.lock(); return }
    if (!raw) return
    try {
      const data = JSON.parse(raw)
      if (data?.version === 1 && Array.isArray(data.completed)) {
        this.completed = ids.filter(id => data.completed.includes(id))
        return
      }
    } catch {}
    // Unreadable or newer saves stay untouched; this session's progress lives in memory only.
    this.lock()
  }

  lock() {
    this.locked = true
    this.saved = false
  }

  get next() { return this.ids.find(id => !this.completed.includes(id)) || this.ids[this.ids.length - 1] }

  get lit() { return this.completed.length }

  canOpen(id) {
    const index = this.ids.indexOf(id)
    return index >= 0 && this.ids.slice(0, index).every(prior => this.completed.includes(prior))
  }

  complete(id) {
    if (!this.canOpen(id)) return false
    if (!this.completed.includes(id)) this.completed = this.ids.filter(level => level === id || this.completed.includes(level))
    if (this.locked) return false
    try {
      this.storage.setItem(this.key, JSON.stringify({ version: 1, completed: this.completed }))
      this.saved = true
      return true
    } catch {
      this.saved = false
      return false
    }
  }
}

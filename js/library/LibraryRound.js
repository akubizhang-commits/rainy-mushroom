import { ShelfBoard } from './ShelfBoard.js'
import { layoutPile, isCovered, BOOK_W, BOOK_H } from './BookPile.js'
import { RainState } from './RainState.js'
import { SeededRandom } from './LibraryRandom.js'
import { levelBooks } from './LibraryLevels.js'

export const HEARTS = 3
export const ROW_RECEDE = .08
export const REVIVE_RECEDE = .3
export const RACK_SIZE = 2
export const DRY_SECONDS = 5
export const MAGNIFIER_SECONDS = 8
export const DRIED_CLEARANCE = .15
export const MAX_STEP = .1

export class LibraryRound {
  constructor(level, { seed = level.seed } = {}) {
    this.level = level
    this.books = layoutPile(levelBooks(level), { seed: `${seed}:pile`, jitter: level.jitter, rowStep: level.rowStep })
    this.shelf = new ShelfBoard(level.sections, level.cols)
    this.rain = new RainState(level, new SeededRandom(seed))
    this.hearts = HEARTS
    this.status = 'playing'
    this.time = 0
    this.revived = false
    this.rack = []
    this.magnifierCharges = 1
    this.magnifierLeft = 0
    this.events = []
  }

  get water() { return this.rain.water }

  get remaining() { return this.books.filter(b => b.state !== 'shelved' && b.state !== 'soaked').length }

  book(id) { return this.books.find(b => b.id === id) || null }

  canPick(id) {
    const book = this.book(id)
    return !!book && this.status === 'playing' && book.state === 'floor' && !this.books.some(b => b.state === 'held') && !isCovered(book, this.books)
  }

  pick(id) {
    if (!this.canPick(id)) return false
    this.book(id).state = 'held'
    return true
  }

  cancel(id) {
    const book = this.book(id)
    if (book?.state === 'held') book.state = 'floor'
  }

  drop(id, key) {
    const book = this.book(id)
    if (book?.state !== 'held') return 'rejected'
    if (this.status !== 'playing' || book.wet || !this.shelf.place(book, key)) {
      book.state = 'floor'
      return 'rejected'
    }
    book.state = 'shelved'
    this.events.push({ type: 'shelved', id, key })
    const row = this.shelf.claimCompletedRow(key)
    if (row >= 0) {
      this.rain.recede(ROW_RECEDE)
      this.events.push({ type: 'row', row })
    }
    this.checkWin()
    return 'shelved'
  }

  dropToRack(id) {
    const book = this.book(id)
    if (book?.state !== 'held') return false
    if (this.status !== 'playing' || !book.wet || this.rack.length >= RACK_SIZE) {
      book.state = 'floor'
      return false
    }
    book.state = 'drying'
    this.rack.push({ id, left: DRY_SECONDS })
    return true
  }

  useMagnifier() {
    if (this.status !== 'playing' || this.magnifierCharges <= 0 || this.magnifierLeft > 0) return false
    this.magnifierCharges -= 1
    this.magnifierLeft = MAGNIFIER_SECONDS
    return true
  }

  grantMagnifier() { this.magnifierCharges += 1 }

  hintSlot(id) {
    const book = this.book(id)
    return this.magnifierLeft > 0 && book && !book.wet ? this.shelf.keyOf(book) : null
  }

  revive() {
    if (this.status !== 'reviving' || this.revived) return false
    this.revived = true
    this.hearts = HEARTS
    this.rain.recede(REVIVE_RECEDE)
    this.status = 'playing'
    return true
  }

  giveUp() {
    if (this.status === 'reviving') this.status = 'lost'
  }

  drain() {
    const events = this.events
    this.events = []
    return events
  }

  update(dt) {
    if (this.status !== 'playing' || !(dt > 0)) return
    const step = Math.min(dt, MAX_STEP)
    this.time += step
    this.magnifierLeft = Math.max(0, this.magnifierLeft - step)
    for (const x of this.rain.advance(step)) this.drip(x)
    this.dry(step)
    this.soak()
  }

  drip(x) {
    const top = this.books.filter(b => b.state === 'floor' && Math.abs(b.x - x) <= BOOK_W / 2).sort((a, b) => b.z - a.z)[0]
    if (!top || top.wet) return
    top.wet = true
    this.events.push({ type: 'wet', id: top.id })
  }

  dry(dt) {
    for (const slot of this.rack) slot.left -= dt
    for (const slot of this.rack.filter(s => s.left <= 0)) {
      const book = this.book(slot.id)
      book.wet = false
      book.state = 'floor'
      book.z = Math.max(...this.books.map(b => b.z)) + 1
      book.y = Math.min(1 - BOOK_H / 2, Math.max(book.y, this.rain.water + DRIED_CLEARANCE + BOOK_H / 2))
      this.events.push({ type: 'dried', id: book.id })
    }
    this.rack = this.rack.filter(s => s.left > 0)
  }

  soak() {
    for (const book of this.books) {
      if (book.state !== 'floor' || this.rain.water < book.y - BOOK_H / 2) continue
      book.state = 'soaked'
      this.shelf.damage(book)
      this.hearts -= 1
      this.events.push({ type: 'soaked', id: book.id })
      if (this.hearts <= 0) {
        this.status = this.revived ? 'lost' : 'reviving'
        return
      }
    }
    this.checkWin()
  }

  checkWin() {
    if (this.status !== 'playing' || this.remaining) return
    this.status = 'won'
    this.events.push({ type: 'won' })
  }
}

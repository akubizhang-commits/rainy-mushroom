import { PackRound } from './PackRound.js'
import { candidates } from './PackLevels.js'
import { SeededRandom } from './LibraryRandom.js'

// Test-only players for tuning. Neither reads a book's hidden attributes directly.

// Flips every ambiguous book, then solves each cabinet's rows exactly before placing anything.
export function planner(level, seed = level.seed) {
  const round = new PackRound(level, { seed })
  for (const book of round.books) if (candidates(book, level.cabinets).length > 1) round.flip(book.id)
  level.cabinets.forEach((cabinet, c) => {
    const books = round.books.filter(b => candidates(b, level.cabinets)[0] === c)
    const plan = pack(books, cabinet.rows)
    plan.forEach((row, r) => row.forEach(book => round.place(book.id, c, r)))
  })
  return { status: round.status, used: round.used, steps: round.steps, revived: round.revived }
}

// Exact fill: tallest and thickest first, each book into some row with room. Rows are small, so plain backtracking is instant.
export function pack(books, rows) {
  const order = books.slice().sort((a, b) => (b.height === 'tall') - (a.height === 'tall') || b.thickness - a.thickness)
  const room = rows.map(row => row.length), plan = rows.map(() => [])
  const go = i => {
    if (i === order.length) return room.every(r => r === 0)
    const book = order[i]
    for (let r = 0; r < rows.length; r += 1) {
      if (book.thickness > room[r] || (book.height === 'tall' && rows[r].height !== 'tall')) continue
      room[r] -= book.thickness; plan[r].push(book)
      if (go(i + 1)) return true
      room[r] += book.thickness; plan[r].pop()
    }
    return false
  }
  if (!go(0)) throw Error('no exact packing')
  return plan
}

// Never flips; guesses between matching cabinets and drops each book into the first row it fits, pulling a book back out when stuck.
export function greedy(level, seed = level.seed) {
  const round = new PackRound(level, { seed }), rng = new SeededRandom(`${seed}:greedy`)
  for (let guard = 0; guard < 500 && round.status === 'playing'; guard += 1) {
    let moved = false
    for (const book of round.books.filter(b => b.state === 'floor')) {
      const options = candidates(book, level.cabinets), c = options[rng.int(0, options.length - 1)]
      const r = level.cabinets[c].rows.findIndex((row, i) => round.preview(book.id, c, i) === 'ok')
      if (r < 0) continue
      round.place(book.id, c, r)
      moved = true
      break
    }
    if (moved) continue
    const stuck = round.books.filter(b => b.state === 'shelved' && (at => !round.board.full(at.cabinet, at.row))(round.board.where(b)))
    const pool = stuck.length ? stuck : round.books.filter(b => b.state === 'shelved')
    round.remove(pool[rng.int(0, pool.length - 1)].id)
  }
  return { status: round.status, used: round.used, steps: round.steps }
}

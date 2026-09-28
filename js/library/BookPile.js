import { SeededRandom } from './LibraryRandom.js'

export const BOOK_W = .14
export const BOOK_H = .16
export const COVER_LIMIT = .3

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

// Rows of up to `perRow` books rising from y=.28; jitter makes neighbours overlap from level 2 on.
export function layoutPile(books, { seed, jitter = 0, rowStep = .155, perRow = 5 }) {
  const random = new SeededRandom(seed)
  const order = random.shuffle(books)
  const layers = random.shuffle(order.map((_, i) => i))
  return order.map((book, i) => {
    const row = Math.floor(i / perRow), col = i % perRow
    const spacing = .8 / Math.min(perRow, order.length - row * perRow)
    const x = clamp(.1 + spacing * (col + .5) + (random.next() * 2 - 1) * jitter, BOOK_W / 2, 1 - BOOK_W / 2)
    const y = clamp(.28 + row * rowStep + (random.next() * 2 - 1) * jitter, BOOK_H / 2, 1 - BOOK_H / 2)
    return { ...book, x, y, z: layers[i], state: 'floor', wet: false }
  })
}

export function overlapRatio(a, b) {
  const w = Math.max(0, Math.min(a.x + BOOK_W / 2, b.x + BOOK_W / 2) - Math.max(a.x - BOOK_W / 2, b.x - BOOK_W / 2))
  const h = Math.max(0, Math.min(a.y + BOOK_H / 2, b.y + BOOK_H / 2) - Math.max(a.y - BOOK_H / 2, b.y - BOOK_H / 2))
  return (w * h) / (BOOK_W * BOOK_H)
}

export function isCovered(book, books) {
  return books.some(other => other !== book && other.state === 'floor' && other.z > book.z && overlapRatio(book, other) > COVER_LIMIT)
}

export const SNAP_RADIUS = 36

export class ShelfBoard {
  constructor(sections, cols) {
    this.sections = sections.slice()
    this.cols = cols
    this.filled = new Map()
    this.damaged = new Set()
    this.completedRows = new Set()
  }

  keyOf(book) {
    const row = this.sections.indexOf(book.section)
    if (row < 0 || book.volume < 1 || book.volume > this.cols) return null
    return `${row}:${book.volume - 1}`
  }

  place(book, key) {
    if (!key || key !== this.keyOf(book) || this.filled.has(key) || this.damaged.has(key)) return false
    this.filled.set(key, book.id)
    return true
  }

  damage(book) {
    const key = this.keyOf(book)
    if (key && !this.filled.has(key)) this.damaged.add(key)
  }

  // Returns the row index the first time every undamaged slot in it is filled, otherwise -1.
  claimCompletedRow(key) {
    const row = Number(key.split(':')[0])
    if (this.completedRows.has(row)) return -1
    let filled = 0
    for (let col = 0; col < this.cols; col += 1) {
      const slot = `${row}:${col}`
      if (this.filled.has(slot)) filled += 1
      else if (!this.damaged.has(slot)) return -1
    }
    if (!filled) return -1
    this.completedRows.add(row)
    return row
  }
}

export function shelfLayout({ left, top, width, height, plaque = 40 }, rows, cols) {
  const cellW = (width - plaque) / cols, cellH = height / rows, slots = []
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      slots.push({ key: `${row}:${col}`, row, col, x: left + plaque + (col + .5) * cellW, y: top - (row + .5) * cellH, width: cellW, height: cellH })
    }
  }
  return slots
}

export function nearestSlot(slots, x, y, radius = SNAP_RADIUS) {
  let best = null, bestDistance = radius
  for (const slot of slots) {
    const distance = Math.hypot(slot.x - x, slot.y - y)
    if (distance <= bestDistance) { best = slot; bestDistance = distance }
  }
  return best ? best.key : null
}

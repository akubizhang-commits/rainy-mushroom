// Cabinet rows as ordered lists of books. Books pack to the left, so a row is just its order of arrival.
export class PackBoard {
  constructor(cabinets) {
    this.rows = cabinets.map(cabinet => cabinet.rows.map(row => ({ height: row.height, length: row.length, books: [] })))
  }

  row(cabinet, row) { return this.rows[cabinet]?.[row] || null }

  used(cabinet, row) { return this.row(cabinet, row).books.reduce((sum, book) => sum + book.thickness, 0) }

  // Size check alone: what the player can see before dropping.
  size(book, cabinet, row) {
    const target = this.row(cabinet, row)
    if (!target) return 'too-thick'
    if (book.height === 'tall' && target.height !== 'tall') return 'too-tall'
    if (this.used(cabinet, row) + book.thickness > target.length) return 'too-thick'
    return 'ok'
  }

  // The cabinet is judged first, so a wrong cabinet always costs the wrong-cabinet penalty.
  fit(book, cabinet, row) {
    if (!this.row(cabinet, row)) return 'too-thick'
    if (book.cabinet !== cabinet) return 'wrong-cabinet'
    return this.size(book, cabinet, row)
  }

  place(book, cabinet, row) {
    if (this.fit(book, cabinet, row) !== 'ok') return false
    this.row(cabinet, row).books.push(book)
    return true
  }

  where(book) {
    for (let c = 0; c < this.rows.length; c += 1) {
      for (let r = 0; r < this.rows[c].length; r += 1) {
        const index = this.rows[c][r].books.indexOf(book)
        if (index >= 0) return { cabinet: c, row: r, index }
      }
    }
    return null
  }

  remove(book) {
    const at = this.where(book)
    if (at) this.rows[at.cabinet][at.row].books.splice(at.index, 1)
    return at
  }

  full(cabinet, row) { return this.used(cabinet, row) === this.row(cabinet, row).length }

  get complete() { return this.rows.every((rows, c) => rows.every((row, r) => this.full(c, r))) }
}

// Uniform spatial grid for circle-vs-circle broad-phase (03 §3.6). Pure logic only:
// no Math.random, no Date.now.
//
// - The grid follows the player: a `cols × rows` window centred on the player's cell.
//   Default 40×40 cells of size 64 covers ±1280 world units around the player.
// - Rebuilt every step with a counting sort (no allocation after construction):
//   count per cell → prefix sum → scatter slots into `items`.
// - Entities with radius > `maxCellRadius` (default 32) do not enter the grid; the
//   caller puts them in a `large` list that queryCircle scans directly.
// - queryCircle(x, y, r, out) covers every cell within r + maxCellRadius and writes
//   candidate slots into the reused `out` Int32Array, returning the count. The caller
//   then does the exact circle test and appends the `large` list separately.

export class SpatialGrid {
  constructor(options = {}) {
    this.cols = options.cols || 40
    this.rows = options.rows || 40
    this.cellSize = options.cellSize || 64
    this.maxCellRadius = options.maxCellRadius || 32
    this.capacity = options.capacity || 202
    const cellCount = this.cols * this.rows
    this.cellCount = new Int32Array(cellCount)
    this.cellStart = new Int32Array(cellCount + 1)
    this.writePos = new Int32Array(cellCount)
    this.items = new Int32Array(this.capacity)
    // Per-entity scratch captured during the count pass (slot + target cell).
    this.scratchSlot = new Int32Array(this.capacity)
    this.scratchCell = new Int32Array(this.capacity)
    this.itemCount = 0
    // Origin cell (world coords of the window's lower-left corner), set on build.
    this.originCol = 0
    this.originRow = 0
    this.large = []
  }

  // Map a world coordinate to a window-local cell index, clamped to the window edges
  // (03 §3.6: entities outside the window are pinned to the edge cell; rare, because
  // far enemies get relocated by the spawner).
  _clamp(value, max) {
    if (value < 0) return 0
    if (value > max) return max
    return value
  }

  // Rebuild the grid around `center` from the dense active list of entities.
  // Each entity must have `x`, `y`, `r`, `slot`. Entities with r > maxCellRadius are
  // pushed into `this.large` instead of the grid.
  build(active, count, center) {
    const cols = this.cols
    const rows = this.rows
    const size = this.cellSize
    const total = cols * rows
    this.cellCount.fill(0)
    this.large.length = 0
    // Centre the window on the player's cell.
    const centerCol = Math.floor(center.x / size)
    const centerRow = Math.floor(center.y / size)
    this.originCol = centerCol - (cols >> 1)
    this.originRow = centerRow - (rows >> 1)

    let gridItems = 0
    // First pass: count per cell and stash each entity's slot + cell.
    for (let i = 0; i < count; i += 1) {
      const e = active[i]
      if (e.r > this.maxCellRadius) {
        this.large.push(e)
        continue
      }
      const col = this._clamp(Math.floor(e.x / size) - this.originCol, cols - 1)
      const row = this._clamp(Math.floor(e.y / size) - this.originRow, rows - 1)
      const cell = row * cols + col
      this.cellCount[cell] += 1
      this.scratchCell[gridItems] = cell
      this.scratchSlot[gridItems] = e.slot
      gridItems += 1
    }
    this.itemCount = gridItems

    // Prefix sum → cellStart; seed the write cursors from the same starts.
    let running = 0
    for (let cell = 0; cell < total; cell += 1) {
      this.cellStart[cell] = running
      this.writePos[cell] = running
      running += this.cellCount[cell]
    }
    this.cellStart[total] = running

    // Scatter: place each entity slot into its cell's contiguous region in `items`.
    for (let i = 0; i < gridItems; i += 1) {
      const cell = this.scratchCell[i]
      const pos = this.writePos[cell]
      this.items[pos] = this.scratchSlot[i]
      this.writePos[cell] = pos + 1
    }
    return this
  }

  // Collect candidate entity slots whose cell lies within (r + maxCellRadius) of the
  // query circle. Writes into `out` (Int32Array) and returns the number written.
  queryCircle(x, y, r, out) {
    const size = this.cellSize
    const cols = this.cols
    const rows = this.rows
    const reach = r + this.maxCellRadius
    const minCol = Math.floor((x - reach) / size) - this.originCol
    const maxCol = Math.floor((x + reach) / size) - this.originCol
    const minRow = Math.floor((y - reach) / size) - this.originRow
    const maxRow = Math.floor((y + reach) / size) - this.originRow
    const lowCol = this._clamp(minCol, cols - 1)
    const highCol = this._clamp(maxCol, cols - 1)
    const lowRow = this._clamp(minRow, rows - 1)
    const highRow = this._clamp(maxRow, rows - 1)
    let written = 0
    for (let row = lowRow; row <= highRow; row += 1) {
      const base = row * cols
      for (let col = lowCol; col <= highCol; col += 1) {
        const cell = base + col
        const start = this.cellStart[cell]
        const end = this.cellStart[cell + 1]
        for (let i = start; i < end; i += 1) {
          if (written >= out.length) return written
          out[written] = this.items[i]
          written += 1
        }
      }
    }
    return written
  }
}

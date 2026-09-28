import { LIBRARY_LEVELS } from '../../js/library/LibraryLevels.js'
import { autoplay } from '../../js/library/LibraryAutoplay.js'

// Fraction of the fastest safe water speed for a 3s-per-book player; lower is gentler.
const FACTORS = { 'library-01': .35, 'library-02': .5, 'library-03': .6, 'library-04': .7, 'library-05': .7 }

for (const level of LIBRARY_LEVELS) {
  let low = 0, high = .05
  for (let i = 0; i < 30; i += 1) {
    const mid = (low + high) / 2, result = autoplay({ ...level, waterSpeed: mid }, { interval: 3 })
    if (result.status === 'won' && result.soaked === 0) low = mid
    else high = mid
  }
  const speed = Number((low * FACTORS[level.id]).toFixed(5))
  console.log(`${level.id} max ${low.toFixed(5)} use ${speed}${speed === level.waterSpeed ? '' : `  (current ${level.waterSpeed})`}`)
}

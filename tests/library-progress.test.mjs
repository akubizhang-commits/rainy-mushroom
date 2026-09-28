import test from 'node:test'
import assert from 'node:assert/strict'
import { LibraryProgress, LIBRARY_PROGRESS_KEY } from '../js/library/LibraryProgress.js'
import { PACK_IDS, PACK_PROGRESS_KEY } from '../js/library/PackLevels.js'

const memory = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), m } }

test('levels unlock in order and completion persists', () => {
  const db = memory(), p = new LibraryProgress(db)
  assert.equal(p.next, 'library-01')
  assert.equal(p.canOpen('library-02'), false)
  assert.equal(p.complete('library-02'), false)
  assert.equal(p.complete('library-01'), true)
  assert.equal(p.complete('library-01'), true)
  const again = new LibraryProgress(db)
  assert.deepEqual(again.completed, ['library-01'])
  assert.equal(again.lit, 1)
  assert.equal(again.next, 'library-02')
  assert.equal(again.canOpen('library-02'), true)
  assert.deepEqual(JSON.parse(db.getItem(LIBRARY_PROGRESS_KEY)), { version: 1, completed: ['library-01'] })
})

test('unknown ids in a save are dropped and after the last level next stays on it', () => {
  const db = memory()
  db.setItem(LIBRARY_PROGRESS_KEY, JSON.stringify({ version: 1, completed: ['library-02', 'x', 'library-01', 'library-03', 'library-04', 'library-05'] }))
  const p = new LibraryProgress(db)
  assert.deepEqual(p.completed, ['library-01', 'library-02', 'library-03', 'library-04', 'library-05'])
  assert.equal(p.next, 'library-05')
})

test('corrupt or future saves are never overwritten', () => {
  for (const raw of ['{broken', JSON.stringify({ version: 2, completed: [] }), JSON.stringify({ version: 1 })]) {
    const db = memory()
    db.setItem(LIBRARY_PROGRESS_KEY, raw)
    const p = new LibraryProgress(db)
    assert.equal(p.locked, true)
    assert.equal(p.complete('library-01'), false)
    assert.deepEqual(p.completed, ['library-01'], 'still tracked in memory')
    assert.equal(db.getItem(LIBRARY_PROGRESS_KEY), raw)
  }
})

test('storage failures do not throw', () => {
  const broken = { getItem: () => { throw Error('denied') }, setItem: () => { throw Error('full') } }
  const p = new LibraryProgress(broken)
  assert.equal(p.complete('library-01'), false)
  assert.equal(p.saved, false)
  const full = memory()
  full.setItem = () => { throw Error('full') }
  const q = new LibraryProgress(full)
  assert.equal(q.complete('library-01'), false)
  assert.equal(q.saved, false)
  assert.deepEqual(q.completed, ['library-01'])
})

test('the packing mode keeps its own level list and save key', () => {
  const db = memory()
  db.setItem(LIBRARY_PROGRESS_KEY, JSON.stringify({ version: 1, completed: ['library-01'] }))
  const p = new LibraryProgress(db, PACK_IDS, PACK_PROGRESS_KEY)
  assert.equal(p.next, 'pack-01')
  assert.equal(p.canOpen('library-02'), false)
  assert.equal(p.complete('pack-01'), true)
  assert.deepEqual(JSON.parse(db.getItem(PACK_PROGRESS_KEY)), { version: 1, completed: ['pack-01'] })
  assert.deepEqual(JSON.parse(db.getItem(LIBRARY_PROGRESS_KEY)), { version: 1, completed: ['library-01'] })
  assert.deepEqual(new LibraryProgress(db).completed, ['library-01'])
  db.setItem(PACK_PROGRESS_KEY, '{bad')
  const broken = new LibraryProgress(db, PACK_IDS, PACK_PROGRESS_KEY)
  assert.equal(broken.locked, true)
  assert.equal(broken.complete('pack-01'), false)
  assert.equal(db.getItem(PACK_PROGRESS_KEY), '{bad')
})

import test from 'node:test'
import assert from 'node:assert/strict'
import {
  SurvivorSave,
  SAVE_KEY,
  BACKUP_KEY,
  CORRUPT_KEY,
  CURRENT_SCHEMA,
  checksum,
  defaultProfile,
  encode,
  sanitizeProfile,
} from '../js/survivor/SurvivorSave.js'

// 内存 Map 注入，只实现 getItem/setItem（裁决 D13：不依赖 removeItem）。
function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial))
  const writes = []
  return {
    map,
    writes,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => {
      writes.push(k)
      map.set(k, String(v))
    },
  }
}
const quiet = { warn: () => {} }
function envelope(data, schema) {
  const text = JSON.stringify(data)
  return JSON.stringify({ format: 'survivor-save', schema, checksum: checksum(text), data: text })
}

test('storage stub exposes only getItem/setItem', () => {
  const s = memoryStorage()
  assert.deepEqual(Object.keys(s).filter((k) => typeof s[k] === 'function').sort(), ['getItem', 'setItem'])
})

test('missing save → new profile with schema-1 defaults incl. three settings (D3)', () => {
  const storage = memoryStorage()
  const save = new SurvivorSave(storage, quiet)
  const p = save.load()
  assert.deepEqual(p, defaultProfile())
  assert.deepEqual(p.settings, { sound: true, vibration: true, reduceFlash: false })
  assert.deepEqual(Object.keys(p.permanent), ['perm_hp', 'perm_might', 'perm_speed', 'perm_magnet', 'perm_regen'])
  assert.equal(save.locked, false)
  assert.equal(save.reset, false)
  assert.equal(storage.writes.length, 0, 'reading a fresh save writes nothing')
})

test('save → load round-trip; envelope schema 1 with valid checksum', () => {
  const storage = memoryStorage()
  const a = new SurvivorSave(storage, quiet)
  const p = a.load()
  p.crystals = 42
  p.settings.reduceFlash = true
  assert.equal(a.save(p), true)
  const env = JSON.parse(storage.map.get(SAVE_KEY))
  assert.equal(env.format, 'survivor-save')
  assert.equal(env.schema, CURRENT_SCHEMA)
  assert.equal(env.schema, 1)
  assert.equal(env.checksum, checksum(env.data))
  const b = new SurvivorSave(storage, quiet).load()
  assert.equal(b.crystals, 42)
  assert.equal(b.settings.reduceFlash, true)
})

test('write order: previous good record goes to backup before main; unchanged content skipped', () => {
  const storage = memoryStorage()
  const save = new SurvivorSave(storage, quiet)
  const p = save.load()
  save.save({ ...p, crystals: 1 })
  const first = storage.map.get(SAVE_KEY)
  storage.writes.length = 0
  save.save({ ...p, crystals: 2 })
  assert.deepEqual(storage.writes, [BACKUP_KEY, SAVE_KEY])
  assert.equal(storage.map.get(BACKUP_KEY), first)
  storage.writes.length = 0
  assert.equal(save.save({ ...p, crystals: 2 }), true)
  assert.equal(storage.writes.length, 0)
})

test('migration fixture: schema 0 record migrates, writes original to backup, then main', () => {
  const legacy = { crystals: 77, upgrades: { perm_hp: 2 }, runs: 3 }
  const raw = envelope(legacy, 0)
  const storage = memoryStorage({ [SAVE_KEY]: raw })
  const migrations = {
    0: (d) => ({ crystals: d.crystals, permanent: d.upgrades, runs: d.runs }),
  }
  const save = new SurvivorSave(storage, { ...quiet, migrations })
  const p = save.load()
  assert.equal(p.crystals, 77)
  assert.equal(p.permanent.perm_hp, 2)
  assert.equal(p.runs, 3)
  assert.equal(storage.map.get(BACKUP_KEY), raw)
  assert.equal(JSON.parse(storage.map.get(SAVE_KEY)).schema, 1)
  assert.deepEqual(storage.writes, [BACKUP_KEY, SAVE_KEY])
  assert.equal(new SurvivorSave(storage, quiet).load().crystals, 77)
})

test('corrupt main (bad JSON / checksum) → recovered from backup, main repaired on next save', () => {
  const good = encode({ ...defaultProfile(), crystals: 9 })
  for (const bad of ['{not json', JSON.stringify({ format: 'survivor-save', schema: 1, checksum: '0', data: '{}' })]) {
    const storage = memoryStorage({ [SAVE_KEY]: bad, [BACKUP_KEY]: good })
    const save = new SurvivorSave(storage, quiet)
    const p = save.load()
    assert.equal(p.crystals, 9)
    assert.equal(save.recovered, true)
    assert.equal(save.reset, false)
    assert.equal(storage.map.get(SAVE_KEY), bad, 'load itself does not rewrite')
    assert.equal(save.save(p), true)
    assert.equal(storage.map.get(SAVE_KEY), good)
    assert.equal(save.recovered, false)
  }
})

test('main and backup both corrupt → raw main kept in .corrupt, main overwritten with new profile', () => {
  const storage = memoryStorage({ [SAVE_KEY]: 'garbage-main', [BACKUP_KEY]: 'garbage-backup' })
  const warns = []
  const save = new SurvivorSave(storage, { warn: (m) => warns.push(m) })
  const p = save.load()
  assert.deepEqual(p, defaultProfile())
  assert.equal(save.reset, true)
  assert.equal(save.locked, false, 'never permanently locked')
  assert.equal(storage.map.get(CORRUPT_KEY), 'garbage-main')
  assert.deepEqual(new SurvivorSave(storage, quiet).load(), defaultProfile())
  assert.ok(warns.length >= 1)
  assert.equal(save.save({ ...p, crystals: 5 }), true)
})

test('newer schema → locked, main never overwritten', () => {
  const raw = envelope({ ...defaultProfile(), crystals: 500 }, CURRENT_SCHEMA + 1)
  const storage = memoryStorage({ [SAVE_KEY]: raw })
  const save = new SurvivorSave(storage, quiet)
  const p = save.load()
  assert.equal(save.locked, true)
  assert.equal(save.lockReason, 'newer')
  assert.equal(save.save({ ...p, crystals: 1 }), false)
  assert.equal(storage.map.get(SAVE_KEY), raw)
  assert.equal(storage.writes.length, 0)
  assert.equal(save.profile.crystals, 1, 'session data stays in memory')
})

test('getItem throws → locked as unreadable', () => {
  const save = new SurvivorSave({ getItem() { throw Error('no storage') }, setItem() {} }, quiet)
  save.load()
  assert.equal(save.locked, true)
  assert.equal(save.lockReason, 'unreadable')
})

test('setItem throws → save() false, saved=false, warns once; recovers on later success', () => {
  const storage = memoryStorage()
  let fail = true
  const warns = []
  const flaky = {
    getItem: storage.getItem,
    setItem: (k, v) => {
      if (fail) throw Error('quota')
      storage.setItem(k, v)
    },
  }
  const save = new SurvivorSave(flaky, { warn: (m) => warns.push(m) })
  const p = save.load()
  assert.equal(save.save({ ...p, crystals: 3 }), false)
  assert.equal(save.saved, false)
  assert.equal(save.save({ ...p, crystals: 4 }), false)
  assert.equal(warns.length, 1)
  assert.equal(save.profile.crystals, 4, 'in-memory data still valid')
  fail = false
  assert.equal(save.save({ ...p, crystals: 4 }), true)
  assert.equal(save.saved, true)
  assert.equal(new SurvivorSave(storage, quiet).load().crystals, 4)
})

test('sanitize clamps, floors, drops unknown ids and defaults bad booleans', () => {
  const p = sanitizeProfile({
    crystals: 99999999.7,
    permanent: { perm_hp: 9, perm_might: -2, perm_speed: 1.8, perm_magnet: 'x', perm_fake: 3 },
    bestSurvivalSec: 123.9,
    wins: -1,
    runs: NaN,
    settings: { sound: 'yes', vibration: false, reduceFlash: 1 },
    tutorial: { move: true, levelUp: null },
    extra: 1,
  })
  assert.equal(p.crystals, 10000000)
  assert.deepEqual(p.permanent, { perm_hp: 5, perm_might: 0, perm_speed: 1, perm_magnet: 0, perm_regen: 0 })
  assert.equal(p.bestSurvivalSec, 123)
  assert.equal(p.wins, 0)
  assert.equal(p.runs, 0)
  assert.deepEqual(p.settings, { sound: true, vibration: false, reduceFlash: false })
  assert.deepEqual(p.tutorial, { move: true, levelUp: false, boss: false })
  assert.equal('extra' in p, false)
  assert.deepEqual(sanitizeProfile(null), defaultProfile())
  assert.deepEqual(sanitizeProfile([1]), defaultProfile())
})

test('loaded data is sanitized', () => {
  const storage = memoryStorage({ [SAVE_KEY]: envelope({ crystals: -5, permanent: { perm_regen: 99 } }, 1) })
  const p = new SurvivorSave(storage, quiet).load()
  assert.equal(p.crystals, 0)
  assert.equal(p.permanent.perm_regen, 3)
})

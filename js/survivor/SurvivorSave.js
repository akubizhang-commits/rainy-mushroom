// 存档读写、校验、备份、版本迁移（03 §5）。不复用 StorageService（03 §1-4）。
// 注入接口只用 {getItem(key), setItem(key, value)}（裁决 D13，不依赖 removeItem）；
// 损坏档用覆盖写处理。逻辑层不直接调用 wx。
import { PERMANENT, CRYSTAL_CAP } from './data/permanent.js'

export const SAVE_KEY = 'survivor.v1.profile'
export const BACKUP_KEY = SAVE_KEY + '.backup'
export const CORRUPT_KEY = SAVE_KEY + '.corrupt'
export const SAVE_FORMAT = 'survivor-save'
export const CURRENT_SCHEMA = 1
// MIGRATIONS[n](data) → schema n+1 的 data（纯函数）。schema 1 为首个上线版本（裁决 D3），暂无迁移。
export const MIGRATIONS = Object.freeze({})

// FNV-1a 32 位，与 StorageService 相同；只用于发现损坏，不是加密。
export function checksum(text) {
  let hash = 2166136261
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619)
  return (hash >>> 0).toString(16)
}

export function defaultProfile() {
  const permanent = {}
  for (const p of PERMANENT) permanent[p.id] = 0
  return {
    crystals: 0,
    permanent,
    bestSurvivalSec: 0,
    wins: 0,
    runs: 0,
    settings: { sound: true, vibration: true, reduceFlash: false },
    tutorial: { move: false, levelUp: false, boss: false },
  }
}

function clampInt(v, min, max) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return min
  return Math.min(max, Math.max(min, Math.floor(v)))
}
function bools(src, defaults) {
  const s = src && typeof src === 'object' ? src : {}
  const out = {}
  for (const k of Object.keys(defaults)) out[k] = typeof s[k] === 'boolean' ? s[k] : defaults[k]
  return out
}

// 03 §5.3 第 7 条：夹取/默认值，不报错；未知强化 id 丢弃。
export function sanitizeProfile(data) {
  const d = data && typeof data === 'object' && !Array.isArray(data) ? data : {}
  const base = defaultProfile()
  const perm = d.permanent && typeof d.permanent === 'object' ? d.permanent : {}
  const permanent = {}
  for (const p of PERMANENT) permanent[p.id] = clampInt(perm[p.id], 0, p.prices.length)
  return {
    crystals: clampInt(d.crystals, 0, CRYSTAL_CAP),
    permanent,
    bestSurvivalSec: clampInt(d.bestSurvivalSec, 0, Number.MAX_SAFE_INTEGER),
    wins: clampInt(d.wins, 0, Number.MAX_SAFE_INTEGER),
    runs: clampInt(d.runs, 0, Number.MAX_SAFE_INTEGER),
    settings: bools(d.settings, base.settings),
    tutorial: bools(d.tutorial, base.tutorial),
  }
}

export function encode(profile, schema = CURRENT_SCHEMA) {
  const data = JSON.stringify(profile)
  return JSON.stringify({ format: SAVE_FORMAT, schema, checksum: checksum(data), data })
}

// 解析信封；任何损坏（JSON 失败、格式不符、checksum 不符、schema 非法）返回 null。
function decode(raw) {
  try {
    const env = JSON.parse(raw)
    if (!env || typeof env !== 'object' || env.format !== SAVE_FORMAT) return null
    if (!Number.isInteger(env.schema) || env.schema < 0) return null
    if (typeof env.data !== 'string' || checksum(env.data) !== env.checksum) return null
    const data = JSON.parse(env.data)
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null
    return { schema: env.schema, data }
  } catch {
    return null
  }
}

export class SurvivorSave {
  // options：currentSchema / migrations 供迁移测试注入夹具；warn 默认 console.warn。
  constructor(storage, options = {}) {
    this.storage = storage
    this.currentSchema = options.currentSchema ?? CURRENT_SCHEMA
    this.migrations = options.migrations || MIGRATIONS
    this.warn = options.warn || ((...a) => console.warn(...a))
    this.profile = defaultProfile()
    this.locked = false
    this.lockReason = '' // 'newer'（存档来自更新的版本）| 'unreadable'（存档无法读取）
    this.recovered = false // 主记录损坏、已从 backup 恢复，下次写入修复主记录
    this.reset = false // 主备都损坏，已以新档重新开始
    this.saved = true // 最近一次写入是否成功；false 时 UI 提示“存档写不进去”
    this._lastRaw = null // 上一份成功写入/读到的主记录原文
    this._warned = false
  }

  // 03 §5.3 读取流程，返回清洗后的 profile。
  load() {
    let mainRaw, backupRaw
    try {
      mainRaw = this.storage.getItem(SAVE_KEY)
      backupRaw = this.storage.getItem(BACKUP_KEY)
    } catch (err) {
      return this._lock('unreadable', err)
    }
    const main = mainRaw == null || mainRaw === '' ? null : decode(mainRaw)
    if (main) return this._accept(main, mainRaw)

    const backup = backupRaw == null || backupRaw === '' ? null : decode(backupRaw)
    const mainCorrupt = mainRaw != null && mainRaw !== ''
    if (backup) {
      this.recovered = mainCorrupt
      if (mainCorrupt) this.warn('[SurvivorSave] main record corrupt, recovered from backup')
      return this._accept(backup, backupRaw)
    }
    const backupCorrupt = backupRaw != null && backupRaw !== ''
    if (!mainCorrupt && !backupCorrupt) return this._fresh() // 首次游玩
    // 主备都损坏（或主缺失、备损坏）：原文留存一次到 .corrupt，以新档覆盖主键。
    this.warn('[SurvivorSave] save corrupt, starting a new profile')
    this.reset = true
    this.profile = defaultProfile()
    this._write(CORRUPT_KEY, mainCorrupt ? mainRaw : backupRaw)
    const raw = encode(this.profile, this.currentSchema)
    if (this._write(SAVE_KEY, raw)) this._lastRaw = raw
    return this.profile
  }

  _accept(record, raw) {
    if (record.schema > this.currentSchema) return this._lock('newer')
    let data = record.data
    if (record.schema < this.currentSchema) {
      for (let n = record.schema; n < this.currentSchema; n++) {
        const migrate = this.migrations[n]
        if (typeof migrate !== 'function') return this._lock('unreadable', Error('missing migration ' + n))
        data = migrate(data)
      }
      this.profile = sanitizeProfile(data)
      // 迁移后立即写回：先把原记录写入 backup，再写主记录。
      const next = encode(this.profile, this.currentSchema)
      if (this._write(BACKUP_KEY, raw) && this._write(SAVE_KEY, next)) this._lastRaw = next
      else this._lastRaw = raw
      return this.profile
    }
    this.profile = sanitizeProfile(data)
    this._lastRaw = raw
    return this.profile
  }

  _fresh() {
    this.profile = defaultProfile()
    return this.profile
  }

  _lock(reason, err) {
    this.locked = true
    this.lockReason = reason
    this.warn('[SurvivorSave] locked: ' + reason, err || '')
    this.profile = defaultProfile()
    return this.profile
  }

  _write(key, value) {
    try {
      this.storage.setItem(key, value)
      return true
    } catch (err) {
      this.saved = false
      if (!this._warned) {
        this._warned = true
        this.warn('[SurvivorSave] setItem failed', err)
      }
      return false
    }
  }

  // 03 §5.4：先把上一份成功内容写 backup，再写主记录；内容未变化时跳过。
  // locked 时不写（不覆盖更新版本的存档），返回 false；写失败返回 false、saved=false。
  save(profile) {
    this.profile = sanitizeProfile(profile)
    if (this.locked) return false
    const raw = encode(this.profile, this.currentSchema)
    if (raw === this._lastRaw && !this.recovered) {
      this.saved = true
      return true
    }
    if (this._lastRaw !== null && this._lastRaw !== raw && !this._write(BACKUP_KEY, this._lastRaw)) return false
    if (!this._write(SAVE_KEY, raw)) return false
    this._lastRaw = raw
    this.saved = true
    this.recovered = false
    this._warned = false
    return true
  }
}

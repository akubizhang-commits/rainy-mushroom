// Wave data (01-gdd §10). Only a frozen JSON literal: no functions, no imports.
// S1 scope (07 backlog §1) ships only gnat + beetle, so the wave table covers the
// time segments whose composition is entirely gnat/beetle: 0:00–1:00 and 1:00–2:00.
// The 2:00–3:00 segment introduces 灰蛾 moth (20%), which lands in S2 together with
// the remaining enemies; adding it here would reference an id missing from enemies.js
// and break validate(). Segments stay contiguous (each `fromSec` equals the previous
// `toSec`) and every composition sums to 100.
//
// `composition` maps enemy id → percent weight (integers summing to 100).
// `spawnRate` is enemies/second, `cap` is the on-screen cap (01 §10, ≤ limits hard cap).
//
// winAtSeconds is the S1 临时「计时胜利」目标：存活到该秒数即胜利（00 §8 D4 = 180s;
// 07 backlog §1 / D4）。S2 用 Boss / 撤离替换后降级为调试开关。
export const WAVES = Object.freeze({
  winAtSeconds: 180,
  segments: Object.freeze([
    Object.freeze({
      fromSec: 0,
      toSec: 60,
      spawnRate: 1.0,
      cap: 30,
      composition: Object.freeze({ gnat: 100 }),
    }),
    Object.freeze({
      fromSec: 60,
      toSec: 120,
      spawnRate: 1.6,
      cap: 50,
      composition: Object.freeze({ gnat: 70, beetle: 30 }),
    }),
  ]),
})

// Live browser check for 周天剑阵 (炼气中期) and 青莲剑阵 (炼气巅峰) on the built web-mobile game.
// Run after: npm run cocos:build
// Uses ?smoke=1 (memory-only storage). The campaign XP is set on the in-memory QA host state,
// then learning goes through the real learnSkill action. Combat runs in the real game loop
// (host ticker), with pause/resume/withdraw through the host QA hooks.
// Qinglian (3-round judgment): 3 s zone, one round per second (outer 16 → middle 12 → inner 8 petals),
// every target in reach takes 36 hits (16 + 12 + 8), targets are uncapped, cooldown 9 s.
// Hits are counted by wrapping the run instance's _qinglianPulse (test instrumentation, no game change).
'use strict'
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { createServer } = require('node:http')
const { pathToFileURL } = require('node:url')
const ROOT = path.resolve(__dirname, '..')
const OUT = path.join(ROOT, 'docs/xianxia/reports/qinglian-redo-2026-11-09/live')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ||
  '/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const VIEWPORTS = [{ width: 1280, height: 720 }, { width: 844, height: 390 }]
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
// Wanjian keeps its original fixture: three enemies at inner, middle and outer distances.
const FIXTURE_ENEMIES = [60, 130, 185]
// Qinglian fixture: ten enemies inside the 200 px reach (spread across the ring), and one outside it.
const QINGLIAN_IN_REACH = [25, 55, 85, 115, 145, 165, 180, 190, 196, 198]
const QINGLIAN_OUT_OF_REACH = 262
const QINGLIAN_ENEMIES = [...QINGLIAN_IN_REACH, QINGLIAN_OUT_OF_REACH]
const QINGLIAN_EXPECTED_HITS = 36
const QINGLIAN_ROUND_HITS = [16, 12, 8]
async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  const prof = await import(pathToFileURL(path.join(ROOT, 'js/xianxia/TowerProfile.js')).href)
  const campaign = await import(pathToFileURL(path.join(ROOT, 'js/xianxia/TowerCampaign.js')).href)
  const forms = await import(pathToFileURL(path.join(ROOT, 'js/xianxia/TowerSkillForms.js')).href)
  const { checksum } = await import(pathToFileURL(path.join(ROOT, 'js/xianxia/Checksum.js')).href)
  // Static geometry check: the judgment angles of each ring over a 0.1 s step, from the shared pose function.
  const form = forms.skillForm('sj_qinglian', 1)
  const angularSpeed = ringIndex => {
    const a0 = forms.qinglianPetalPose(form, 0, ringIndex, 0).angle, a1 = forms.qinglianPetalPose(form, .1, ringIndex, 0).angle
    return +((a0 - a1) / .1).toFixed(3)
  }
  const geometry = {
    rings: form.rings.map((r, i) => ({ index: i, radius: r.radius, petals: r.visualPetals, share: r.share, angularSpeedRadPerSec: angularSpeed(i) })),
    clockwise: angularSpeed(0) > 0,
    outerCoversRoundRad: +(angularSpeed(2) * form.interval).toFixed(3),
  }
  assert.ok(geometry.rings[0].angularSpeedRadPerSec > geometry.rings[1].angularSpeedRadPerSec && geometry.rings[1].angularSpeedRadPerSec > geometry.rings[2].angularSpeedRadPerSec, 'inner ring must spin fastest')
  assert.ok(geometry.clockwise, 'rings must spin clockwise (decreasing angle)')
  assert.ok(geometry.outerCoversRoundRad >= 2 * Math.PI, 'outer ring must sweep a full turn in one round')
  // Campaign envelopes at each realm level, written by the real store's sync and checksum.
  const envelopeAt = level => {
    let xp = 0; while (prof.cultivationAt(xp).level < level) xp += 5
    const memory = new Map(), storage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, v) }
    const now = Date.now(); new campaign.TowerCampaignStore(storage, now).act({ type: 'sync' }, now)
    const envelope = JSON.parse(memory.get(campaign.TOWER_CAMPAIGN_KEY)), state = JSON.parse(envelope.data)
    state.xp = xp; envelope.data = JSON.stringify(state); envelope.checksum = checksum(envelope.data)
    return JSON.stringify(envelope)
  }
  const RAW = { 3: envelopeAt(3), 4: envelopeAt(4), 6: envelopeAt(6), 7: envelopeAt(7) }
  // Page-side helper: swap the host's campaign store for one that holds the envelope at a given level.
  const KEY = campaign.TOWER_CAMPAIGN_KEY
  const server = createServer((req, res) => {
    const file = path.resolve(ROOT, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname))
    if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403).end(); return }
    fs.readFile(file, (error, bytes) => {
      if (error) { res.writeHead(404).end(); return }
      const mime = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
        '.wasm': 'application/wasm', '.png': 'image/png', '.css': 'text/css', '.mp3': 'audio/mpeg' }
      res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream')
      res.end(bytes)
    })
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const url = `http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`
  const report = { status: 'RUNNING', geometry, viewports: [], errors: [] }
  let browser
  try {
    browser = await chromium.launch({ headless: true, executablePath: process.env.UI_CHROMIUM_EXECUTABLE ||
      '/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell' })
    for (const viewport of VIEWPORTS) {
      const tag = `${viewport.width}x${viewport.height}`
      const entry = { viewport: tag, learn: null, combat: {} }
      report.viewports.push(entry)
      // 1. Learnability at the two stages, through the real learnSkill action.
      const learnCtx = await browser.newContext({ viewport, recordVideo: { dir: path.join(OUT, `video-learn-${tag}`), size: viewport } })
      const learnPage = await learnCtx.newPage()
      learnPage.on('pageerror', error => report.errors.push(`${tag} learn: ${error.message}`))
      await learnPage.goto(url)
      await learnPage.waitForFunction(() => !!window.__towerTest?.host?.menu && !window.__towerTest.host.host?.assetLoading?.blocked, null, { timeout: 180000 })
      entry.learn = await learnPage.evaluate(({ RAW, KEY }) => {
        const h = window.__towerTest.host
        // Swap the host's campaign store for one holding the level's envelope, then learn through the host action.
        const tryLearn = (level, id) => {
          const mem = new Map([[KEY, RAW[level]]])
          h.store = new h.store.constructor({ getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) }, Date.now())
          h.action({ type: 'learnSkill', id })
          return window.__towerTest.state().skills[id] || 0
        }
        return {
          wanjianAtLv3: tryLearn(3, 'sj_wanjian'),
          wanjianAtLv4: tryLearn(4, 'sj_wanjian'),
          qinglianAtLv6: tryLearn(6, 'sj_qinglian'),
          qinglianAtLv7: tryLearn(7, 'sj_qinglian'),
        }
      }, { RAW, KEY })
      assert.equal(entry.learn.wanjianAtLv3, 0, '周天剑阵 must not be learnable at 炼气初期 Lv3')
      assert.equal(entry.learn.wanjianAtLv4, 1, '周天剑阵 must be learnable at 炼气中期 Lv4')
      assert.equal(entry.learn.qinglianAtLv6, 0, '青莲剑阵 must not be learnable below 炼气巅峰 Lv7')
      assert.equal(entry.learn.qinglianAtLv7, 1, '青莲剑阵 must be learnable at 炼气巅峰 Lv7')
      await learnPage.screenshot({ path: path.join(OUT, `learn-${tag}.png`) })
      await learnCtx.close()
      // 2. Combat on the real loop: cast, judgment, cooldown, pause, death, withdraw.
      for (const id of ['sj_wanjian', 'sj_qinglian']) {
        const ctx = await browser.newContext({ viewport, recordVideo: { dir: path.join(OUT, `video-${id}-${tag}`), size: viewport } })
        const page = await ctx.newPage()
        page.on('pageerror', error => report.errors.push(`${tag} ${id}: ${error.message}`))
        await page.goto(url)
        await page.waitForFunction(() => !!window.__towerTest?.host?.menu && !window.__towerTest.host.host?.assetLoading?.blocked, null, { timeout: 180000 })
        const rank = 1
        const enemyDistances = id === 'sj_qinglian' ? QINGLIAN_ENEMIES : FIXTURE_ENEMIES
        await page.evaluate(({ id, rank, distances, raw, KEY }) => {
          const h = window.__towerTest.host
          const mem = new Map([[KEY, raw]])
          h.store = new h.store.constructor({ getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) }, Date.now())
          h.action({ type: 'learnSkill', id })
          h.enterTraining()
          h.run.pause()
          const run = h.run, s = run.state, p = s.player, template = s.pending[0]
          s.loadout.active = { [id]: rank }; s.loadout.passive = {}; s.loadout.evolutions = []
          s.loadout.evolutionLevels = {}; delete s.loadout.trainedSkills
          s.cooldowns = { [id]: 0 }; s.casts = []; s.zones = []; s.effects = []; s.projectiles = []
          p.x = 33; p.y = -60; p.faceX = 1; p.faceY = 0
          // Enemies spread around the player so each sits on a different bearing.
          s.enemies = distances.map((d, i) => {
            const a = i * 2 * Math.PI / distances.length
            const e = run._enemy({ ...template, id: `live-${i}`, x: p.x + d * Math.cos(a), y: p.y + d * Math.sin(a) })
            e.hp = e.maxHp = 1e8; e.moveSpeed = 0; e.ai.readyAt = e.ai.graceUntil = e.ai.entryUntil = 1e8
            return e
          })
          s.pending = []; s.reserved = []; s.wavePlanned = 1; s.waveKilled = 0
          window.__live = { samples: [], cooldownEvents: [], pulses: [], pulseLog: [], hitCounts: {}, lastCd: null, lastPulse: 0 }
          window.__live.startHp = s.enemies.map(e => e.hp)
          window.__live.enemyIds = s.enemies.map(e => e.id)
          window.__live.distances = distances
          if (id === 'sj_qinglian') {
            // Instance-level wrap: count each direct hit per target, and record the round order.
            const original = run._qinglianPulse.bind(run)
            run._qinglianPulse = (z, form, outgoing) => {
              const before = outgoing.length, pulseNo = z.pulseIndex + 1, t = run.state.time
              original(z, form, outgoing)
              const perTarget = {}
              for (const o of outgoing.slice(before)) perTarget[o.target] = (perTarget[o.target] || 0) + 1
              window.__live.pulseLog.push({ pulse: pulseNo, time: +t.toFixed(3), zoneSeconds: +(z.expiresAt - z.startedAt).toFixed(3), perTarget })
              for (const [k, v] of Object.entries(perTarget)) window.__live.hitCounts[k] = (window.__live.hitCounts[k] || 0) + v
            }
          }
        }, { id, rank, distances: enemyDistances, raw: RAW[id === 'sj_wanjian' ? 4 : 7], KEY })
        const shot = name => page.screenshot({ path: path.join(OUT, `${id}-${name}-${tag}.png`) })
        await page.evaluate(() => window.__towerTest.resume())
        // Sample the real loop for ~14 s of game time, long enough for a second cast after the 9 s cooldown.
        let peak = false, minHp = null, pauseProbe = null, paused = null, resumed = null
        for (let t = 0; t < 400; t++) {
          const sample = await page.evaluate(({ id }) => {
            const run = window.__towerTest.host.run, s = run.state, L = window.__live
            const cd = s.cooldowns[id] ?? null
            if (cd !== null && cd !== L.lastCd && cd > s.time) { L.cooldownEvents.push({ time: +s.time.toFixed(2), readyAt: +cd.toFixed(2) }); L.lastCd = cd }
            const z = s.zones.find(zone => zone.kind === 'qinglian' || zone.kind === id)
            if (z && z.pulseIndex !== undefined && z.pulseIndex !== L.lastPulse) { L.pulses.push({ time: +s.time.toFixed(2), pulse: z.pulseIndex }); L.lastPulse = z.pulseIndex }
            return { time: s.time, phase: s.phase, enemyHp: s.enemies.map(e => +e.hp.toFixed(2)), zones: s.zones.length, casts: s.casts.length }
          }, { id })
          minHp = minHp ? minHp.map((v, i) => Math.min(v, sample.enemyHp[i])) : sample.enemyHp
          if (sample.casts > 0 && !peak) { peak = true; await shot('cast') }
          // Pause inside an active burst: qinglian after its first round (the next rounds are 1 s apart),
          // wanjian mid-cooldown. Hold 1.2 s of real time, then resume.
          const pauseDue = id === 'sj_qinglian' ? (await page.evaluate(() => window.__live.pulseLog.length >= 1)) : sample.time >= 6
          if (pauseDue && !pauseProbe) {
            pauseProbe = await page.evaluate(() => {
              const s = window.__towerTest.host.run.state
              window.__towerTest.pause()
              const z = s.zones.find(zone => zone.kind === 'qinglian')
              return { time: s.time, phase: s.phase, pulse: z?.pulseIndex ?? null }
            })
            await shot('paused')
            await sleep(1200)
            paused = await page.evaluate(() => {
              const s = window.__towerTest.host.run.state
              const z = s.zones.find(zone => zone.kind === 'qinglian')
              return { time: s.time, phase: s.phase, pulse: z?.pulseIndex ?? null }
            })
            await page.evaluate(() => window.__towerTest.resume())
            await sleep(300)
            resumed = await page.evaluate(() => ({ time: window.__towerTest.host.run.state.time, phase: window.__towerTest.host.run.state.phase }))
            await shot('after-resume')
          }
          if (sample.time >= 14) break
          await sleep(50)
        }
        // Death: zero HP on the real loop; the host should end the run as lost.
        // Pause the host, apply lethal damage, and advance one simulation step so the engine records the loss.
        // The host would otherwise finish the run within a frame and the phase could not be read.
        const death = await page.evaluate(() => {
          const h = window.__towerTest.host
          window.__towerTest.pause()
          h.run.resume(); h.run.state.player.hp = 0; h.run.advance(1 / 60, () => {})
          return { phaseAfterAdvance: h.run.state.phase, zonesAfterLoss: h.run.state.zones.length }
        })
        await shot('death')
        await page.evaluate(() => window.__towerTest.resume())
        await sleep(600)
        death.afterFrame = await page.evaluate(() => ({ runAlive: !!window.__towerTest.run(), screen: window.__towerTest.host.screen }))
        death.phase = death.phaseAfterAdvance
        // Exit: withdraw to the sect, then confirm the run and its zones are gone.
        await page.evaluate(() => { if (window.__towerTest.host.run) window.__towerTest.withdraw() })
        await sleep(400)
        const exit = await page.evaluate(() => ({ runAlive: !!window.__towerTest.run(), screen: window.__towerTest.host.screen }))
        await shot('exit')
        const live = await page.evaluate(() => window.__live)
        const hpStart = live.startHp.map(v => +v.toFixed(2))
        const hpDealt = hpStart.map((v, i) => +(v - minHp[i]).toFixed(2))
        const cdIntervals = live.cooldownEvents.slice(1).map((e, i) => +(e.readyAt - live.cooldownEvents[i].readyAt).toFixed(2))
        // Whole sampling window (may include a second cast after the cooldown); the per-cast check uses pulseLog.
        const hitsPerTarget = live.enemyIds.map((eid, i) => ({ id: eid, distance: live.distances[i], hitsWholeWindow: live.hitCounts[eid] || 0 }))
        entry.combat[id] = { cooldownEvents: live.cooldownEvents, cooldownIntervals: cdIntervals, pulses: live.pulses,
          pulseLog: live.pulseLog, hitsPerTarget, hpDealtPerEnemy: hpDealt, hpDealtTotal: +hpDealt.reduce((a, b) => a + b, 0).toFixed(2),
          pauseProbe, paused, resumed, death, exit }
        assert.ok(live.cooldownEvents.length >= 1, `${id} must cast at least once`)
        assert.equal(paused.time, pauseProbe.time, `${id}: time must freeze while paused`)
        if (id === 'sj_qinglian') assert.equal(paused.pulse, pauseProbe.pulse, 'qinglian pulse must freeze while paused')
        if (id === 'sj_qinglian') {
          // Three rounds, one per second, outer → middle → inner.
          const log = live.pulseLog.slice(0, 3)
          assert.equal(log.length, 3, 'qinglian must fire three rounds per cast')
          assert.deepEqual(log.map(r => r.pulse), [1, 2, 3], 'rounds must be numbered 1, 2, 3')
          for (let i = 1; i < 3; i++) assert.ok(Math.abs(log[i].time - log[i - 1].time - 1) <= .15, `rounds must be one second apart (got ${log[i].time - log[i - 1].time})`)
          for (const r of log) assert.ok(Math.abs(r.zoneSeconds - 3) < 1e-6, 'qinglian zone must last 3 s')
          // Each round's hit count per in-reach target matches its ring; the out-of-reach target takes none.
          log.forEach((r, i) => {
            for (const eid of live.enemyIds.slice(0, QINGLIAN_IN_REACH.length)) assert.equal(r.perTarget[eid] || 0, QINGLIAN_ROUND_HITS[i], `round ${i + 1} must hit ${eid} ${QINGLIAN_ROUND_HITS[i]} times`)
            assert.equal(r.perTarget[live.enemyIds[live.enemyIds.length - 1]] || 0, 0, 'out-of-reach target takes no hits')
          })
          // Uncapped: all ten in-reach targets are hit in every round.
          // Only the first cast's three rounds count here; the sampling window also holds a second cast.
          for (const eid of live.enemyIds.slice(0, QINGLIAN_IN_REACH.length)) {
            const total = log.reduce((sum, r) => sum + (r.perTarget[eid] || 0), 0)
            assert.equal(total, QINGLIAN_EXPECTED_HITS, `${eid} must take 36 hits over the cast`)
          }
          for (const interval of cdIntervals) assert.ok(Math.abs(interval - 9) <= .25, `qinglian cooldown must be 9 s (got ${interval})`)
        }
        assert.equal(death.phase, 'lost', `${id}: zero HP must end the run as lost`)
        assert.equal(exit.runAlive, false, `${id}: exit must clear the run`)
        await ctx.close()
      }
    }
    assert.deepEqual(report.errors, [], 'no page errors')
    report.status = 'PASS'
  } catch (error) {
    report.status = 'FAIL'; report.error = error.stack; process.exitCode = 1
  } finally {
    if (browser) await browser.close()
    await new Promise(resolve => server.close(resolve))
    fs.writeFileSync(path.join(OUT, 'live-results.json'), JSON.stringify(report, null, 2) + '\n')
    console.log(`${report.status}; results: ${path.join(OUT, 'live-results.json')}`)
    if (report.error) console.error(report.error)
  }
}
main().catch(error => { console.error(error); process.exitCode = 1 })

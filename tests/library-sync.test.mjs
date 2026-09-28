import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const root = new URL('../', import.meta.url), read = p => readFileSync(new URL(p, root), 'utf8')

test('sync copies the library modules into the Cocos project', () => {
  const run = spawnSync(process.execPath, [new URL('scripts/cocos/sync-shared.mjs', root).pathname], { encoding: 'utf8' })
  assert.equal(run.status, 0, run.stderr)
  for (const name of ['LibraryRound', 'LibraryProgress', 'LibraryLevels', 'ShelfBoard', 'BookPile', 'RainState', 'LibraryRandom']) {
    assert.ok(existsSync(new URL(`cocos-pilot/assets/scripts/shared/js/library/${name}.ts`, root)), name)
  }
  const sources = JSON.parse(read('cocos-pilot/shared-manifest.json')).map(m => m.source)
  assert.ok(sources.includes('js/library/LibraryRound.js'))
  assert.ok(!sources.includes('js/library/LibraryAutoplay.js'), 'test-only helper stays out of the build')
})

test('the default entry is the library; forest review parameters still reach the old view', () => {
  const host = read('cocos-pilot/assets/scripts/PinePilot.ts')
  assert.match(host, /new LibraryView\(this\)/)
  assert.match(host, /\['forest','audit','review','microSmoke','campaignSmoke'\]/)
  assert.equal(JSON.parse(read('cocos-pilot/build-configs/wechatgame.json')).packages.wechatgame.orientation, 'portrait')
})

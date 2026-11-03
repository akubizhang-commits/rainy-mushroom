import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync, existsSync} from 'node:fs'

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
test('the scene starts only the current tower game, regardless of legacy query flags', () => {
  const host = read('cocos-pilot/assets/scripts/PinePilot.ts')
  assert.match(host, /this\.survivor=new TowerView\(this\)/)
  assert.doesNotMatch(host, /SurvivorView|SurvivorSmoke|SurvivorPerf|\.get\('tower'\)/)
  assert.match(host, /setDesignResolutionSize\(1280,720,/)
})
test('retired gameplay and its runtime art cannot return to source or shared bundles', () => {
  for (const path of ['js/survivor', 'cocos-pilot/assets/survivor',
    'cocos-pilot/assets/scripts/SurvivorView.ts',
    'cocos-pilot/assets/scripts/shared/js/survivor', 'scripts/survivor-preview.html']) {
    assert.equal(existsSync(new URL('../' + path, import.meta.url)), false, path)
  }
  const manifest = JSON.parse(read('cocos-pilot/shared-manifest.json'))
  assert.ok(manifest.length > 0)
  assert.ok(manifest.every(m => m.source.startsWith('js/xianxia/')))
})

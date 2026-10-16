import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,existsSync,readdirSync} from 'node:fs'

const root = new URL('../', import.meta.url), read = p => readFileSync(new URL(p, root), 'utf8')

test('the scene host starts the survivor game directly, with no old views', () => {
  const host = read('cocos-pilot/assets/scripts/PinePilot.ts')
  assert.match(host, /this\.survivor=new SurvivorView\(this\)/)
  assert.doesNotMatch(host, /MicroForestView|LibraryView|PackView|PilotUI/)
  const scene = JSON.parse(read('cocos-pilot/assets/scenes/PinePilot.scene'))
  assert.ok(!scene.some(o => ['cc.DirectionalLight', 'cc.Camera', 'cc.MeshRenderer'].includes(o.__type__)))
  assert.equal(JSON.parse(read('cocos-pilot/build-configs/wechatgame.json')).packages.wechatgame.orientation, 'portrait')
})

test('removed gameplay cannot reenter the build', () => {
  for (const p of ['js/microforest', 'js/library', 'library-game', 'scripts/microforest', 'cocos-pilot/assets/resources',
    'cocos-pilot/assets/scripts/shared/js/microforest', 'cocos-pilot/assets/scripts/shared/js/library', 'js/voxel', 'js/cocos', 'game.js']) {
    assert.ok(!existsSync(new URL(p, root)), p)
  }
  const scripts = readdirSync(new URL('cocos-pilot/assets/scripts/', root)).filter(n => n.endsWith('.ts'))
  assert.ok(scripts.every(n => n === 'PinePilot.ts' || n.startsWith('Survivor')), scripts.join(','))
  const shared = JSON.parse(read('cocos-pilot/shared-manifest.json'))
  assert.ok(shared.length > 0 && shared.every(m => m.source.startsWith('js/survivor/')))
  const engine = JSON.parse(read('cocos-pilot/settings/v2/packages/engine.json')).modules.configs.defaultConfig
  for (const name of ['3d', 'primitive', 'light-probe']) assert.equal(engine.cache[name]._value, false)
})

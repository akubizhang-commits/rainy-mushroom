import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { runInNewContext } from 'node:vm'
import { createIronWeapon, rollWeapon } from '../js/xianxia/TowerWeapons.js'
import { equipmentTier, isStarterEquipment } from '../js/xianxia/TowerEquipmentTiers.js'

// Execute the real fallback draw method without the unrelated scene constructor.
// Only the Cocos Graphics boundary is recorded.
const source = stripTypeScriptTypes(readFileSync(
  new URL('../cocos-pilot/assets/scripts/TowerView.ts', import.meta.url), 'utf8')
  .replace(/^import .*$/gm, ''), { mode: 'transform' }).replace(/^export /gm, '')
class Color { constructor(value) { this.value = value } }
const View = runInNewContext(`${source}\nTowerView`, { Color, equipmentTier, isStarterEquipment })
class Graphics {
  path = []; fills = []
  moveTo(x, y) { this.path = [[x, y]] }
  lineTo(x, y) { this.path.push([x, y]) }
  fill() { this.fills.push({ color: this.fillColor?.value, path: this.path.map(p => [...p]) }) }
  close() {} stroke() {} ellipse() {} roundRect() {} circle() {} arc() {}
}

test('fallback keeps the initial sword short without shortening other fan weapons', () => {
  const cases = [[createIronWeapon(), 31], [rollWeapon('fan', 1, () => 0, 'weapon-1'), 48]]
  for (const [weapon, reach] of cases) for (const faceX of [-1, 1]) {
    const graphics = new Graphics()
    View.prototype.drawPlayer.call({ playerMotion: { moving: false } }, graphics,
      { player: { faceX }, loadout: { weapon, passive: {} }, time: 0 }, 0, 0)
    const blade = graphics.fills.find(p => p.color === '#dce4e6')
    assert.ok(blade, 'weapon fallback keeps a neutral blade instead of tier tint')
    assert.deepEqual(blade.path[1], [faceX * reach, 20 + reach + 6])
  }
})

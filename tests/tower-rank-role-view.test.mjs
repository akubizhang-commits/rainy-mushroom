import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { runInNewContext } from 'node:vm'

const source = stripTypeScriptTypes(readFileSync(new URL('../cocos-pilot/assets/scripts/TowerMonsterArt.ts', import.meta.url), 'utf8')
  .replace(/^import .*$/gm, ''), { mode: 'transform' }).replace(/^export /gm, '')
const ARCHETYPES = [
  { id: 'spider_normal_r4', art_family: 'spider-lady' },
  { id: 'spider_elite_f8_w5_n1', art_family: 'spider-lady' },
  { id: 'spider_boss', art_family: 'spider-lady' },
  { id: 'tiger_normal_r7', art_family: 'white-tiger' },
  { id: 'encounter_without_species_or_role_in_id', art_family: 'snake-lady' },
]
const Art = runInNewContext(`(() => {${source}; return TowerMonsterArt;})()`, { ARCHETYPES })

test('form art is driven by authored metadata, including high-rank normals and opaque IDs', () => {
  for (const a of ARCHETYPES) assert.equal(Art.artFamily('unused-fallback', a.id), a.art_family)
  assert.equal(Art.artFamily('wolf', 'not-authored'), 'wolf')
  assert.equal(Art.artFamily('boar'), 'boar')
})

test('shared art never promotes an ordinary or elite enemy into a Boss', () => {
  for (const family of ['boar', 'wolf', 'bear', 'tiger', 'white-tiger', 'ape', 'snake', 'snake-lady',
    'crocodile', 'scorpion', 'centipede', 'rhino', 'yak', 'spider', 'spider-lady', 'spider-queen']) {
    assert.equal(Art.bodyScale(family, 'normal'), 1, family)
    assert.equal(Art.bodyScale(family, 'elite'), 1.12, family)
    assert.equal(Art.bodyScale(family, 'boss'), 2, family)
  }
  for (const family of ['bat', 'falcon']) {
    assert.equal(Art.bodyScale(family, 'normal'), 1.25)
    assert.equal(Art.bodyScale(family, 'elite'), 1.12 * 1.25)
    assert.equal(Art.bodyScale(family, 'boss'), 2.5)
  }
})

test('collision radius does not inflate elites and every Boss keeps the approved canvas', () => {
  for (const family of ['boar','wolf','bear','spider-lady','snake-lady','white-tiger','bat','falcon']) {
    const normal=Art.bodySize(family,'normal',24)
    assert.equal(Art.bodySize(family,'elite',34),normal*1.12)
    assert.equal(Art.bodySize(family,'boss',18),['bat','falcon'].includes(family)?275:220)
  }
  assert.equal(Art.bodySize('boar','normal',26),83.2)
  assert.equal(Art.bodySize('wolf','normal',22),70.4)
})

test('floor portrait and individual name both resolve from the final boss_id', () => {
  const menu = readFileSync(new URL('../cocos-pilot/assets/scripts/TowerMenu.ts', import.meta.url), 'utf8')
  assert.match(menu, /const bossId = floors\[f - 1\]\.boss_id/)
  assert.match(menu, /\.find\(a => a\.id === bossId\)/)
  assert.match(menu, /TowerMonsterArt\.artFamily\(boss\?\.species \|\| bossId\.split\('_'\)\[0\], bossId\)/)
  assert.match(menu, /this\.label\(row, boss\?\.name \|\| floors\[f - 1\]\.boss_name/)
})

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

test('shared form art preserves rank progression and role hierarchy independently of collision radius', () => {
  for (const family of ['boar','wolf','bear','tiger','white-tiger','ape','snake','snake-lady',
    'crocodile','scorpion','centipede','rhino','yak','spider','spider-lady','spider-queen','bat','falcon']) {
    const normal=Art.bodySize(family,'normal',24,1)
    for(const [rank,n,e] of [[1,1,1.7],[4,1.2,1.95],[7,1.4,2.2]]) {
      assert.ok(Math.abs(Art.bodySize(family,'normal',99,rank)/normal-n)<1e-8,family)
      assert.ok(Math.abs(Art.bodySize(family,'elite',34,rank)/normal-e)<1e-8,family)
      assert.ok(Art.bodySize(family,'elite',34,rank)>Art.bodySize(family,'normal',24,7),family)
    }
    const boss=Art.bodySize(family,'boss',18,3)
    assert.ok(boss>=Art.bodySize(family,'elite',34,9)*1.3-1e-8,family)
    assert.ok(boss>=(['bat','falcon'].includes(family)?275:220),family)
    assert.equal(boss,Art.bodySize(family,'boss',99,9),family)
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

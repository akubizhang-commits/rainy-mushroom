import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { runInNewContext } from 'node:vm'
import { GROWTH_STAGES, GROWTH_SKILLS } from '../js/xianxia/TowerGrowth.js'

test('the common learning route exposes spirit exactly once in its purchasable early-stage row', () => {
  const source = readFileSync(new URL('../cocos-pilot/assets/scripts/TowerSkillTreeCatalog.ts', import.meta.url), 'utf8')
  const code = stripTypeScriptTypes(source.replace(/^import .*$/gm, ''), { mode: 'transform' }).replace(/^export /gm, '')
  const { COMMON_SKILL_IDS, TREE_BRANCHES, DISPLAY_STAGES, COLUMN_INDEX } = runInNewContext(`(() => { ${code}; return { COMMON_SKILL_IDS, TREE_BRANCHES, DISPLAY_STAGES, COLUMN_INDEX }; })()`, { GROWTH_STAGES })
  const entries = [...COMMON_SKILL_IDS, ...TREE_BRANCHES.flatMap(branch => branch.ids)]
  assert.equal(entries.filter(id => id === 'sj_spirit').length, 1)
  assert.equal(COLUMN_INDEX.sj_spirit, 2)
  const visible = DISPLAY_STAGES.filter(stage => !stage.future).flatMap(stage => stage.skillIds)
    .filter(id => entries.includes(id)).map(id => GROWTH_SKILLS.find(skill => skill.id === id)).filter(Boolean)
  assert.equal(visible.find(skill => skill.id === 'sj_spirit')?.name, '凝神诀')
})

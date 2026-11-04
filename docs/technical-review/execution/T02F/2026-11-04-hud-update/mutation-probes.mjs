import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import { spawnSync } from 'node:child_process'
import assert from 'node:assert/strict'

// Negative controls only. The preload changes source strings returned to the
// existing TS test harness in memory; it never writes a production source file.
const output = new URL('./', import.meta.url)
const files = ['tests/xianxia-tower-host-tools.test.mjs', 'tests/xianxia-tower-inventory.test.mjs']
const probes = [
  {
    id: 'cap-empty', source: 'TowerPlayerHud.ts',
    from: 'drawResourceTrack(g,capped?1:ratio,4', to: 'drawResourceTrack(g,capped?0:ratio,4',
    expectedFailure: 'horizontal experience clamps invalid input, keeps an empty track and fills capped progress',
  },
  {
    id: 'unclamped-input', source: 'TowerPlayerHud.ts',
    from: "function drawResourceTrack(g:Graphics,ratio:number,height:number,color:string,width=200){\n const fill=Number.isFinite(ratio)?Math.max(0,Math.min(1,ratio)):0;",
    to: "function drawResourceTrack(g:Graphics,ratio:number,height:number,color:string,width=200){\n const fill=ratio;",
    expectedFailure: 'horizontal experience clamps invalid input, keeps an empty track and fills capped progress',
  },
  {
    id: 'leaked-portrait', source: 'TowerPlayerHud.ts',
    from: 'frame?.destroy();texture?.destroy();image?.decRef();frame=null;texture=null;image=null;',
    to: 'frame=null;texture=null;image=null;',
    expectedFailure: 'horizontal HUD loads current images independently and releases them on redraw and navigation',
  },
  {
    id: 'stale-portrait-callback', source: 'TowerPlayerHud.ts',
    from: 'if(disposed||!isValid(vitals,true)||error||!asset)return;',
    to: 'if(error||!asset)return;',
    expectedFailure: 'horizontal HUD image failure preserves its fallback and destroys partial loads without reviving stale nodes',
  },
  {
    id: 'bottom-margin', source: 'TowerView.ts',
    from: 'hud.xpBar.node.setPosition(0,-H/2+24);',
    to: 'hud.xpBar.node.setPosition(0,-H/2+4);',
    expectedFailure: 'horizontal battle experience stays inside the bottom edge without covering the portrait (1280x720)',
  },
]
const hash = file => createHash('sha256').update(readFileSync(file)).digest('hex')
const sourceFiles = [...new Set(probes.map(probe => `cocos-pilot/assets/scripts/${probe.source}`))]
const before = Object.fromEntries(sourceFiles.map(file => [file, hash(file)]))
const results = []
for (const probe of probes) {
  const preload = `import fs from 'node:fs';import {syncBuiltinESMExports} from 'node:module';
const original=fs.readFileSync;const probe=${JSON.stringify(probe)};
fs.readFileSync=function(path,...args){const value=original.call(this,path,...args);
const name=path instanceof URL?path.pathname:String(path);
if(!name.endsWith('/cocos-pilot/assets/scripts/'+probe.source)||typeof value!=='string')return value;
if(value.split(probe.from).length!==2)throw new Error('mutation must match exactly once: '+probe.id);
return value.replace(probe.from,probe.to);};syncBuiltinESMExports();`
  const command = ['--import', `data:text/javascript,${encodeURIComponent(preload)}`, '--test', ...files]
  const run = spawnSync(process.execPath, command, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
  if (run.error) throw run.error
  const log = run.stdout + run.stderr
  writeFileSync(new URL(`mutation-${probe.id}.tap.gz`, output), gzipSync(log, { level: 9, mtime: 0 }))
  const failures = [...log.matchAll(/^not ok \d+ - (.+)$/gm)].map(match => match[1])
  const counters = Object.fromEntries([...log.matchAll(/^# (tests|pass|fail|cancelled|skipped|todo) (\d+)$/gm)].map(match => [match[1], Number(match[2])]))
  assert.equal(run.status, 1, `${probe.id}: the negative control must fail`)
  assert.ok(failures.includes(probe.expectedFailure), `${probe.id}: intended acceptance must detect the fault`)
  assert.equal(counters.tests, 300)
  assert.equal(counters.skipped, 0)
  results.push({ ...probe, exitCode: run.status, counters, failures, detected: true })
  console.log(`${probe.id}: ${counters.fail} failures; intended acceptance detected fault`)
}
const after = Object.fromEntries(sourceFiles.map(file => [file, hash(file)]))
assert.deepEqual(after, before, 'negative controls must leave production files byte-identical')
writeFileSync(new URL('mutation-results.json', output), JSON.stringify({ strategy: 'readFileSync preload mutates only the source string inside each test subprocess', productionFilesBefore: before, productionFilesAfter: after, results }, null, 2) + '\n')

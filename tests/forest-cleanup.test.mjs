import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root),'utf8');
test('active scene has only the forest host, with no old light or perspective camera',()=>{
 const scene=JSON.parse(read('cocos-pilot/assets/scenes/PinePilot.scene'));
 assert.ok(!scene.some(o=>['cc.DirectionalLight','cc.Camera','cc.MeshRenderer'].includes(o.__type__)));
 const host=read('cocos-pilot/assets/scripts/PinePilot.ts');
 assert.match(host,/new MicroForestView\(this\)/);assert.doesNotMatch(host,/GameSession|HabitatMaterials|ForestMeshes|VoxelGame/);
 assert.doesNotMatch(host,/get\('microforest'\)/);
});
test('retired runtime and resource bundles cannot reenter builds',()=>{
 for(const p of ['js/voxel','js/cocos','game.js','cocos-pilot/assets/resources/materials','cocos-pilot/assets/resources/previews','cocos-pilot/assets/catalogue-0'])assert.ok(!existsSync(new URL(p,root)),p);
 const shared=JSON.parse(read('cocos-pilot/shared-manifest.json'));assert.ok(shared.length>0);assert.ok(shared.every(m=>m.source.startsWith('js/microforest/')||m.source.startsWith('js/library/')||m.source.startsWith('js/survivor/')));
 assert.deepEqual(readdirSync(new URL('cocos-pilot/assets/resources/',root)).filter(n=>!n.endsWith('.meta')&&n!=='.DS_Store'),['forest-audio','microforest']);
 const config=JSON.parse(read('cocos-pilot/settings/v2/packages/engine.json')).modules.configs.defaultConfig;
 for(const name of ['3d','primitive','light-probe'])assert.equal(config.cache[name]._value,false);
});

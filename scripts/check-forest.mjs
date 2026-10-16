import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {resolve,dirname,extname} from 'node:path';
import {spawnSync} from 'node:child_process';
const root=resolve(import.meta.dirname,'..');
const walk=p=>readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(resolve(p,e.name)):[resolve(p,e.name)]);
for(const file of [...walk(resolve(root,'js')),...walk(resolve(root,'scripts'))]){
 if(!['.js','.mjs'].includes(extname(file)))continue;
 const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(result.status)throw Error(result.stderr);
 for(const match of readFileSync(file,'utf8').matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g))if(!existsSync(resolve(dirname(file),match[1])))throw Error(`Missing import in ${file}: ${match[1]}`);
}
for(const file of walk(resolve(root,'cocos-pilot/assets/scripts')).filter(f=>f.endsWith('.ts'))){
 const source=readFileSync(file,'utf8');
 if(/from ['"][^'"]*(?:ForestMeshes|GameSession|HabitatMaterials|PhotoLibrary|voxel\/)/.test(source))throw Error('Legacy runtime dependency: '+file);
 for(const m of source.matchAll(/from\s*['"](\.[^'"]+)['"]/g))if(!existsSync(resolve(dirname(file),m[1]+'.ts')))throw Error('Missing Cocos import: '+file+' -> '+m[1]);
}
console.log('Source syntax and dependency checks passed');

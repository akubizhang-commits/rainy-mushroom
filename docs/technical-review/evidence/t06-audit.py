from pathlib import Path
from collections import defaultdict
import json,re,hashlib
root=Path('/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom')
a=root/'cocos-pilot/assets';r=a/'resources';c=json.loads(Path('/private/tmp/t06-runtime-catalog.json').read_text())
source=list((a/'scripts').rglob('*.ts'));texts={p:p.read_text() for p in source}
joined='\n'.join(texts.values())
files=[p for p in sorted(r.rglob('*')) if p.is_file() and p.suffix!='.meta']
possible=set();why={}
def add(stem,reason):
 possible.add(stem);why.setdefault(stem,[]).append(reason)
# Fixed literal resource paths anywhere in current shipped TS, retaining even dormant classes/profiles.
for p,text in texts.items():
 for m in re.finditer(r"['\"]((?:loading|player-hud|sect-scene|tower-[a-z-]+)/[^'\"\n]+)['\"]",text):
  value=m.group(1)
  if not any(x in value for x in ['${','+',' ']):add(value,f'{p.relative_to(root)}:{text[:m.start()].count(chr(10))+1}')
for e in c['library']:
 if e['icon']:add(e['icon'],'TowerLibrary: generated icon');add('tower-library-items/'+e['id'],'TowerLibraryPanel:541-545')
for x in c['skills']:add('tower-skill-icons/'+x,'TowerSkillIcons:14,73')
for x in c['tiers']:add('tower-ui/jade-plaque-clear-'+x,'TowerMenu:2551-2560')
for x in re.findall(r"'([^']+)'",re.search(r'const files=\[([^]]+)\]',texts[a/'scripts/TowerStoneArt.ts']).group(1)):add('tower-stones/'+x,'TowerStoneArt:4,28')
for x in re.findall(r"'([^']+)'",re.search(r'const families = new Set\(\[([^]]+)\]',texts[a/'scripts/TowerMonsterArt.ts']).group(1)):add('tower-monsters/'+x,'TowerMonsterArt:8,72,159')
for x in ['boar-v3','boar-v3-enraged','wolf-v1','spider-v1','feather','sonic','poison']:add('tower-monsters-motion/'+x,'TowerMonsterArt:295-311 or TowerProjectileArt:65-66')
for x in ['tower_floor_stone','tower_obstacle_pillar','tower_spawn_mist']:add('tower-environment/'+x,'TowerEnvironmentArt:40,42,60')
for x in ['eq_sword_suwen','eq_sword_zhenyue']:add('tower-held-weapons-v2/'+x,'TowerCharacterArt:16-18,223')
for x in ['seated','dao','beam','jindan-core','jindan-dao','minor','gather','success','failure']:add('tower-breakthrough/'+x,'TowerBreakthroughArt:18,23 / TowerBreakthroughAudio:6')
for x in ['tiandi-solid-sword-v2','convergence-gold-sword-v2','convergence-ice-aura-sharp-v2','cross-ice-arc-v1','cross-crimson-arc-v1','qingping-swoosh','qingping-impact']:add('tower-skill-fx/'+x,'ConvergenceArt:15-16 / CrossBurstArt:15-16 / QingpingAudio:8')
candidates=[];inventory=[]
other_asset_text={p:p.read_text(errors='ignore') for p in a.rglob('*') if p.is_file() and p.suffix in ['.ts','.js','.json','.meta','.scene','.prefab','.mtl','.effect','.txt','.md']}
for p in files:
 stem=p.relative_to(r).with_suffix('').as_posix();meta=Path(str(p)+'.meta');uuid=json.loads(meta.read_text()).get('uuid') if meta.exists() else None
 foreign=[str(q.relative_to(root)) for q,t in other_asset_text.items() if uuid and q!=meta and uuid in t]
 row={'path':str(p.relative_to(root)),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'uuid':uuid,'possibleLoader':stem in possible,'evidence':why.get(stem,[]),'foreignUUIDReferences':foreign}
 inventory.append(row)
 if stem not in possible:candidates.append(row)
Path('/private/tmp/t06-resource-audit.json').write_text(json.dumps({'inventory':inventory,'candidates':candidates,'possiblePaths':sorted(possible)},ensure_ascii=False,indent=2))
print('RESOURCE TOTAL',len(files),sum(p.stat().st_size for p in files))
print('NO POSSIBLE CURRENT LOADER',len(candidates),sum(x['bytes'] for x in candidates))
for row in candidates:print(row['path'].replace('cocos-pilot/assets/resources/',''),row['bytes'],'foreign UUID:',row['foreignUUIDReferences'])
for directory in sorted(set(p.relative_to(r).parts[0] for p in files)):
 rows=[x for x in inventory if x['path'].split('/')[3]==directory];print('GROUP',directory,len(rows),sum(x['possibleLoader'] for x in rows),sum(x['bytes'] for x in rows))
print('LIBRARY icons',sum(bool(e['icon']) for e in c['library']))
print('LIBRARY existing but impossible',[x['path'] for x in candidates if '/tower-library-items/' in x['path']])

"""Read-only checks for design structure. Does not run or validate the game."""
from pathlib import Path
import json,re,itertools
ROOT=Path(__file__).resolve().parents[3]
files=['docs/prd/game-design-prd.md','docs/prd/level-design-prd.md','docs/design/visual-interaction-asset-design.md','docs/design/exploration-rewards-direction.md','docs/design/design-document-index.md','docs/prd/joint-design-review-v1.4-2026-09-21.md','docs/production/first-ten/readiness.md','docs/production/first-ten/tutorials.md','docs/production/first-ten/tuning.md']
counts={'documents':len(files),'localLinks':0,'tables':0,'levels':0,'routes':0,'checkpoints':0,'portalPairs':0,'restPoints':0,'grantIds':0,'budgetCases':0}
for name in files:
 p=ROOT/name;s=p.read_text();fence=False;width=None
 chapters=re.findall(r'^## (\d+(?:\.\d+)*)[. ]',s,re.M)
 assert len(chapters)==len(set(chapters)),(name,'duplicate numbered chapters')
 for line in s.splitlines():
  if line.startswith('```'):fence=not fence;width=None;continue
  if fence:continue
  if line.startswith('|'):
   cols=len(re.split(r'(?<!\\)\|',line))
   if width is None:width=cols;counts['tables']+=1
   assert cols==width,(name,'table columns',line)
  else:width=None
  for dest in re.findall(r'\]\(([^)]+)\)',line):
   if re.match(r'\w+://',dest) or dest.startswith('#'):continue
   dest=dest.split('#')[0].strip('<>')
   assert (p.parent/dest).exists(),(name,'missing local link',dest)
   counts['localLinks']+=1
j=json.loads((ROOT/'docs/production/first-ten/redesign-topology.json').read_text())
assert j['status']=='design-only-not-runtime'
assert [l['id'] for l in j['levels']]==[f'forest-{n:02}' for n in range(1,11)]
grant_ids=set();all_portal_ids=set();coins=0
for l in j['levels']:
 counts['levels']+=1;regions=set(l['regions']);edges={tuple(x) for x in l['edges']};groups=l['groups'];supports={s['id']:s for s in l['supports']}
 assert not l['toolsRequired']
 assert set(groups['gA']).isdisjoint(groups['gB']) and set(groups['gA']+groups['gB'])==regions
 assert set(l['regionZones'])==regions
 for key in ['mainRoute','observationRoute','skillRoute']:
  route=l[key];assert route[0]=='A' and route[-1]=='F'
  assert all(tuple(e) in edges for e in zip(route,route[1:]));counts['routes']+=1
 cps={c['id']:c for c in l['checkpoints']}
 assert [c['rank'] for c in cps.values()]==[0,10,20,30]
 for c in cps.values():
  assert c['region'] in groups[c['recoveryGroup']]
  support=supports[c['supportId']];assert support['fixed'] and support['region']==c['region']
  assert support['zone'] in l['regionZones'][c['region']];counts['checkpoints']+=1
 assert len(l['rests'])==(2 if l['restAtC'] else 1)
 for rest in l['rests']:
  assert cps[rest['checkpointId']]['region']==rest['region'];assert all(g in groups for g in rest['deathGroups']);counts['restPoints']+=1
 for pair in l['portalPairs']:
  assert pair['bidirectional'] and len(pair['ends'])==2
  assert pair['ends'][0]['zone']!=pair['ends'][1]['zone']
  for end in pair['ends']:
   assert end['id'] not in all_portal_ids;all_portal_ids.add(end['id'])
   support=supports[end['arrivalSupportId']]
   assert support['fixed'] and support['zone']==end['zone'] and support['region']==end['region']
   assert end['zone'] in l['regionZones'][end['region']]
  counts['portalPairs']+=1
 r=l['rewards'];assert r['main']['coins']==20 and r['main']['region']=='F';assert r['explore']['coins']==10 and r['explore']['alternatives']==['X','Y']
 ids=[r['main']['grantId'],r['explore']['grantId'],*r['unique']]
 if 'special' in r:ids.append(r['special']['grantId'])
 assert not(grant_ids&set(ids));assert len(ids)==len(set(ids));grant_ids.update(ids)
 coins+=r['main']['coins']+r['explore']['coins']
counts['grantIds']=len(grant_ids)
assert coins==300
prices=[t['price'] for t in j['economy']['tools']]+j['economy']['cosmeticPrices'];assert sum(prices)==300
assert sum(prices[:3])==180 and 200-sum(prices[:3])==20
assert [(t['id'],t['opensBeforeLevel']) for t in j['economy']['tools']]==[('tracer',3),('lure',5),('grip',8)]
for explored in range(11):
 income=200+10*explored
 for owned in itertools.product([0,1],repeat=6):
  spent=sum(p*x for p,x in zip(prices,owned));affordable=spent<=income
  if affordable:assert income-spent>=0
  counts['budgetCases']+=1
# The families must appear as actual table rows, not just prose mentions.
a=(ROOT/files[0]).read_text();b=(ROOT/files[2]).read_text()
asset_ids=lambda s:set(re.findall(r'^\| (RWD-[A-Z-]+) \|',s,re.M))
assert len(asset_ids(a))==10 and asset_ids(a)==asset_ids(b)
for n in range(1,11):assert f'### L{n:02} ' in (ROOT/files[1]).read_text()
for path in ['docs/prd/archive/game-design-prd-v1.3.md','docs/prd/archive/level-design-prd-v1.3.md','docs/design/archive/visual-interaction-asset-design-v1.1.md','docs/design/archive/exploration-rewards-direction-v0.2.md']:assert (ROOT/path).exists()
# Every markdown under docs/design trees is indexed except the index itself.
index=(ROOT/'docs/design/design-document-index.md').read_text()
for prefix in ['docs','design']:
 for p in (ROOT/prefix).rglob('*.md'):
  if p.name=='design-document-index.md':continue
  assert str(p.relative_to(ROOT)) in index,('unindexed',p)
print(json.dumps({'status':'PASS: design structure only','counts':counts,'rewardAssetFamilies':len(asset_ids(a)),'totalCoins':coins,'totalShopCost':sum(prices),'limits':['not geometry reachability','not gameplay tests','not player or device validation']},ensure_ascii=False,indent=2))

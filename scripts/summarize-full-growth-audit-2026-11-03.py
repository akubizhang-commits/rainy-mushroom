from pathlib import Path
import json,statistics
root=Path('reports/full-growth-audit-2026-11-03')
routes=['qi','array','mixed','lance','formation','pursuit']
rows=[];floors=[]
for route in routes:
 for seed in [101,211]:
  d=json.loads((root/f'{route}-{seed}.json').read_text())
  assert d['completed'] and d['sourceStable'],(route,seed,'incomplete or changed sources')
  first=[a for a in d['attempts'] if not a['postClear']]
  mature=[a for a in d['attempts'] if a['postClear'] and a['level']==30 and a['outcome']=='won']
  rows.append(dict(route=route,seed=seed,cleared=d['clearedFloor'],mature=d['matureRunDone'],attempts=len(d['attempts']),deaths=sum(a['outcome']=='lost' for a in d['attempts']),firstClearMinutes=sum(a['seconds'] for a in first)/60,matureSeconds=mature[-1]['seconds'] if mature else None,minHp=min(a['observation']['minHpFraction'] for a in first),maxEquippedQuality=max(a['loadout'][k]['quality'] for a in d['attempts'] for k in ['weapon','armor','ring']),final=d['final']))
  for a in first:
   boss=[e for e in a['encounters'] if e['role']=='boss']
   floors.append(dict(route=route,seed=seed,floor=a['floor'],entryLevel=a['level'],exitLevel=a['exitLevel'],seconds=a['seconds'],minHp=a['observation']['minHpFraction'],bossSeconds=boss[0].get('damageToDeathSeconds') if boss else None))
controls=json.loads((root/'controls.json').read_text());stationary=json.loads((root/'stationary.json').read_text())
assert controls['completed'] and len(controls['rows'])==48
assert stationary['completed'] and len(stationary['rows'])==12
cost=json.loads((root/'cost-model.json').read_text());times=[]
for row in cost['rows']:
 duration=statistics.median(f['seconds'] for f in floors if f['floor']==row['floor'])
 times.append({**{k:row[k] for k in ['tier','category','medianClears','p90Clears']},'referenceClearSeconds':duration,'medianMinutes':duration*row['medianClears']/60,'p90Minutes':duration*row['p90Clears']/60})
summary={'natural':rows,'floors':floors,'controls':controls['rows'],'stationary':stationary['rows'],'costReference':times,'costCaveat':'Zero-inventory material/contribution model × median observed first-clear duration. Not a natural acquisition run; current-tier repeated farming, accumulated inventory, purchases and play skill change time.'}
(root/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2))
print(json.dumps(rows,ensure_ascii=False,indent=2))

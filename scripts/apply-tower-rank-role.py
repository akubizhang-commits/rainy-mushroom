"""Apply the approved rank/role roster to this task's frozen input, preserving species slots."""
from pathlib import Path
import json,copy,csv,argparse
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output',required=True,help='Output directory; use a temporary directory for replay validation')
args=parser.parse_args()
ROOT=Path(__file__).resolve().parents[1];D=Path(args.output).resolve();D.mkdir(parents=True,exist_ok=True);B=ROOT/'reports/rank-role-rebalance-2026-11-01/before'
read=lambda name:json.loads((B/name).read_text())
d,r,c,f1=map(read,['tower-design.json','rank-attributes.json','beast-catalog.json','floor01-encounters.json'])
A={a['id']:a for a in r['archetypes']};C={a['id']:a for a in c['beasts']}
normal_quotas=[{1:372},{1:300,2:110},{1:224,2:224},{2:486},{2:262,3:262},{3:450,4:112},{3:360,4:240},{3:256,4:350,5:32},{4:474,5:202}]
elite_ranks=[[2]*5,[2]*3+[3]*2,[3]*5,[3]*3+[4]*2,[4]*5,[4]*3+[5]*2,[4]*3+[5]*2,[4]*3+[5]*2+[6],[4]*3+[5]*2+[6]]
names={'boar':['铁鬃妖猪','赤鬃猪妖','獠牙妖卫'],'wolf':['青风妖狼','苍鬃狼妖','啸月妖卫'],'spider':['墨纹妖蛛','赤绡蛛姬','赤绡蛛妖'],'bat':['灰翼妖蝠','摄魂蝠妖','夜翼妖卫'],'crocodile':['青鳞妖鳄','玄甲鳄妖','玄潭妖卫'],'snake':['赤鳞妖蛇','赤鳞蛇姬','赤鳞妖卫'],'bear':['岩背妖熊','铁掌熊妖','玄岩妖卫'],'tiger':['斑纹妖虎','金睛虎妖','白虎妖卫'],'falcon':['灰羽妖隼','青翎隼妖','青霄妖卫'],'rhino':['震岩妖犀','震岳犀妖','震岳妖卫'],'yak':['苍鬃妖牛','苍鬃牛魔','苍鬃妖卫'],'ape':['赤臂妖猿','赤臂猿妖','赤臂妖卫'],'scorpion':['乌甲妖蝎','乌甲蝎妖','乌甲妖卫'],'centipede':['铁背蜈蚣','铁背蜈妖','铁背妖卫']}
# Stable authored identities; each physical elite has its own ID, including paired encounters.
elite_names=[['赤牙','霜背','青獠','赤腹','墨针'],['追月','夜哨','回音','断岩','铁獠'],['丝吻','幽鸣','残翼','夜啸','回声'],['铁脊','伏流','沉鳞','噬声','断翼'],['碧冠','玄潭','裂颚','绛丝','织厄'],['铁掌','崩岩','裂地','摄魂','夜魇'],['金睛','逐风','穿云','裂空','青翎'],['苍牙','绯冠','赤瞳','沉岳','断碑','赤绡蛛姬'],['玄瞳','惊霄','凌风','裂喉','霜牙','镇山虎将']]
# Explicit species/rank baseline shared across floors; role multipliers are separate.
normal_hp=[0,150,500,1500,4000,8000,16000,32000,64000,128000]
normal_damage=[0,4.664,10,25,45,65,85,105,140,180]
def metadata(a):
 family=a['id'].split('_')[0];stage=(a['rank']-1)//3+1;a.update(species=family,form_stage=stage,prototype_name=names[family][stage-1])
 a['art_family']='centipede-humanoid' if family=='centipede' and stage==2 else 'scorpion-humanoid' if family=='scorpion' and stage==2 else 'boar-humanoid' if family=='boar' and stage==2 else 'bat-humanoid' if family=='bat' and stage==2 else 'ape-humanoid' if family=='ape' and stage==2 else 'falcon-humanoid' if family=='falcon' and stage==2 else 'wolf-humanoid' if family=='wolf' and stage==2 else 'crocodile-humanoid' if family=='crocodile' and stage==2 else 'bear-humanoid' if family=='bear' and stage==2 else 'spider-lady' if family=='spider' and stage==2 else 'spider-queen' if family=='spider' and stage==3 else 'snake-lady' if family=='snake' and stage==2 else 'white-tiger' if family=='tiger' and stage==3 else 'tiger-humanoid' if family=='tiger' and stage==2 else family
 a['art_status']='accepted-stage' if stage==1 and family not in ['rhino','yak'] or a['art_family']!=family or family in ['rhino','yak'] and stage==2 else 'legacy-stage-placeholder'
 if a['role']=='normal':a['name']=a['prototype_name']
 return a
for a in A.values():metadata(a)
def normal(family,rank):
 key=f'{family}_normal_r{rank}'
 if key not in A:
  base=A.get(f'{family}_normal') or next(a for a in A.values() if a['species']==family)
  a=copy.deepcopy(base);a.update(id=key,rank=rank,role='normal',roster_revision='rank-role-v1',tower_variant_of=base['id']);a.pop('core_drop_credit',None);metadata(a)
  a['hp']=normal_hp[rank]*a['floor_hp_factor'];a['damage']=normal_damage[rank];A[key]=a
 return key
# Build common normal template for all existing ranks (including reserve identities).
for a in list(A.values()):
 if a['role']!='boss':normal(a['species'],a['rank'])
# New leaders clone normal movement/species factors; role controls unique skill and 2.5/1.15 budget.
for f in d['floors']:
 index=f['floor']-1;quota=list(normal_quotas[index].items());cursor=0;remaining=quota[0][1];elite_index=0
 for w in f['waves']:
  original=w['enemy_groups'];groups=[]
  for g in original:
   a=A[g['archetype']];family=a['species']
   if a['role']=='boss':groups.append(g);continue
   if a['role']=='normal':
    left=g['count']
    while left:
     rank=quota[cursor][0];take=min(left,remaining);groups.append({'archetype':normal(family,rank),'rank':rank,'count':take});left-=take;remaining-=take
     if remaining==0 and cursor+1<len(quota):cursor+=1;remaining=quota[cursor][1]
   else:
    # F8 previous wave15 spider moves to 18; its slot becomes the second named bear.
    if index==7 and w['wave']==15:family='bear'
    for j in range(g['count']):
     rank=elite_ranks[index][elite_index];key=f'{family}_elite_f{index+1}_w{w["wave"]}_n{elite_index+1}'
     v=copy.deepcopy(A[normal(family,rank)]);v.update(id=key,role='elite',name=elite_names[index][elite_index],hp=v['hp']*2.5,damage=v['damage']*1.15)
     A[key]=v;groups.append({'archetype':key,'rank':rank,'count':1});elite_index+=1
  if index>=7 and w['wave']==18:
   family='spider' if index==7 else 'tiger';key='spider_elite_chixiao' if index==7 else 'tiger_elite_f9_w18_n6'
   v=copy.deepcopy(A[normal(family,6)]);v.update(id=key,role='elite',name=elite_names[index][5],hp=v['hp']*2.5,damage=v['damage']*1.15);A[key]=v
   groups.append({'archetype':key,'rank':6,'count':1});elite_index+=1;w['kind']='elite'
  w['enemy_groups']=groups
  for role in ['normal','elite']:
   summary={}
   for g in groups:
    if A[g['archetype']]['role']==role:summary[A[g['archetype']]['species']]=summary.get(A[g['archetype']]['species'],0)+g['count']
   w[role]=summary
  w['normal_count']=sum(w['normal'].values());w['planned_required']=sum(g['count'] for g in groups)
 assert elite_index==len(elite_ranks[index]);assert cursor==len(quota)-1 and remaining==0
 f['roster_revision']='rank-role-v1';f['stat_scale_rule']='普通/精英共享物种与品阶基础，精英生命2.5倍、普攻1.15倍；Boss独立遭遇预算。'
 f['floor_stat_scale']['rank_role_version']=1
 f['floor_stat_scale']['boss_hp']=round(f['floor_stat_scale']['boss_hp']*[1,1,1.1,1.3,1.65,1.5,1.2,1.9,2.5][index])
 f['floor_stat_scale']['boss_budget_revision']='rank-role-middle-gear-v1'
 # Old elite timing discounts are superseded, not multiplied onto the new small-leader baseline.
 f['floor_stat_scale'].pop('early_elite_through_wave',None);f['floor_stat_scale'].pop('early_elite_hp_multiplier',None)
# Tutorial authored unit IDs remain unchanged; map each elite identity to its unique slot.
first=d['floors'][0]
for w in f1['waves']:
 groups=first['waves'][w['wave']-1]['enemy_groups'];leaders=[g['archetype'] for g in groups if A[g['archetype']]['role']=='elite'];it=iter(leaders);batches=[]
 for batch in w['batches']:
  a=A[batch['archetype']]
  if a['role']=='normal':batch['archetype']=normal(a['species'],1);batches.append(batch)
  elif a['role']=='elite':
   for j,uid in enumerate(batch['unit_ids']):
    b=copy.deepcopy(batch);b.update(id=batch['id']+f'e{j+1}',archetype=next(it),count=1,unit_ids=[uid],at_s=batch['at_s']+j*batch['emit_step_s']);batches.append(b)
  else:batches.append(batch)
 w['batches']=batches
f1['floor_stat_scale']=first['floor_stat_scale']
for a in A.values():
 if a['id'] in f1['enemies']:f1['enemies'][a['id']].update(a)
for w in f1['waves']:
 for b in w['batches']:
  if b['archetype'] not in f1['enemies']:
   a=A[b['archetype']];base=f1['enemies'].get(a['species']+'_normal',{});f1['enemies'][a['id']]={**copy.deepcopy(a),'body_radius':base.get('body_radius',24)*(1.12 if a['role']=='elite' else 1)}
r['archetypes']=list(A.values());r['rank_role_baseline']={'normal_hp':normal_hp,'normal_damage':normal_damage,'elite_hp_multiplier':2.5,'elite_damage_multiplier':1.15,'version':1}
for a in A.values():
 v=copy.deepcopy(C.get(a['id']) or C.get(a['species']+'_normal') or {});v.update({k:a[k] for k in ['id','name','role','rank','species','form_stage','prototype_name','art_family','art_status']});v['family']=a['species'];C[a['id']]=v
c['beasts']=list(C.values())
for name,obj in [('tower-design.json',d),('rank-attributes.json',r),('beast-catalog.json',c),('floor01-encounters.json',f1)]: (D/name).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
rows=list(csv.reader((B/'waves.csv').open()))
for row in rows[1:]:
 w=d['floors'][int(row[0])-1]['waves'][int(row[2])-1];row[3]=w['kind'];row[4]=str(w['normal_count']);row[5]=str(sum(w['elite'].values()));row[7]=str(w['planned_required']);row[8]='+'.join(f'{k}:{v}' for k,v in w['normal'].items());row[9]='+'.join(k for k,v in w['elite'].items() for _ in range(v));row[10]='+'.join(f"{g['archetype']}@{g['rank']}:{g['count']}" for g in w['enemy_groups'])
with (D/'waves.csv').open('w',newline='') as out:csv.writer(out,lineterminator='\n').writerows(rows)
print('Applied rank-role-v1',len(A),'archetypes')

"""Fetch openly licensed research-grade photo candidates; review before shipping."""
import json, urllib.request, urllib.parse, time, sys
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
ROOT=Path('/tmp/rainy-photo-candidates');ROOT.mkdir(exist_ok=True)
def get(url):
 for attempt in range(3):
  try:
   req=urllib.request.Request(url,headers={'User-Agent':'RainyMushroom-photo-review/1.0'})
   with urllib.request.urlopen(req,timeout=45) as r:return r.read()
  except Exception:
   if attempt==2:raise
   time.sleep(2)
def fetch(s):
 target=ROOT/s['id'];target.mkdir(exist_ok=True)
 cache=target/'observations.json'
 if not cache.exists():
  query=urllib.parse.urlencode({'taxon_name':s['scientificName'],'quality_grade':'research','photo_license':'cc-by,cc0','per_page':8,'order_by':'votes'})
  cache.write_bytes(get('https://api.inaturalist.org/v1/observations?'+query))
 rows=json.loads(cache.read_text())['results'];candidates=[]
 limit=12 if s['id']=='schizophyllum-commune' else 5
 for obs in rows:
  accepted={'daedalea-quercina':'Fomitopsis quercina'}.get(s['id'],s['scientificName'])
  if obs['taxon']['name'].lower()!=accepted.lower():continue
  for photo in obs['photos'][:3]:
   if photo.get('license_code') not in ('cc-by','cc0'):continue
   url=photo['url'].replace('/square.','/large.')
   path=target/(str(len(candidates))+'.jpg')
   if not path.exists():path.write_bytes(get(url))
   candidates.append({'photoId':photo['id'],'url':url,'license':photo['license_code'],'attribution':photo['attribution'],'author':obs['user']['login'],'observationUrl':f"https://www.inaturalist.org/observations/{obs['id']}",'taxon':obs['taxon']['name'],'qualityGrade':obs['quality_grade'],'candidatePath':str(path)})
   if len(candidates)>=limit:break
  if len(candidates)>=limit:break
 (target/'candidates.json').write_text(json.dumps(candidates,ensure_ascii=False,indent=2))
 print(s['id'],len(candidates),flush=True)
 return {'speciesId':s['id'],'candidates':candidates}
if __name__=='__main__':
 species=json.loads(Path(sys.argv[1] if len(sys.argv)>1 else '/tmp/rainy-catalogue.json').read_text())
 with ThreadPoolExecutor(max_workers=3) as pool:results=list(pool.map(fetch,species))
 (ROOT/'all.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))

"""Package the manually reviewed replacement set. Never download during release builds.
Requires the review cache produced during the rights audit; committed packaged assets
and evidence are sufficient for subsequent builds. See docs/release/photo-rights.md.
"""
import json,hashlib,re,shutil,xml.etree.ElementTree as ET
from pathlib import Path
from PIL import Image,ImageOps
root=Path(__file__).resolve().parents[1]
out=root/'assets/exploration/commercial-photos';out.mkdir(exist_ok=True)
evidence=root/'docs/release/photo-evidence';evidence.mkdir(parents=True,exist_ok=True)
records=[];selection=json.loads((root/'scripts/commercial-photo-selection.json').read_text())
def package(source,species,index,record,crop=None):
 with Image.open(source) as raw:
  im=ImageOps.exif_transpose(raw).convert('RGB')
  if crop:im=im.crop(crop)
  im.thumbnail((720,720));path=out/f'{species}-{index}.jpg';im.save(path,quality=76,optimize=True)
 rec=record|{'speciesId':species,'photoIndex':index,'localPath':str(path.relative_to(root)),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'sourceSha256':hashlib.sha256(Path(source).read_bytes()).hexdigest(),'retrievedAt':'2026-09-14','crop':crop}
 records.append(rec)
for species,indices in selection.items():
 folder=Path('/tmp/rainy-photo-candidates')/species;cs=json.loads((folder/'candidates.json').read_text());obs=json.loads((folder/'observations.json').read_text())['results']
 for index,choice in enumerate(indices):
  p=cs[choice];assert p['license'] in ['cc-by','cc0']
  observation=next(o for o in obs if o['id']==int(p['observationUrl'].split('/')[-1]));photo=next(v for v in observation['photos'] if v['id']==p['photoId']);assert photo['license_code']==p['license'] and not photo.get('hidden') and not photo.get('flags')
  record={k:v for k,v in p.items() if k!='candidatePath'}
  record|={'sourcePage':f"https://www.inaturalist.org/photos/{p['photoId']}",'licenseUrl':'https://creativecommons.org/publicdomain/zero/1.0/' if p['license']=='cc0' else 'https://creativecommons.org/licenses/by/4.0/','title':p['taxon']+' — observation '+str(observation['id']),'modifications':'EXIF orientation applied; resized (maximum 720px); JPEG recompression. No generated content or compositing.','displayNote':'实拍照片','evidenceFile':f'docs/release/photo-evidence/inat-{p["photoId"]}.json'}
  snapshot={'retrievedAt':'2026-09-14','apiUrl':'https://api.inaturalist.org/v1/observations/'+str(observation['id']),'observationId':observation['id'],'taxon':observation['taxon'],'qualityGrade':observation['quality_grade'],'photo':photo}
  (root/record['evidenceFile']).write_text(json.dumps(snapshot,ensure_ascii=False,indent=2)+'\n');package(p['candidatePath'],species,index,record)
commons=json.loads(Path('/tmp/commons-ganbajun.txt').read_text());page=next(p for p in commons['query']['pages'].values() if p['title'].endswith('443675.jpg'));image=page['imageinfo'][0];license=image['extmetadata']['LicenseUrl']['value'];assert license.rstrip('/')=='https://creativecommons.org/licenses/by-sa/3.0'
(evidence/'commons-ganbajun.json').write_text(json.dumps(page,ensure_ascii=False,indent=2)+'\n')
shutil.copyfile('/tmp/ganbajun-source.jpg',evidence/'ganbajun-original.jpg')
for i,crop in enumerate([None,[330,310,1130,950]]):
 package('/tmp/ganbajun-source.jpg','thelephora-ganbajun',i,{'photoId':'commons-443675','url':image['url'].split('?')[0],'sourcePage':image['descriptionurl'],'observationUrl':'https://mushroomobserver.org/173306','license':'cc-by-sa','licenseUrl':license+'/' if not license.endswith('/') else license,'attribution':'© wombata (Mushroom Observer) · CC BY-SA 3.0','author':'wombata','taxon':'Thelephora ganbajun','qualityGrade':'source-identified','title':'2014-07-26 Thelephora ganbajun M. Zang 443675','displayNote':'原图实拍' if i==0 else '同一原图的局部特写','modifications':('Resized; JPEG recompression.' if i==0 else 'Cropped to [330,310,1130,950]; resized; JPEG recompression.')+' This adapted photograph remains licensed CC BY-SA 3.0.','evidenceFile':'docs/release/photo-evidence/commons-ganbajun.json'},crop)
r=ET.parse('/tmp/PMC8701279.xml');permission=ET.tostring(r.find('.//permissions'),encoding='unicode');assert 'https://creativecommons.org/licenses/by/4.0/' in permission
fig=r.find('.//fig[@id="genes-12-01907-f001"]');caption=' '.join(''.join(fig.itertext()).split());assert 'exitialis' in caption
paper={'title':''.join(r.find('.//article-title').itertext()),'authors':['Juan Zhong','Jianping Xu','Ping Zhang'],'sourcePage':'https://pmc.ncbi.nlm.nih.gov/articles/PMC8701279/','licenseXml':permission,'figureXml':ET.tostring(fig,encoding='unicode'),'retrievedAt':'2026-09-14'};(evidence/'PMC8701279-figure1.json').write_text(json.dumps(paper,ensure_ascii=False,indent=2)+'\n');shutil.copyfile('/tmp/exitialis-source.jpg',evidence/'exitialis-figure1-original.jpg')
for i,crop in enumerate([[7,7,385,289],[405,7,783,289]]):
 package('/tmp/exitialis-source.jpg','amanita-exitialis',i,{'photoId':'PMC8701279-Figure1-'+str(i),'url':'https://cdn.ncbi.nlm.nih.gov/pmc/blobs/6d25/8701279/86a8792adf3d/genes-12-01907-g001.jpg','sourcePage':paper['sourcePage'],'license':'cc-by','licenseUrl':'https://creativecommons.org/licenses/by/4.0/','attribution':'© 2021 Juan Zhong, Jianping Xu & Ping Zhang · CC BY 4.0','author':'Juan Zhong, Jianping Xu & Ping Zhang','taxon':'Amanita exitialis','qualityGrade':'research-publication','title':paper['title']+' — Figure 1','displayNote':'论文实拍图版 · '+('左图' if i==0 else '右图'),'modifications':'Figure 1 '+('left' if i==0 else 'right')+' panel cropped; JPEG recompression. No compositing or generated content.','evidenceFile':'docs/release/photo-evidence/PMC8701279-figure1.json'},crop)
(out/'ATTRIBUTION.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
credits={s:[r['attribution'] for r in records if r['speciesId']==s] for s in {r['speciesId'] for r in records}}
(root/'js/data/commercialPhotoCredits.js').write_text('// Generated by scripts/build-commercial-photos.py\nexport const COMMERCIAL_PHOTO_CREDITS=Object.freeze('+json.dumps(credits,ensure_ascii=False,indent=2)+')\n')
print('Packaged',len(records),'commercially licensed replacement photos')

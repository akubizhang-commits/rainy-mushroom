from pathlib import Path
from collections import deque
from PIL import Image
import numpy as np,json,hashlib
r=Path(__file__).resolve().parent;s=r.parent/'xianxia-humanoid-bosses-2026-11-01/yak';original=Image.open(s/'original.png').convert('RGBA');a=np.array(Image.open(s/'extracted-alpha.png').convert('RGBA'));h,w=a.shape[:2];mask=a[:,:,3]<200;seen=np.zeros((h,w),bool);filled=[]
for y,x in zip(*np.where(mask)):
 if seen[y,x]:continue
 todo=[(y,x)];seen[y,x]=True;part=[];edge=False
 while todo:
  cy,cx=todo.pop();part.append((cy,cx));edge|=cy==0 or cx==0 or cy==h-1 or cx==w-1
  for ny,nx in ((cy-1,cx),(cy+1,cx),(cy,cx-1),(cy,cx+1)):
   if 0<=ny<h and 0<=nx<w and mask[ny,nx] and not seen[ny,nx]:seen[ny,nx]=True;todo.append((ny,nx))
 if not edge and len(part)<=1400 and max(v[0] for v in part)<450:
  for y,x in part:a[y,x,3]=255
  filled.append(len(part))
# Original RGB remains available at the same coordinates; restore it under the repaired matte.
a[:,:,:3]=np.array(original)[:,:,:3];im=Image.fromarray(a);box=im.getchannel('A').getbbox();crop=im.crop(box);size=tuple(round(n*820/max(crop.size)) for n in crop.size);ref=Image.new('RGBA',(1024,1024));ref.alpha_composite(crop.resize(size,Image.Resampling.LANCZOS),((1024-size[0])//2,922-size[1]));ref.save(r/'reference-alpha.png');green=Image.new('RGBA',ref.size,'#00FF00');green.alpha_composite(ref);green.convert('RGB').save(r/'reference-green.png')
record={'status':'prepared','provider':'Scenario','teamId':'team_Ur9UBLcjfvXmu2iaNKV7cFVh','projectId':'proj_k6xCHLGuh1JrUQ7Vzo8vsZYV','source':str(s/'original.png'),'sourceSha256':hashlib.sha256((s/'original.png').read_bytes()).hexdigest(),'referenceSize':ref.size,'repairedEnclosedHeadHoles':filled,'referenceBytes':(r/'reference-green.png').stat().st_size,'meowaBalance':0,'scenarioPeriodConsumptionBefore':0,'runtimeIntegrated':False}
(r/'production.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n');print(record['referenceBytes'],filled)

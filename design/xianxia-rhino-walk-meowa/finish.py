from pathlib import Path
from collections import deque
from PIL import Image,ImageFilter,ImageDraw
import numpy as np,json
r=Path(__file__).resolve().parent;o=r/'candidate';o.mkdir(exist_ok=True);info=json.loads((r/'inspection.json').read_text());frames=[];report=[]
for i in range(16):
 im=Image.open(r/'review'/f'{i:02}.png').convert('RGBA');a=np.array(im);h,w=a.shape[:2];bg=a[:,:,3]<200;seen=np.zeros((h,w),bool);holes=[]
 for y in range(h):
  for x in range(w):
   if not bg[y,x] or seen[y,x]:continue
   todo=[(y,x)];seen[y,x]=True;component=[];edge=False
   while todo:
    cy,cx=todo.pop();component.append((cy,cx));edge |= cy==0 or cx==0 or cy==h-1 or cx==w-1
    for ny,nx in [(cy-1,cx),(cy+1,cx),(cy,cx-1),(cy,cx+1)]:
     if 0<=ny<h and 0<=nx<w and bg[ny,nx] and not seen[ny,nx]:seen[ny,nx]=True;todo.append((ny,nx))
   if not edge and len(component)<=1800 and max(v[0] for v in component)<230:holes.append(component)
 mask=np.zeros((h,w),bool)
 for hole in holes:
  for y,x in hole:mask[y,x]=True
 # Propagate neighboring rock colors inward only within enclosed head/neck holes.
 pending=mask.copy()
 while pending.any():
  updates=[]
  for y,x in zip(*np.where(pending)):
   colors=[a[ny,nx,:3].astype(float) for ny,nx in [(y-1,x),(y+1,x),(y,x-1),(y,x+1)] if 0<=ny<h and 0<=nx<w and not pending[ny,nx] and a[ny,nx,3]>=200]
   if colors:updates.append((y,x,np.mean(colors,axis=0)))
  if not updates:break
  for y,x,c in updates:a[y,x,:3]=c;a[y,x,3]=255;pending[y,x]=False
 a[:,:,1]=np.minimum(a[:,:,1],np.maximum(a[:,:,0],a[:,:,2]));im=Image.fromarray(a);im.putalpha(im.getchannel('A').filter(ImageFilter.MinFilter(3)));im.save(o/f'{i:02}.png');frames.append(im)
 report.append({'frame':i,'enclosedHeadHoles':list(map(len,holes)),'unfilled':int(pending.sum())})
frames[0].save(o/'rhino-walk.webp',save_all=True,append_images=frames[1:],duration=info['durations'],loop=0,lossless=True)
contact=Image.new('RGB',(4*320,4*350),'#253632');draw=ImageDraw.Draw(contact)
preview=[]
for i,f in enumerate(frames):
 thumb=f.resize((320,320),Image.Resampling.LANCZOS);x=i%4*320;y=i//4*350;contact.paste(thumb,(x,y),thumb);draw.text((x+8,y+325),str(i),fill='white')
 p=Image.new('RGBA',(320,280),'#253632');p.alpha_composite(f.resize((220,220),Image.Resampling.LANCZOS),(50,30));preview.append(p.convert('RGB'))
contact.save(o/'contact.png');preview[0].save(o/'rhino-walk.gif',save_all=True,append_images=preview[1:],duration=info['durations'],loop=0)
(r/'cleanup.json').write_text(json.dumps(report,indent=2));print('Filled enclosed head/neck holes locally; original frames retained.')

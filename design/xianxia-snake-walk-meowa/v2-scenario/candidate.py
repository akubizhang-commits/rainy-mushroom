# Snake slither candidate: source frames 59..121 (63 frames @24fps = 2.625s; try1 s28 l60 seam 1.36 rejected) sampled to 16, green keyed.
from pathlib import Path
from PIL import Image, ImageFilter, ImageDraw
import numpy as np, json
r=Path(__file__).resolve().parent; o=r/'candidate'; o.mkdir(exist_ok=True)
START,LEN=59,63; ids=[START+round(i*LEN/16) for i in range(16)]
frames=[]
for n,i in enumerate(ids):
  a=np.array(Image.open(r/'raw-frames'/f'{i+1:03}.png').convert('RGB')).astype(float)
  ex=a[:,:,1]-np.maximum(a[:,:,0],a[:,:,2]); al=np.clip((55-ex)/35,0,1)*255
  a[:,:,1]=np.minimum(a[:,:,1],np.maximum(a[:,:,0],a[:,:,2]))
  im=Image.fromarray(a.astype('uint8')).convert('RGBA'); im.putalpha(Image.fromarray(al.astype('uint8')).filter(ImageFilter.MinFilter(3)))
  im.save(o/f'{n:02}.png'); frames.append(im)
prev=[]
for f in frames:
  bg=Image.new('RGBA',(360,300),'#253632'); bg.alpha_composite(f.resize((300,300),Image.LANCZOS),(30,0)); prev.append(bg.convert('RGB'))
prev[0].save(o/'snake-slither-preview.gif',save_all=True,append_images=prev[1:],duration=round(2625/16),loop=0)
t=[np.asarray(p.resize((120,100))).astype(float) for p in prev]
m=float(np.mean([np.abs(a-b).mean() for a,b in zip(t,t[1:])])); s=float(np.abs(t[-1]-t[0]).mean())
sh=Image.new('RGB',(4*240,4*200),'#253632'); d=ImageDraw.Draw(sh)
for k,p in enumerate(prev): sh.paste(p.resize((240,200)),(k%4*240,k//4*200)); d.text((k%4*240+4,k//4*200+4),f'{k} src{ids[k]}',fill='white')
sh.save(o/'contact.png')
json.dump({'sourceIndices':ids,'loopSeconds':LEN/24,'seamRatio':s/m},open(o/'candidate.json','w'),indent=2); print('seam/motion',round(s/m,3))

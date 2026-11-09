from pathlib import Path
from PIL import Image,ImageFilter,ImageDraw
import numpy as np,json
r=Path(__file__).resolve().parent;o=r/'candidate';o.mkdir(exist_ok=True);frames=[];tiny=[];boxes=[]
for i,p in enumerate(sorted((r/'raw-frames').glob('*.png'))):
 a=np.array(Image.open(p).convert('RGB')).astype(float); excess=a[:,:,1]-np.maximum(a[:,:,0],a[:,:,2]);alpha=np.clip((55-excess)/35,0,1)*255;a[:,:,1]=np.minimum(a[:,:,1],np.maximum(a[:,:,0],a[:,:,2]));im=Image.fromarray(a.astype('uint8')).convert('RGBA');im.putalpha(Image.fromarray(alpha.astype('uint8')).filter(ImageFilter.MinFilter(3))); box=im.getbbox();boxes.append(box)
 # Translation only: align baseline, retain native 480 px art and body proportions.
 aligned=Image.new('RGBA',(480,480));aligned.alpha_composite(im,(0,432-box[3]));frames.append(aligned)
 bg=Image.new('RGBA',(480,480),'#253632');bg.alpha_composite(aligned);tiny.append(np.array(bg.resize((120,120))).astype(float))
best=[]
for start in range(1,80):
 for length in range(30,61,2):
  ids=list(range(start,start+length,2))
  if ids[-1]>=len(frames):continue
  vals=[float(np.abs(tiny[a]-tiny[b]).mean()) for a,b in zip(ids,ids[1:])]; seam=float(np.abs(tiny[ids[-1]]-tiny[ids[0]]).mean());mean=float(np.mean(vals));best.append((seam/mean,seam,mean,start,length))
best.sort();print(best[:10]);ratio,seam,mean,start,length=best[0];ids=list(range(start,start+length,2));out=[];contact=Image.new('RGB',(1200,((len(ids)+4)//5)*260),'#253632');d=ImageDraw.Draw(contact)
for n,i in enumerate(ids):
 f=frames[i];f.save(o/f'{n:02}.png');bg=Image.new('RGBA',(260,260),'#253632');bg.alpha_composite(f.resize((220,220)),(20,20));out.append(bg.convert('RGB'));x=n%5*240;y=n//5*260;contact.paste(out[-1].resize((240,240)),(x,y));d.text((x+4,y+240),str(i),fill='white')
contact.save(o/'contact.jpg');out[0].save(o/'wolf-walk.gif',save_all=True,append_images=out[1:],duration=83,loop=0)
(r/'inspection.json').write_text(json.dumps(dict(indices=ids,fps=12,seam=seam,motionMean=mean,seamRatio=ratio,boxes=boxes,alignment='translation only to y=432, native 480x480'),indent=2))

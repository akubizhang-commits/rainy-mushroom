from pathlib import Path
from PIL import Image
import json,hashlib
r=Path(__file__).resolve().parent;o=r/'final';o.mkdir(exist_ok=True);old=Path('design/xianxia-tiger-walk-meowa/final');meta=json.loads((old/'tiger-v1.json').read_text());keys=list(meta['clips']['move']['frames']);frames=[Image.open(old/f'{k}.png').convert('RGBA') for k in keys];ids=[0,16,20,24,28,30,32,34,36,38,42,47,52,64,68,72,76,80,84,90,98];scale=358/292;anchor=[.5,(385+(meta['anchor'][1]*480-418)/scale)/480];preview=[];walkhash={}
for k,f in zip(keys,frames):walkhash[k]=hashlib.sha256(f.tobytes()).hexdigest()
for n,i in enumerate(ids):
 f=Image.open(r/'keyed-v1'/f'{i:03}.png').convert('RGBA');f.save(o/f'sweep-{n:03}.png');frames.append(f);keys.append(f'sweep-{n:03}')
 bg=Image.new('RGBA',(360,300),'#253632');sz=round(220*scale);tile=f.resize((sz,sz),Image.Resampling.LANCZOS);bg.alpha_composite(tile,(round(180-sz*.5),round(250-sz*anchor[1])));preview.append(bg.convert('RGB'))
atlas=Image.new('RGBA',(2880,2880));records={}
for n,(k,f) in enumerate(zip(keys,frames)):
 x=n%6*480;y=n//6*480;atlas.alpha_composite(f,(x,y));records[k]=dict(x=x,y=y,w=480,h=480)
 if k.startswith('sweep'):records[k].update(displayScale=scale,anchor=anchor)
atlas.save(o/'tiger-v1.png');meta.update(width=2880,height=2880,frames=records);meta['clips']['sweep']=dict(frames=keys[15:],fps=10,loop=False,phases=dict(windup=[0,10],active=[10,3],recovery=[13,8]));meta['sourceSha256']=hashlib.sha256((o/'tiger-v1.png').read_bytes()).hexdigest();(o/'tiger-v1.json').write_text(json.dumps(meta,indent=2)+'\n');preview[0].save(o/'tiger-sweep.gif',save_all=True,append_images=preview[1:],duration=[100]*10+[60]*3+[110]*7+[130],loop=0)
(o/'final_outputs.json').write_text(json.dumps(dict(status='candidate',runtimeIntegrated=False,indices=ids,nativeFrameSize=480,displayScale=scale,anchor=anchor,existingMovePixelHashes=walkhash),indent=2)+'\n');print('36x480, 2880 atlas; attack scale',scale,'anchor',anchor)

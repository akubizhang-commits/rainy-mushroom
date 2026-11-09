from pathlib import Path
from PIL import Image,ImageFilter
import numpy as np,json,hashlib
r=Path(__file__).resolve().parent;o=r/'final';o.mkdir(exist_ok=True);ids=[69+round(i*44/16) for i in range(16)];frames=[]
for n,i in enumerate(ids):
 a=np.array(Image.open(r/'raw-frames'/f'{i+1:03}.png').convert('RGB')).astype(float);excess=a[:,:,1]-np.maximum(a[:,:,0],a[:,:,2]);alpha=np.clip((55-excess)/35,0,1)*255;a[:,:,1]=np.minimum(a[:,:,1],np.maximum(a[:,:,0],a[:,:,2]));im=Image.fromarray(a.astype('uint8')).convert('RGBA');im.putalpha(Image.fromarray(alpha.astype('uint8')).filter(ImageFilter.MinFilter(3)));box=im.getbbox();f=Image.new('RGBA',(480,480));f.alpha_composite(im,(0,432-box[3]));f.save(o/f'move-{n:03}.png');frames.append(f)
atlas=Image.new('RGBA',(1920,1920))
for i,f in enumerate(frames):atlas.alpha_composite(f,(i%4*480,i//4*480))
atlas.save(o/'wolf-humanoid-v1.png');manifest={'version':2,'width':1920,'height':1920,'facing':'left','anchor':[.5,.9],'frames':{f'move-{i:03}':{'x':i%4*480,'y':i//4*480,'w':480,'h':480} for i in range(16)},'clips':{'move':{'frames':[f'move-{i:03}' for i in range(16)],'fps':16/(44/24),'loop':True}},'damageEvents':[],'sourceSha256':hashlib.sha256((o/'wolf-humanoid-v1.png').read_bytes()).hexdigest()};(o/'wolf-humanoid-v1.json').write_text(json.dumps(manifest,indent=2)+'\n')
preview=[];tiny=[]
for f in frames:
 bg=Image.new('RGBA',(320,280),'#253632');bg.alpha_composite(f.resize((220,220)),(50,30));preview.append(bg.convert('RGB'));tiny.append(np.array(bg.resize((120,105))).astype(float))
preview[0].save(o/'wolf-humanoid-walk.gif',save_all=True,append_images=preview[1:],duration=[110,120]*8,loop=0)
frames[0].save(o/'wolf-humanoid-walk.webp',save_all=True,append_images=frames[1:],duration=[110,120]*8,loop=0,lossless=True)
mean=float(np.mean([np.abs(a-b).mean() for a,b in zip(tiny,tiny[1:]) ]));seam=float(np.abs(tiny[-1]-tiny[0]).mean());assert seam<=mean
(o/'final_outputs.json').write_text(json.dumps(dict(status='review_candidate',runtimeIntegrated=False,indices=ids,nativeFrameSize=480,frameCount=16,loopDuration=44/24,seam=seam,motionMean=mean,seamRatio=seam/mean),indent=2))
print('16 native 480 frames, seam/motion',seam/mean)

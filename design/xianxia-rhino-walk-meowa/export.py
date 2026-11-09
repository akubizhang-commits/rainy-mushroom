from pathlib import Path
from PIL import Image
import json,hashlib
r=Path(__file__).resolve().parent;o=r/'final';o.mkdir(exist_ok=True);info=json.loads((r/'inspection.json').read_text());frames=[]
for i in range(15):
 f=Image.open(r/'candidate'/f'{i:02}.png').convert('RGBA').resize((480,480),Image.Resampling.LANCZOS);f.save(o/f'move-{i:03}.png');frames.append(f)
atlas=Image.new('RGBA',(1920,1920))
for i,f in enumerate(frames):atlas.alpha_composite(f,(i%4*480,i//4*480))
atlas.save(o/'rhino-v1.png');manifest={'version':2,'width':1920,'height':1920,'facing':'left','anchor':[.5,.9],'frames':{f'move-{i:03}':{'x':i%4*480,'y':i//4*480,'w':480,'h':480} for i in range(15)},'clips':{'move':{'frames':[f'move-{i:03}' for i in range(15)],'fps':15000/sum(info['durations'][:15]),'loop':True}},'damageEvents':[],'sourceSha256':hashlib.sha256((o/'rhino-v1.png').read_bytes()).hexdigest()};(o/'rhino-v1.json').write_text(json.dumps(manifest,indent=2)+'\n')
frames[0].save(o/'rhino-walk.webp',save_all=True,append_images=frames[1:],duration=info['durations'][:15],loop=0,lossless=True)
preview=[]
for f in frames:
 p=Image.new('RGBA',(320,280),'#253632');p.alpha_composite(f.resize((220,220),Image.Resampling.LANCZOS),(50,30));preview.append(p.convert('RGB'))
preview[0].save(o/'rhino-walk.gif',save_all=True,append_images=preview[1:],duration=info['durations'][:15],loop=0)
(o/'final_outputs.json').write_text(json.dumps({'status':'local_review_candidate','outputs':['rhino-walk.webp','rhino-walk.gif'],'runtimeIntegrated':False},indent=2))

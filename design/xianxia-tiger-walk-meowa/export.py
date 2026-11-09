from pathlib import Path
from PIL import Image,ImageFilter,ImageDraw
import json,hashlib
r=Path(__file__).resolve().parent;o=r/'final';o.mkdir(exist_ok=True)
info=json.loads((r/'inspection.json').read_text());frames=[]
# Fixed canvas transform for all frames; no per-frame fit or stretching.
for i in range(15):
 im=Image.open(r/'review'/f'{i:02}.png').convert('RGBA')
 im.putalpha(im.getchannel('A').filter(ImageFilter.MinFilter(3)))
 canvas=Image.new('RGBA',(664,664));canvas.alpha_composite(im,(12,12))
 f=canvas.resize((480,480),Image.Resampling.LANCZOS);f.save(o/f'move-{i:03}.png');frames.append(f)
# Last source frame repeats the start; omit it to avoid a held beat at the seam.
atlas=Image.new('RGBA',(1920,1920))
for i,f in enumerate(frames):atlas.alpha_composite(f,(i%4*480,i//4*480))
atlas.save(o/'tiger-v1.png')
manifest={'version':2,'width':1920,'height':1920,'facing':'left','anchor':[.5,588/664],'frames':{f'move-{i:03}':{'x':i%4*480,'y':i//4*480,'w':480,'h':480} for i in range(15)},'clips':{'move':{'frames':[f'move-{i:03}' for i in range(15)],'fps':1000/(sum(info['durations'][:15])/15),'loop':True}},'damageEvents':[],'sourceSha256':hashlib.sha256((o/'tiger-v1.png').read_bytes()).hexdigest()}
(o/'tiger-v1.json').write_text(json.dumps(manifest,indent=2)+'\n')
frames[0].save(o/'tiger-walk.webp',save_all=True,append_images=frames[1:],duration=info['durations'][:15],loop=0,lossless=True)
previews=[]
for f in frames:
 bg=Image.new('RGBA',(440,280),'#253632');sm=f.resize((220,220),Image.Resampling.LANCZOS);bg.alpha_composite(sm,(110,30));previews.append(bg.convert('RGB'))
previews[0].save(o/'tiger-walk.gif',save_all=True,append_images=previews[1:],duration=info['durations'][:15],loop=0)
(o/'final_outputs.json').write_text(json.dumps({'status':'local_review_candidate','outputs':['tiger-walk.webp','tiger-walk.gif'],'runtimeIntegrated':False},indent=2))
print('15 frames, 480px; atlas 1920x1920, RGBA 14.0625 MiB; source frame 15 retained in review/')

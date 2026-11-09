from pathlib import Path
from PIL import Image, ImageDraw
import numpy as np,json
root=Path(__file__).resolve().parent
source=next((root/'v1').rglob('*.webp'));im=Image.open(source)
out=root/'review';out.mkdir(exist_ok=True)
frames=[];durations=[];bounds=[]
for i in range(im.n_frames):
 im.seek(i);rgb=np.array(im.convert('RGB')).astype(float);r,g,b=rgb[:,:,0],rgb[:,:,1],rgb[:,:,2]
 dominance=(g-np.maximum(r,b))/255
 alpha=1-np.clip((dominance-.035)/.22,0,1)
 rgb[:,:,1]=np.minimum(g,np.maximum(r,b)+8)
 rgba=np.dstack([rgb,alpha*255]).clip(0,255).astype('uint8')
 frame=Image.fromarray(rgba);frame.save(out/f'{i:02}.png');frames.append(frame)
 durations.append(im.info.get('duration',125));bounds.append(frame.getchannel('A').point(lambda a:255 if a>100 else 0).getbbox())
contact=Image.new('RGB',(4*320,4*350),'#253632');draw=ImageDraw.Draw(contact)
for i,f in enumerate(frames):
 f=f.copy();f.thumbnail((320,320));x=i%4*320;y=i//4*350;contact.paste(f,(x,y),f);draw.text((x+8,y+325),str(i),fill='white')
contact.save(out/'contact.png')
frames[0].save(out/'walk.webp',save_all=True,append_images=frames[1:],duration=durations,loop=0,lossless=True)
matte=[]
for frame in frames:
 f=Image.new('RGBA',frame.size,'#253632');f.alpha_composite(frame);matte.append(f.convert('RGB'))
matte[0].save(out/'walk.gif',save_all=True,append_images=matte[1:],duration=durations,loop=0)
a=[np.array(f).astype(float) for f in frames]
steps=[float(np.abs(a[i]-a[(i+1)%len(a)]).mean()) for i in range(len(a))]
(root/'inspection.json').write_text(json.dumps({'actualSize':im.size,'frames':len(frames),'durationMs':sum(durations),'durations':durations,'alphaBounds':bounds,'consecutiveRgbaMAE':steps},indent=2))
print((root/'inspection.json').read_text())

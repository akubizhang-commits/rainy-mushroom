from pathlib import Path
from PIL import Image,ImageFilter,ImageDraw
import numpy as np,json
r=Path(__file__).resolve().parent;o=r/'keyed-v1';o.mkdir(exist_ok=True);rows=[]
for i,p in enumerate(sorted((r/'raw-v1').glob('*.png'))):
 a=np.array(Image.open(p).convert('RGB')).astype(float);excess=a[:,:,1]-np.maximum(a[:,:,0],a[:,:,2]);alpha=np.clip((55-excess)/35,0,1)*255;a[:,:,1]=np.minimum(a[:,:,1],np.maximum(a[:,:,0],a[:,:,2]));im=Image.fromarray(a.astype('uint8')).convert('RGBA');im.putalpha(Image.fromarray(alpha.astype('uint8')).filter(ImageFilter.MinFilter(3)));im.save(o/f'{i:03}.png');rows.append(dict(index=i,bbox=im.getbbox(),opaqueEdgePixels=int(np.count_nonzero(np.r_[alpha[0],alpha[-1],alpha[:,0],alpha[:,-1]]>128))))
(r/'inspection.json').write_text(json.dumps(rows,indent=2));print('edge frames',[i['index'] for i in rows if i['opaqueEdgePixels']]);print(rows[0],rows[50],rows[95])

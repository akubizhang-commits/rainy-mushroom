from PIL import Image;import numpy as np,os
for d in ['yak-m19','rhino-m20','wolf-humanoid-m05','tiger-humanoid-m07','falcon-humanoid-m07']:
    out=[]
    for i,f in enumerate(sorted(os.listdir(d+'/raw-frames'))):
        a=np.array(Image.open(f'{d}/raw-frames/{f}').convert('RGB')).astype(int)
        s=(a[:,:,1]-np.maximum(a[:,:,0],a[:,:,2]))<40
        t=[int(s[:2].sum()),int(s[-2:].sum()),int(s[:,:2].sum()),int(s[:,-2:].sum())]
        if sum(t)>4: out.append((i+1,t))
    print(d,len(out),out[:3],'...',out[-2:] if out else '')

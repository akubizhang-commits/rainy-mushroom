from PIL import Image;import numpy as np,os
for d in ['yak-m05','crocodile-humanoid-m12','spider-lady-m22','spider-lady-m11','snake-lady-m11']:
    out=[]
    for i,f in enumerate(sorted(os.listdir(d+'/raw-frames'))):
        a=np.array(Image.open(f'{d}/raw-frames/{f}').convert('RGB')).astype(int)
        s=(a[:,:,1]-np.maximum(a[:,:,0],a[:,:,2]))<40
        t=[int(s[:2].sum()),int(s[-2:].sum()),int(s[:,:2].sum()),int(s[:,-2:].sum())]
        if sum(t)>4: out.append((i+1,t))
    print(d,len(out),out[:3],'...',out[-2:] if out else '')

from PIL import Image;import numpy as np,os
for d in ['bat-humanoid-m07','white-tiger-m06','white-tiger-m19','white-tiger-m01','snake-lady-m03']:
    out=[]
    for i,f in enumerate(sorted(os.listdir(d+'/raw-frames'))):
        a=np.array(Image.open(f'{d}/raw-frames/{f}').convert('RGB')).astype(int)
        s=(a[:,:,1]-np.maximum(a[:,:,0],a[:,:,2]))<40
        t=[int(s[:2].sum()),int(s[-2:].sum()),int(s[:,:2].sum()),int(s[:,-2:].sum())]
        if sum(t)>4: out.append((i+1,t))
    print(d,len(out),out[:3],'...',out[-2:] if out else '')

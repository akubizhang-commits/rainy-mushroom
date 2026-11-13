from PIL import Image, ImageDraw
import os
rows=[]
for d in ['bat-humanoid-m07','white-tiger-m06','white-tiger-m19','white-tiger-m01','snake-lady-m03']:
    fs=sorted(os.listdir(d+'/raw-frames'));pick=list(range(0,len(fs),8))
    ims=[Image.open(f'{d}/raw-frames/{fs[i]}').convert('RGB').resize((150,150)) for i in pick]
    r=Image.new('RGB',(150*len(ims),168),'white');dr=ImageDraw.Draw(r)
    for n,(i,im) in enumerate(zip(pick,ims)): r.paste(im,(n*150,0));dr.text((n*150+3,152),f'{d[:10]} {i+1}',fill='black')
    rows.append(r)
W=max(r.width for r in rows);out=Image.new('RGB',(W,168*len(rows)),'white')
for k,r in enumerate(rows): out.paste(r,(0,k*168))
out.save('review-strips.png');print(out.size)

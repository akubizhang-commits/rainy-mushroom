from PIL import Image, ImageSequence
import glob,os
w=glob.glob('v1/**/*.webp',recursive=True)[0]
os.makedirs('raw-frames',exist_ok=True)
im=Image.open(w);n=0
for f in ImageSequence.Iterator(im):
    n+=1;f.convert('RGBA').save(f'raw-frames/{n:03d}.png')
print(w,n,im.size)
fs=sorted(os.listdir('raw-frames'));pick=fs[::max(1,len(fs)//12)]
ims=[Image.open('raw-frames/'+f).convert('RGB') for f in pick];s=200/ims[0].height
ims=[i.resize((int(i.width*s),200)) for i in ims]
out=Image.new('RGB',(sum(i.width for i in ims),220),'white');x=0
from PIL import ImageDraw
d=ImageDraw.Draw(out)
for p,i in zip(pick,ims): out.paste(i,(x,0));d.text((x+4,204),p,fill='black');x+=i.width
out.save('strip-v1.png')

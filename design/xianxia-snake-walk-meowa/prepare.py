# Cut the paper background from the approved 512px demonic snake for animation input.
from PIL import Image, ImageFilter
import numpy as np, sys
from collections import deque
SRC='/Users/zhangnu/WeChatProjects/rainy-mushroom/design/xianxia-monster-demonic-2026-10-28/snake-demonic.png'
a=np.asarray(Image.open(SRC).convert('RGB')).astype(int); h,w,_=a.shape
bg=np.array([248,242,226])
def label(cand):
  lab=np.zeros((h,w),int); n=0; sizes=[0]
  for y in range(h):
    for x in range(w):
      if cand[y,x] and not lab[y,x]:
        n+=1; q=deque([(y,x)]); lab[y,x]=n; s=0
        while q:
          cy,cx=q.popleft(); s+=1
          for ny,nx in ((cy+1,cx),(cy-1,cx),(cy,cx+1),(cy,cx-1)):
            if 0<=ny<h and 0<=nx<w and cand[ny,nx] and not lab[ny,nx]: lab[ny,nx]=n; q.append((ny,nx))
        sizes.append(s)
  return lab,sizes
tol=int(sys.argv[1]) if len(sys.argv)>1 else 14
cand=np.abs(a-bg).max(2)<=tol
lab,sizes=label(cand)
edge=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
holes=[i for i,s in enumerate(sizes) if i and i not in edge and s>300]
print('tol',tol,'holes',[(i,sizes[i]) for i in holes])
m=np.isin(lab,list(edge)+holes)
alpha=Image.fromarray(np.where(m,0,255).astype('uint8')).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(.7))
rgba=Image.open(SRC).convert('RGBA'); rgba.putalpha(alpha)
rgba.save(f'alpha-tol{tol}.png')
g=Image.new('RGBA',(512,512),(0,255,0,255)); g.alpha_composite(rgba); g.convert('RGB').save(f'try-tol{tol}.png')


# Pass 2: the paper floor shadow sits under the coil. Scan each column bottom-up from the
# lowest opaque pixel and drop light, low-saturation pixels until the first body pixel.
keep=~m
lum=a.mean(2); sat=a.max(2)-a.min(2)
shadowlike=(lum>=150)&(sat<=52)
removed=0
for x in range(w):
  ys=np.where(keep[:,x])[0]
  if not len(ys): continue
  y=ys.max()
  while y>=0 and keep[y,x] and shadowlike[y,x] and y>300:
    keep[y,x]=False; removed+=1; y-=1
print('shadow px removed',removed)
# Pass 3: paper visible inside the coil and in the tail gap (seeded, light & low saturation).
for sy,sx in ((312,270),(318,300),(240,393),(250,400)):
  if not shadowlike[sy,sx]: print('seed not paper',sy,sx,a[sy,sx]); continue
  q=deque([(sy,sx)]); keep[sy,sx]=False; n=0
  while q:
    cy,cx=q.popleft(); n+=1
    for ny,nx in ((cy+1,cx),(cy-1,cx),(cy,cx+1),(cy,cx-1)):
      if 0<=ny<h and 0<=nx<w and keep[ny,nx] and shadowlike[ny,nx]: keep[ny,nx]=False; q.append((ny,nx))
  print('seed',sy,sx,'removed',n)
alpha=Image.fromarray(np.where(keep,255,0).astype('uint8')).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(.7))
rgba=Image.open(SRC).convert('RGBA'); rgba.putalpha(alpha); rgba.save('reference-alpha-512.png')
g=Image.new('RGBA',(512,512),(0,255,0,255)); g.alpha_composite(rgba); g.convert('RGB').save('review-cutout-v4.png')
big=rgba.resize((1024,1024),Image.LANCZOS); big.save('reference-alpha-1024-upscaled.png')
G=Image.new('RGBA',(1024,1024),(0,255,0,255)); G.alpha_composite(big); G.convert('RGB').save('reference-green.png')
print('bbox',rgba.getbbox())

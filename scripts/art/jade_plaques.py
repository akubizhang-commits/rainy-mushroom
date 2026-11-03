"""Render eight reproducible, tier-colored jade UI plaques (not item icons)."""
from pathlib import Path
from math import sin, cos, sqrt, exp
from PIL import Image, ImageDraw
ROOT=Path(__file__).resolve().parents[2]
SRC=ROOT/'design/xianxia-jade-ui/v2-plaques'
OUT=ROOT/'cocos-pilot/assets/resources/tower-ui'
SRC.mkdir(parents=True,exist_ok=True)
COLORS={'fan':(226,228,213),'fa':(139,186,151),'bao':(139,180,206),'ling':(181,155,202),'fabao':(220,174,127),'lingbao':(206,143,139),'xian':(214,190,121),'shen':(230,207,150)}
W,H=384,512
preview=Image.new('RGBA',(W*8,H),(247,246,237,255))
for index,(tier,base) in enumerate(COLORS.items()):
 im=Image.new('RGBA',(W,H))
 for py in range(H):
  for px in range(W):
   x,y=(px+.5-W/2)/W,(py+.5-H/2)/H
   # Signed distance to a softly bevelled rectangular tablet.
   qx,qy=abs(x)-.35,abs(y)-.405
   d=sqrt(max(qx,0)**2+max(qy,0)**2)+min(max(qx,qy),0)-.055
   if d>=0:continue
   depth=-d
   cloud=(sin(x*12+y*8+sin(y*9))+.5*sin(y*17-x*7+cos(x*13)))/1.5
   vein=exp(-(sin(x*13+y*9+.6*sin(y*19))/.17)**2)
   glow=exp(-((x+.17)**2/.045+(y+.19)**2/.09))
   rim=exp(-((depth-.016)/.009)**2)
   bevel=exp(-((depth-.035)/.022)**2)
   lighting=7*cloud-3*vein+20*glow+rim*22-bevel*(x+y)*14-exp(-(depth/.006)**2)*24
   iridescence=(sin(y*9+x*5)*10,cos(y*8)*4,-sin(y*9+x*5)*8) if tier=='shen' else (0,0,0)
   color=tuple(max(0,min(255,round(c+lighting+iridescence[i]))) for i,c in enumerate(base))
   im.putpixel((px,py),(*color,round(255*min(1,depth*W))))
 draw=ImageDraw.Draw(im)
 # Suspension aperture and quiet etched ornaments make the silhouette a jade plaque.
 draw.ellipse((W/2-12,43,W/2+12,67),fill=tuple(max(0,c-42) for c in base)+(255,))
 draw.ellipse((W/2-7,48,W/2+7,62),fill=(0,0,0,0))
 ink=tuple(min(255,c+24) for c in base)+(220,)
 draw.rounded_rectangle((52,91,W-52,H-53),radius=17,outline=ink,width=2)
 for y in (116,H-82):
  draw.line([(W/2-46,y),(W/2-18,y),(W/2,y-8),(W/2+18,y),(W/2+46,y)],fill=ink,width=2)
 im.save(SRC/f'jade-plaque-{tier}-source.png')
 im.resize((192,256),Image.Resampling.LANCZOS).save(OUT/f'jade-plaque-{tier}.png')
 preview.alpha_composite(im,(index*W,0))
preview.resize((1536,256),Image.Resampling.LANCZOS).save(SRC/'plaque-preview.png')
print('Saved eight 384x512 source and 192x256 RGBA runtime plaques')

"""Luminous jade material variant; keep all earlier source assets intact."""
from pathlib import Path
from math import sin, exp, sqrt
from PIL import Image, ImageDraw, ImageFont, ImageFilter
ROOT=Path(__file__).resolve().parents[2]
SRC=ROOT/'design/xianxia-jade-ui/v4-translucent'
OUT=ROOT/'cocos-pilot/assets/resources/tower-ui'
SRC.mkdir(parents=True,exist_ok=True)
NAMES={'fan':'凡器','fa':'法器','bao':'宝器','ling':'灵器','fabao':'法宝','lingbao':'灵宝','xian':'仙器','shen':'神器'}
font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Songti.ttc',136)
preview=Image.new('RGBA',(384*8,512),(247,246,237,255))
for index,(tier,name) in enumerate(NAMES.items()):
 im=Image.open(ROOT/f'design/xianxia-jade-ui/v2-plaques/jade-plaque-{tier}-source.png').convert('RGBA')
 # Recolour the body with a luminous core, denser edges and a broad reflected light.
 oldbases=[(226,228,213),(139,186,151),(139,180,206),(181,155,202),(220,174,127),(206,143,139),(214,190,121),(230,207,150)]
 bases=[(219,226,219),(115,166,141),(112,161,187),(151,133,175),(202,154,106),(187,113,127),(190,164,94),(209,185,124)]
 pixels=im.load()
 for y in range(512):
  for x in range(384):
   pixel=pixels[x,y]
   if not pixel[3]:continue
   u,v=x/384-.5,y/512-.5
   core=exp(-((u+.045)**2/.065+(v+.05)**2/.16))
   reflected=exp(-((u+.16+v*.24)/.07)**2)*exp(-((v+.10)/.40)**2)
   transmission=.19+.35*core+.12*reflected
   detail=sum(pixel[i]-oldbases[index][i] for i in range(3))/3*.48
   frost=(245,249,245)
   rgb=[round(bases[index][i]*(1-transmission)+frost[i]*transmission+detail) for i in range(3)]
   if tier=='shen':
    rgb[0]+=round(6*sin(v*8));rgb[2]+=round(8*sin(v*8+1.3))
   pixels[x,y]=(*(max(0,min(255,c)) for c in rgb),pixel[3])
 draw=ImageDraw.Draw(im)
 # Paired shadow/light lines suggest shallow relief rather than painted ornament.
 for offset,ink in [(0,(75,79,59,75)),(2,(246,241,214,140))]:
  ornament=Image.new('RGBA',im.size);g=ImageDraw.Draw(ornament)
  for x,sign in [(64,1),(320,-1)]:
   for y,dy in [(133,1),(414,-1)]:
    g.line([(x,y+offset),(x+sign*22,y+offset),(x+sign*22,y+dy*12+offset),(x+sign*9,y+dy*12+offset)],fill=ink,width=2)
  im=Image.alpha_composite(im,ornament)
 mask=Image.new('L',im.size);md=ImageDraw.Draw(mask)
 for char,cy in zip(name,[204,345]):
  box=md.textbbox((0,0),char,font=font,stroke_width=1)
  md.text((192-(box[0]+box[2])/2,cy-(box[1]+box[3])/2),char,font=font,fill=255,stroke_width=1)
 relief=mask.filter(ImageFilter.GaussianBlur(1.5))
 result=im.copy();m=mask.load();r=relief.load();src=im.load();dst=result.load()
 for y in range(3,509):
  for x in range(3,381):
   coverage=m[x,y]/255
   if not coverage and r[x,y]<1:continue
   # Recessed cavity: dark upper lip, illuminated lower cut edge.
   slope=(r[x-2,y-2]-r[x+2,y+2])/255
   depth=.43 if index<4 else .32
   grain=1.5*sin(x*.77+y*.29)
   rgb=tuple(max(0,min(255,round(c*(1-depth*coverage)+slope*38+grain*coverage))) for c in src[x,y][:3])
   dst[x,y]=(*rgb,src[x,y][3])
 result.save(SRC/f'jade-plaque-clear-{tier}-source.png')
 result.resize((192,256),Image.Resampling.LANCZOS).save(OUT/f'jade-plaque-clear-{tier}.png')
 preview.alpha_composite(result,(384*index,0))
preview.resize((1536,256),Image.Resampling.LANCZOS).save(SRC/'translucent-preview.png')
print('Baked eight inscriptions into transparent jade plaque textures')

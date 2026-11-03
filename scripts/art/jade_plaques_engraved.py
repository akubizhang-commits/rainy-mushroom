"""Refine v2 jade plaques and bake recessed Songti inscriptions into the material."""
from pathlib import Path
from math import sin
from PIL import Image, ImageDraw, ImageFont, ImageFilter
ROOT=Path(__file__).resolve().parents[2]
SRC=ROOT/'design/xianxia-jade-ui/v3-engraved'
OUT=ROOT/'cocos-pilot/assets/resources/tower-ui'
SRC.mkdir(parents=True,exist_ok=True)
NAMES={'fan':'凡器','fa':'法器','bao':'宝器','ling':'灵器','fabao':'法宝','lingbao':'灵宝','xian':'仙器','shen':'神器'}
font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Songti.ttc',136)
preview=Image.new('RGBA',(384*8,512),(247,246,237,255))
for index,(tier,name) in enumerate(NAMES.items()):
 im=Image.open(ROOT/f'design/xianxia-jade-ui/v2-plaques/jade-plaque-{tier}-source.png').convert('RGBA')
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
   depth=.53 if index<4 else .38
   grain=1.5*sin(x*.77+y*.29)
   rgb=tuple(max(0,min(255,round(c*(1-depth*coverage)+slope*65+grain*coverage))) for c in src[x,y][:3])
   dst[x,y]=(*rgb,src[x,y][3])
 result.save(SRC/f'jade-plaque-engraved-{tier}-source.png')
 result.resize((192,256),Image.Resampling.LANCZOS).save(OUT/f'jade-plaque-engraved-{tier}.png')
 preview.alpha_composite(result,(384*index,0))
preview.resize((1536,256),Image.Resampling.LANCZOS).save(SRC/'engraved-preview.png')
print('Baked eight inscriptions into transparent jade plaque textures')

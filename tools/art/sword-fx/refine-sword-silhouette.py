"""Recompose existing approved reference pixels; no generated or painted sword."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageChops, ImageOps, ImageEnhance, ImageFilter
import json
import numpy as np
ROOT=Path(__file__).resolve().parents[3]
# Old blade source, isolated before downsampling.
src=Image.open(ROOT/'design/xianxia-character-2026-10-26/v6-silver-reference/reference-cutout.png').convert('RGBA')
pts=[(x*4,y*4) for x,y in [(118,367),(124,370),(133,365),(132,373),(144,376),(135,383),(140,392),(129,389),(124,397),(120,389),(16,548),(2,558),(4,545),(114,387),(103,380),(114,379),(111,368)]]
m=Image.new('L',src.size);ImageDraw.Draw(m).polygon(pts,fill=255)
src.putalpha(ImageChops.darker(src.getchannel('A'),m))
p=src.crop((0,1440,584,2240)).convert('RGBa').rotate(123.6,Image.Resampling.BICUBIC,expand=True)
p=p.crop(p.getbbox()).convert('RGBA')
blade=p.crop((int(p.width*.17),0,p.width,p.height));blade=blade.crop(blade.getbbox())
# Complete grip + guard from the later, hand-free hover master.
h=Image.open(ROOT/'design/xianxia-character-2026-10-26/v7-hover-master/hover-cutout.png').crop((980,1230,1200,1360)).convert('RGBA')
m=Image.new('L',h.size);ImageDraw.Draw(m).polygon([(23,25),(96,8),(216,9),(218,85),(110,120),(65,130),(30,93)],fill=255)
h.putalpha(ImageChops.multiply(h.getchannel('A'),m))
h=ImageOps.mirror(h.convert('RGBa').rotate(-17,Image.Resampling.BICUBIC,expand=True).convert('RGBA'));h=h.crop(h.getbbox())
# Work at 4x, with a strong grip/guard/blade size hierarchy for mobile.
def size(im,w,h):return im.convert('RGBa').resize((w,h),Image.Resampling.LANCZOS).convert('RGBA')
canvas=Image.new('RGBA',(512,96))
# Rectify perspective: retain reference surface pixels, but use a straight,
# bilaterally symmetric double edge with a centered point.
blade=size(blade,344,70)
rectified=Image.new('RGBA',(344,64))
last_strip=None
for x in range(344):
 col=blade.crop((x,0,x+1,70));box=col.getchannel('A').point(lambda a:255 if a>80 else 0).getbbox()
 if box is None:
  if last_strip is None: continue
  col=last_strip;box=(0,0,1,col.height)
 else:
  last_strip=col.crop((0,box[1],1,box[3]))
 # Parallel edges for most of the blade, then both edges taper to one point.
 half=11 if x<255 else max(1,round(11*(343-x)/88))
 strip=col.crop((0,box[1],1,box[3])).resize((1,half*2),Image.Resampling.BICUBIC)
 strip.putalpha(255)
 rectified.alpha_composite(strip,(x,32-half))
# Central ridge and two equal-width edges, confined to the rectified surface.
pixels=np.array(rectified)
for x in range(344):
 ys=np.where(pixels[:,x,3]>0)[0]
 if len(ys)==0:continue
 for y in [ys[0],ys[-1],31,32]:
  if pixels[y,x,3]:pixels[y,x,:3]=np.maximum(pixels[y,x,:3],[180,226,244])
rectified=Image.fromarray(pixels)
canvas.alpha_composite(rectified,(156,16))
h=size(h,168,88)
# Mirror the upper half around the same axis so the guard reads as a crossguard.
half=h.crop((0,0,168,44));sym=Image.new('RGBA',(168,88));sym.alpha_composite(half,(0,0));sym.alpha_composite(ImageOps.flip(half),(0,44))
h=sym;alpha=h.getchannel('A');h=ImageEnhance.Brightness(h).enhance(.78);h.putalpha(alpha)
canvas.alpha_composite(h,(8,4))
# A modest alpha-based dark outline keeps the silhouette separate from the glow.
a=canvas.getchannel('A');edge=a.filter(ImageFilter.MaxFilter(5));outline=Image.new('RGBA',canvas.size,(24,63,86));outline.putalpha(edge);outline.alpha_composite(canvas)
result=outline.convert('RGBa').resize((128,24),Image.Resampling.LANCZOS).convert('RGBA')
out=ROOT/'cocos-pilot/assets/survivor/sword-projectile-s1.png';result.save(out)
board=Image.new('RGBA',(600,160),(34,65,57,255));board.alpha_composite(result.resize((512,96)),(30,12));board.alpha_composite(result.resize((80,24),Image.Resampling.LANCZOS),(30,123));board.convert('RGB').save(ROOT/'tools/art/sword-fx/refined-review.png')
(ROOT/'tools/art/sword-fx/refined-report.json').write_text(json.dumps({'sources':['v6-silver-reference/reference-cutout.png','v7-hover-master/hover-cutout.png'],'method':'Reference pixels rectified into symmetric double edges, straight center ridge and centered point; full grip and mirrored guard. No new generated art.','texture':[128,24],'display':[80,24]},indent=2)+'\n')

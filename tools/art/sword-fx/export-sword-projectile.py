# Historical initial export. Current asset: run refine-sword-silhouette.py instead.
"""Crop approved silver-reference source pixels into a slim projectile; no image generation.
The guard crop excludes the gripping hand; the full visible blade remains.
"""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFilter
import numpy as np,json,uuid,hashlib
ROOT=Path(__file__).resolve().parents[3]
SRC=ROOT/'design/xianxia-character-2026-10-26/v6-silver-reference/reference-cutout.png'
OUT=ROOT/'cocos-pilot/assets/survivor/sword-projectile-s1.png'
im=Image.open(SRC).convert('RGBA')
pts=[(x*4,y*4) for x,y in [(118,367),(124,370),(133,365),(132,373),(144,376),(135,383),(140,392),(129,389),(124,397),(120,389),(16,548),(2,558),(4,545),(114,387),(103,380),(114,379),(111,368)]]
mask=Image.new('L',im.size);ImageDraw.Draw(mask).polygon(pts,fill=255);a=np.array(im);a[:,:,3]=np.minimum(a[:,:,3],np.array(mask.filter(ImageFilter.GaussianBlur(.5))))
im=Image.fromarray(a).crop((0,1440,584,2240))
# Pillow RGBa ensures rotation and filtering operate in premultiplied alpha.
pm=im.convert('RGBa').rotate(123.6,Image.Resampling.BICUBIC,expand=True)
pm=pm.crop(pm.getbbox());pm.thumbnail((124,22),Image.Resampling.LANCZOS)
canvas=Image.new('RGBa',(128,24));canvas.paste(pm,((128-pm.width)//2,(24-pm.height)//2))
result=canvas.convert('RGBA');result.save(OUT,optimize=True)
meta=json.loads((OUT.parent/'sword-hover-v7.png.meta').read_text());old=meta['uuid'];new=str(uuid.uuid4())
path=Path(str(OUT)+'.meta')
if not path.exists():path.write_text(json.dumps(meta,indent=2).replace(old,new).replace('sword-hover-v7','sword-projectile-s1')+'\n')
report={'source':str(SRC.relative_to(ROOT)),'sourceSha256':hashlib.sha256(SRC.read_bytes()).hexdigest(),'output':str(OUT.relative_to(ROOT)),'size':[128,24],'displaySize':[64,12],'direction':'+X','method':'Original sword pixels; isolated visible blade and guard, excluding gripping hand; rotated; premultiplied alpha resampling. No generated art.','limitations':'Grip omitted to exclude the hand; miniature projectile derivative, not a replacement for approved master.'}
(Path(__file__).parent/'export-report.json').write_text(json.dumps(report,indent=2)+'\n')
b=Image.new('RGBA',(384,96),(24,34,48,255));b.alpha_composite(result,(12,10));b.alpha_composite(result.resize((64,12),Image.Resampling.LANCZOS),(12,60));b.convert('RGB').save('/tmp/sword-projectile-s1-review.png')

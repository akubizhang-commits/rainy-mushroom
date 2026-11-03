"""Prepare small local review copies; never modify or upload source artwork.
Usage: bundled-python scripts/art/prepare_review.py /absolute/source.png
"""
import argparse,hashlib,json
from pathlib import Path
from PIL import Image,ImageOps

def prepare(source,root):
 source=source.expanduser().resolve();digest=hashlib.sha256(source.read_bytes()).hexdigest()
 folder=root/(source.stem+'-'+digest[:10]);folder.mkdir(parents=True,exist_ok=True)
 with Image.open(source) as im:
  original_size=im.size;original_mode=im.mode
  rgba=ImageOps.exif_transpose(im).convert('RGBA')
  # Explicit matte preserves visibility of alpha edges; source remains authoritative.
  rgb=Image.new('RGBA',rgba.size,'#52605f');rgb.alpha_composite(rgba);rgb=rgb.convert('RGB')
 records=[]
 for name,edge in [('review.jpg',1280),('thumbnail.jpg',512)]:
  out=folder/name;copy=rgb.copy();copy.thumbnail((edge,edge),Image.Resampling.LANCZOS)
  for quality in [90,82,74,65]:
   copy.save(out,'JPEG',quality=quality,optimize=True)
   if out.stat().st_size<=600_000:break
  while out.stat().st_size>600_000:
   copy.thumbnail((max(1,int(copy.width*.8)),max(1,int(copy.height*.8))),Image.Resampling.LANCZOS)
   copy.save(out,'JPEG',quality=65,optimize=True)
  with Image.open(out) as check:check.verify()
  records.append({'path':str(out.resolve()),'dimensions':list(copy.size),'bytes':out.stat().st_size})
 assert hashlib.sha256(source.read_bytes()).hexdigest()==digest,'source changed'
 result={'source':str(source),'sourceSHA256':digest,'sourceBytes':source.stat().st_size,'sourceDimensions':list(original_size),'sourceMode':original_mode,'sourceUnchanged':True,'previewOnly':True,'uploaded':False,'files':records}
 (folder/'manifest.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
 return result
if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('source',type=Path);p.add_argument('--output',type=Path,default=Path(__file__).resolve().parents[2]/'reports'/'art-intake');a=p.parse_args();print(json.dumps(prepare(a.source,a.output),ensure_ascii=False,indent=2))

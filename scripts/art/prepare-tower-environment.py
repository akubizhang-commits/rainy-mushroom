"""Prepare approved local sources; never alter the originals."""
from pathlib import Path
from PIL import Image, ImageDraw
root=Path(__file__).resolve().parents[2]
out=root/'cocos-pilot/assets/resources/tower-environment'
out.mkdir(parents=True,exist_ok=True)
src=Path.home()/'Downloads'
floor=Image.open(src/'无缝苔痕青灰石板路-1.png').convert('RGB')
# Bake the world-aligned floor and exact hex clipping once, not every frame.
tile=floor.resize((630,630),Image.Resampling.LANCZOS)
canvas=Image.new('RGBA',(1890,2160))
for y in range(0,2160,630):
 for x in range(0,1890,630):canvas.paste(tile,(x,y))
mask=Image.new('L',canvas.size);ImageDraw.Draw(mask).polygon([(945,0),(1890,540),(1890,1620),(945,2160),(0,1620),(0,540)],fill=255)
canvas.putalpha(mask);canvas.save(out/'tower_floor_stone.png',optimize=True)
p=Image.open(src/'青铜纹饰苔痕六角石坛.png').convert('RGBA')
a=p.getchannel('A').point(lambda v:0 if v<16 else v);p.putalpha(a)
p=p.crop(a.getbbox());p.thumbnail((512,640),Image.Resampling.LANCZOS)
p.save(out/'tower_obstacle_pillar.png',optimize=True)
m=Image.open(src/'透明紫灰烟雾漩涡.png').convert('RGBA');m.thumbnail((512,512),Image.Resampling.LANCZOS)
m.save(out/'tower_spawn_mist.png',optimize=True)
print([(f.name,Image.open(f).size) for f in out.glob('*.png')])

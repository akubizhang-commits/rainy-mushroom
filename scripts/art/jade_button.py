"""Deterministic jade UI material; not an inventory item icon."""
from pathlib import Path
from math import sin, cos, sqrt, exp, atan2
from PIL import Image, ImageDraw
ROOT = Path(__file__).resolve().parents[2]
SIZE = 512
image = Image.new('RGBA', (SIZE, SIZE))
for py in range(SIZE):
    for px in range(SIZE):
        x, y = (px + .5 - SIZE/2)/(SIZE*.48), (py + .5 - SIZE/2)/(SIZE*.48)
        r = sqrt(x*x+y*y)
        if r >= 1: continue
        angle = atan2(y,x)
        # Broad cloudy inclusions, never high-contrast cracks through the label.
        cloud = (sin(x*5+y*3+sin(y*4)) + sin(y*8-x*3+cos(x*7))*.5)/1.5
        vein = exp(-((sin(x*5+y*4+.6*sin(y*9)))/.16)**2)
        sheen = exp(-((x+.32)**2/.25+(y+.40)**2/.20))
        rim = exp(-((r-.955)/.024)**2)
        bevel = exp(-((r-.91)/.045)**2)
        direction = (-x-y)/max(.05,r)/sqrt(2)
        light = 10*cloud + 24*sheen - 4*vein + rim*(18+10*direction) + bevel*direction*15
        # Slight dark inner edge gives a rounded polished lip without a black outline.
        edge = exp(-((r-.995)/.014)**2)*22
        rgb = [min(255,max(0,round(c+light-edge))) for c in (192,207,183)]
        alpha = round(255*min(1,(1-r)*SIZE*.48))
        image.putpixel((px,py), (*rgb,alpha))
# Delicate engraved diamonds at the poles, away from the text area.
draw = ImageDraw.Draw(image)
for y in (82,430):
    draw.line([(249,y),(256,y-6),(263,y),(256,y+6),(249,y)],fill=(237,241,218,160),width=2)
source=ROOT/'design/xianxia-jade-ui/v1/jade-disc-source.png'
source.parent.mkdir(parents=True,exist_ok=True)
image.save(source)
runtime=ROOT/'cocos-pilot/assets/resources/tower-ui/jade-disc.png'
runtime.parent.mkdir(parents=True,exist_ok=True)
image.resize((256,256),Image.Resampling.LANCZOS).save(runtime)
print('Saved 512px source and 256px RGBA runtime jade disc')

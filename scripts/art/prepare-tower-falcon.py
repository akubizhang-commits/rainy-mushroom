"""Prepare the existing falcon illustration for tower cards/combat, without generation."""
from collections import deque
from hashlib import sha256
from pathlib import Path
import json
from PIL import Image, ImageFilter

root = Path(__file__).resolve().parents[2]
source = root / 'design/xianxia-monster-pack-2026-10-28/falcon.png'
output = root / 'cocos-pilot/assets/resources/tower-monsters/falcon.png'
proof = root / 'docs/xianxia/reports/tower-falcon-ape-2026-10-29'
proof.mkdir(parents=True, exist_ok=True)
image = Image.open(source).convert('RGB')
w, h = image.size
pixels = image.load()
corners = [pixels[x, y] for x, y in [(5, 5), (w-6, 5), (5, h-6), (w-6, h-6)]]
background = tuple(sorted(c[i] for c in corners)[2] for i in range(3))
visited = bytearray(w*h)
queue = deque([x for x in range(w)] + [(h-1)*w+x for x in range(w)] +
              [y*w for y in range(h)] + [y*w+w-1 for y in range(h)])
while queue:
    k = queue.popleft()
    if visited[k]:
        continue
    x, y = k % w, k // w
    if max(abs(pixels[x,y][i]-background[i]) for i in range(3)) > 52:
        continue
    visited[k] = 1
    if x: queue.append(k-1)
    if x < w-1: queue.append(k+1)
    if y: queue.append(k-w)
    if y < h-1: queue.append(k+w)
mask = Image.frombytes('L', (w,h), bytes(0 if flag else 255 for flag in visited))
mask = mask.filter(ImageFilter.GaussianBlur(.45))
box = mask.getbbox()
assert box and all([box[0] > 0, box[1] > 0, box[2] < w, box[3] < h]), 'Inspect clipped wings'
rgba = image.convert('RGBA')
rgba.putalpha(mask)
rgba = rgba.crop(box)
rgba.thumbnail((232,232), Image.Resampling.LANCZOS)
tile = Image.new('RGBA', (256,256))
tile.alpha_composite(rgba, ((256-rgba.width)//2, (256-rgba.height)//2))
tile.save(output)
preview = Image.new('RGBA', (256,256), '#243c37')
preview.alpha_composite(tile)
preview.convert('RGB').save(proof / 'falcon-matte-check.png')
(proof / 'falcon-source.json').write_text(json.dumps({
    'source': str(source.relative_to(root)), 'source_sha256': sha256(source.read_bytes()).hexdigest(),
    'output': str(output.relative_to(root)), 'output_sha256': sha256(output.read_bytes()).hexdigest(),
    'method': 'Exterior-connected paper matte, max RGB difference 52, 0.45px feather, fit within 232px',
    'source_crop': box, 'size': tile.size, 'alpha_bbox': tile.getchannel('A').getbbox(),
}, indent=2)+'\n')
print('Prepared falcon:', output)

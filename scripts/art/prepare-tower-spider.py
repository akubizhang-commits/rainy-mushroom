"""Extract the approved spider's paper matte, preserving the original source."""
from pathlib import Path
from collections import deque
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
source = ROOT / "design/xianxia-monster-pack-2026-10-28/spider.png"
target = ROOT / "cocos-pilot/assets/resources/tower-monsters/spider.png"
image = Image.open(source).convert("RGBA")
w, h = image.size
pixels = image.load()
removed = bytearray(w * h)
queue = deque()
for x in range(w):
    queue.extend((x, (h - 1) * w + x))
for y in range(h):
    queue.extend((y * w, y * w + w - 1))
# The bent rear leg encloses a paper island disconnected from the outer matte.
queue.append(int(.35 * h) * w + int(.43 * w))
while queue:
    index = queue.popleft()
    if removed[index]:
        continue
    x, y = index % w, index // w
    r, g, b, _ = pixels[x, y]
    # Exterior paper and its pale baked shadows; retain darker fur and markings.
    if min(r, g, b) < 155 or max(r, g, b) - min(r, g, b) > 65:
        continue
    removed[index] = 1
    if x:
        queue.append(index - 1)
    if x < w - 1:
        queue.append(index + 1)
    if y:
        queue.append(index - w)
    if y < h - 1:
        queue.append(index + w)
alpha = Image.frombytes("L", image.size, bytes(0 if v else 255 for v in removed))
image.putalpha(alpha.filter(ImageFilter.GaussianBlur(.45)))
# Keep the source canvas and anchor so both portraits and combat retain their scale.
image.save(target)
assert image.getchannel("A").getextrema() == (0, 255)
assert all(image.getpixel(p)[3] == 0 for p in ((0, 0), (w-1, 0), (0, h-1), (w-1, h-1)))
print(f"Prepared transparent spider: {image.size}")

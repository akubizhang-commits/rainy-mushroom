# Fill enclosed green-background holes in a green-screen reference (white-tiger 11-07 lesson).
# Green pixels not connected to the canvas border are holes; they and a 6px rim of green-tinted pixels
# are repainted by iterative neighbour averaging from surrounding subject pixels.
# usage: fill_green.py <in.png> <out.png> <marked.png>
import sys
from PIL import Image
import numpy as np
src, out, marked = sys.argv[1:4]
img = np.asarray(Image.open(src).convert('RGB')).astype(float)
ex = img[:, :, 1] - np.maximum(img[:, :, 0], img[:, :, 2])
bg = ex > 60
ext = np.zeros_like(bg); ext[0, :] = bg[0, :]; ext[-1, :] = bg[-1, :]; ext[:, 0] = bg[:, 0]; ext[:, -1] = bg[:, -1]
while True:
    g = ext.copy(); g[1:] |= ext[:-1]; g[:-1] |= ext[1:]; g[:, 1:] |= ext[:, :-1]; g[:, :-1] |= ext[:, 1:]; g &= bg
    if (g == ext).all(): break
    ext = g
hole = bg & ~ext
# Keep large enclosed gaps (e.g. between arm and body: real background). Fill only components < 1800 px.
from collections import deque
lab = np.zeros(hole.shape, int); small = np.zeros_like(hole); h, w = hole.shape; n = 0; sizes = []
for y, x in zip(*np.nonzero(hole)):
    if lab[y, x]: continue
    n += 1; q = deque([(y, x)]); lab[y, x] = n; comp = []
    while q:
        cy, cx = q.popleft(); comp.append((cy, cx))
        for ny, nx in ((cy+1, cx), (cy-1, cx), (cy, cx+1), (cy, cx-1)):
            if 0 <= ny < h and 0 <= nx < w and hole[ny, nx] and not lab[ny, nx]: lab[ny, nx] = n; q.append((ny, nx))
    sizes.append(len(comp))
    if len(comp) < 1800:
        for cy, cx in comp: small[cy, cx] = True
print('components', sorted(sizes, reverse=True)[:6], flush=True)
ext = ext | (hole & ~small); hole = small
zone = hole.copy()
for _ in range(6):
    g = zone.copy(); g[1:] |= zone[:-1]; g[:-1] |= zone[1:]; g[:, 1:] |= zone[:, :-1]; g[:, :-1] |= zone[:, 1:]; zone = g
H = hole | (zone & (ex > 12) & ~ext)
print(src, 'hole px', int(hole.sum()), 'repainted', int(H.sum()), flush=True)
m = img.copy(); m[hole] = [255, 0, 0]; Image.fromarray(m.astype('uint8')).save(marked)
known = ~H & ~ext; col = img * known[..., None]; todo = H.copy()
while todo.any():
    acc = np.zeros_like(img); cnt = np.zeros(img.shape[:2])
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
        k = np.roll(known, (dy, dx), (0, 1)); acc += np.roll(col, (dy, dx), (0, 1)) * k[..., None]; cnt += k
    new = todo & (cnt > 0)
    if not new.any(): break
    col[new] = acc[new] / cnt[new][:, None]; known |= new; todo &= ~new
res = img.copy(); res[H] = col[H]
Image.fromarray(res.clip(0, 255).astype('uint8')).save(out)

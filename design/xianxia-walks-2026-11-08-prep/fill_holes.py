# Fill interior low-alpha holes in the green references with the colour of surrounding opaque pixels
# (iterative neighbour averaging, growing inward), like the white-tiger v2 fix on 11-07.
# Unfilled versions stay as <fam>-reference-green-holes.png.
from PIL import Image
import numpy as np, json, shutil
from pathlib import Path
info = json.load(open('references.json'))
for fam, v in info.items():
    if not v.get('interiorHolePx'): continue
    a = np.asarray(Image.open('../' + v['source']).getchannel('A'))
    low = a < 128; ext = np.zeros_like(low)
    ext[0, :] = low[0, :]; ext[-1, :] = low[-1, :]; ext[:, 0] = low[:, 0]; ext[:, -1] = low[:, -1]
    while True:
        g = ext.copy(); g[1:] |= ext[:-1]; g[:-1] |= ext[1:]; g[:, 1:] |= ext[:, :-1]; g[:, :-1] |= ext[:, 1:]; g &= low
        if (g == ext).all(): break
        ext = g
    hole = low & ~ext
    # grow by 6px and also repaint the rim that is semi-transparent or green-tinted after compositing on green
    ox0, oy0 = v['placed'][0] - v['bbox'][0], v['placed'][1] - v['bbox'][1]
    comp = np.asarray(Image.open(f'{fam}-reference-green-holes.png' if Path(f'{fam}-reference-green-holes.png').exists() else f'{fam}-reference-green.png').convert('RGB')).astype(int)
    comp = np.roll(comp, (-oy0, -ox0), (0, 1))  # into source coordinates
    greenish = (comp[:, :, 1] - np.maximum(comp[:, :, 0], comp[:, :, 2])) > 12
    zone = hole.copy()
    for _ in range(6):
        g = zone.copy(); g[1:] |= zone[:-1]; g[:-1] |= zone[1:]; g[:, 1:] |= zone[:, :-1]; g[:, :-1] |= zone[:, 1:]; zone = g
    hole = hole | (zone & ((a < 250) | greenish))
    src = Path(f'{fam}-reference-green.png'); keep = Path(f'{fam}-reference-green-holes.png')
    if not keep.exists(): shutil.copy(src, keep)
    img = np.asarray(Image.open(keep).convert('RGB')).astype(float)
    ox, oy = v['placed'][0] - v['bbox'][0], v['placed'][1] - v['bbox'][1]
    H = np.zeros((1024, 1024), bool); ys, xs = np.nonzero(hole); H[ys + oy, xs + ox] = True
    known = ~H; col = img * known[..., None]
    while H.any():
        acc = np.zeros_like(img); cnt = np.zeros((1024, 1024))
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
            k = np.roll(known, (dy, dx), (0, 1)); c = np.roll(col, (dy, dx), (0, 1))
            acc += c * k[..., None]; cnt += k
        new = H & (cnt > 0)
        col[new] = acc[new] / cnt[new][:, None]; known |= new; H &= ~new
    Image.fromarray(col.clip(0, 255).astype('uint8')).save(src)
    v['filled'] = True; v['filledPx'] = int(hole.sum())
    print(fam, 'filled', int(hole.sum()), flush=True)
json.dump(info, open('references.json', 'w'), indent=2)

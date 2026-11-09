# Find interior low-alpha holes (alpha<128 not connected to the canvas border) in each reference.
# Green showing through such holes tinted the white-tiger hair on 11-07, so holes must be filled before upload.
from PIL import Image
import numpy as np, json
info = json.load(open('references.json'))
for fam, v in info.items():
    a = np.asarray(Image.open('../' + v['source']).getchannel('A'))
    low = a < 128
    ext = np.zeros_like(low)
    ext[0, :] = low[0, :]; ext[-1, :] = low[-1, :]; ext[:, 0] = low[:, 0]; ext[:, -1] = low[:, -1]
    while True:
        g = ext.copy()
        g[1:] |= ext[:-1]; g[:-1] |= ext[1:]; g[:, 1:] |= ext[:, :-1]; g[:, :-1] |= ext[:, 1:]
        g &= low
        if (g == ext).all(): break
        ext = g
    h = low & ~ext
    ys, xs = np.nonzero(h); n = int(h.sum())
    cells = h.reshape(128, 8, 128, 8).sum(axis=(1, 3)); big = int((cells >= 20).sum())
    print(fam, 'hole px', n, 'cells>=20px', big, (int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())) if n else '', flush=True)
    v['interiorHolePx'] = n; v['holeCells8px'] = big
    if n:
        d = np.asarray(Image.open(f'{fam}-reference-green.png').convert('RGB')).copy()
        ox, oy = v['placed'][0] - v['bbox'][0], v['placed'][1] - v['bbox'][1]
        yy, xx = ys + oy, xs + ox; ok = (yy < 1024) & (xx < 1024) & (yy >= 0) & (xx >= 0)
        d[yy[ok], xx[ok]] = [255, 0, 0]
        Image.fromarray(d).save(f'{fam}-holes.png')
json.dump(info, open('references.json', 'w'), indent=2)

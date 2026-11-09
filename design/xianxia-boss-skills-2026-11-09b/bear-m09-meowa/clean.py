# Meowa added dark dirt clods and ground cracks despite the prompt. They are near-black, the bear has no such tone
# on its outer edge, so: key green, drop near-black regions that touch the background, then keep only the largest
# alpha component (plus large attached pieces). Writes clean-frames/NNN.png (RGBA) and clean-preview.png.
from pathlib import Path
from PIL import Image, ImageFilter
import numpy as np, sys
HERE = Path(__file__).resolve().parent
GROUND = .80
def dil(m, k=1):
    for _ in range(k):
        p = np.pad(m, 1); m = p[1:-1, 1:-1].copy()
        for dy in (0, 1, 2):
            for dx in (0, 1, 2): m |= p[dy:dy + m.shape[0], dx:dx + m.shape[1]]
    return m
def reconstruct(seed, mask):
    seed = seed & mask
    while True:
        nxt = dil(seed) & mask
        if (nxt == seed).all(): return seed
        seed = nxt
def key(path):
    a = np.array(Image.open(path).convert('RGB')).astype(float)
    ex = a[:, :, 1] - np.maximum(a[:, :, 0], a[:, :, 2]); al = np.clip((55 - ex) / 35, 0, 1) * 255
    a[:, :, 1] = np.minimum(a[:, :, 1], np.maximum(a[:, :, 0], a[:, :, 2]))
    al = np.array(Image.fromarray(al.astype('uint8')).filter(ImageFilter.MinFilter(3))).astype(float)
    return a, al
def clean(path, dark_max=58):
    rgb, al = key(path); orig = np.array(Image.open(path).convert('RGB')).astype(float)
    solid = al >= 32
    # Debris is red-black with almost no green (crack mean 16/2/5, G/R .15); the darkest bear fur is 21/13/13 (G/R .59).
    R, G, mx = orig[:, :, 0], orig[:, :, 1], orig.max(axis=2)
    dark = solid & (mx < dark_max) & (G < .4 * R + 1)
    dark = reconstruct(dark & dil(~solid, 3), dark) | (dark & (G < .25 * R + 1))
    removed = dil(dark, 2) & (mx < dark_max + 15) & (G < .55 * R + 2) | dark
    al[removed] = 0
    solid = al >= 32
    h, w = solid.shape; seed = np.zeros_like(solid); seed[int(h * .4):int(h * .7), int(w * .35):int(w * .65)] = True
    keep = dil(reconstruct(seed, solid), 2)  # the body grows from the torso box; detached clods drop out
    al[~keep] = 0
    im = Image.fromarray(rgb.astype('uint8')).convert('RGBA'); im.putalpha(Image.fromarray(al.astype('uint8')))
    return im, int(removed.sum())
if __name__ == '__main__':
    out = HERE / 'clean-frames'; out.mkdir(exist_ok=True); raw = sorted((HERE / 'raw-frames').glob('*.png')); log = []
    for p in raw:
        im, r = clean(p); im.save(out / p.name); log.append((p.name, r))
    ids = [int(a) for a in sys.argv[1:]] or [16, 22, 28, 31, 34, 37, 40, 46, 52, 58, 64, 70]
    sheet = Image.new('RGBA', (320 * 6, 320 * ((len(ids) + 5) // 6)), '#253632')
    for n, i in enumerate(ids):
        t = Image.open(out / f'{i:03d}.png').resize((320, 320), Image.LANCZOS); sheet.alpha_composite(t, (n % 6 * 320, n // 6 * 320))
    sheet.convert('RGB').save(HERE / 'clean-preview.png')
    print([l for l in log if l[1]][:80])

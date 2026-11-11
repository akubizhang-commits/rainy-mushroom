# Tiger M07 source added dark rocks and ground cracks after impact (frames ~55-84) despite the prompt.
# Rocks are detached pieces: keep only the alpha component grown from the torso box. Cracks touch the feet:
# inside the ground band (below 84% height) drop dark, low-saturation pixels; the tiger's feet there are white fur.
from pathlib import Path
from PIL import Image, ImageFilter
import numpy as np
HERE = Path(__file__).resolve().parent; SRC = HERE / 'tiger-humanoid-m07'
def dil(m, k=1):
    for _ in range(k):
        p = np.pad(m, 1); m = p[1:-1, 1:-1].copy()
        for dy in (0, 1, 2):
            for dx in (0, 1, 2): m |= p[dy:dy + m.shape[0], dx:dx + m.shape[1]]
    return m
def reconstruct(seed, mask):
    seed = seed & mask
    while True:
        nxt = dil(seed, 3) & mask
        if (nxt == seed).all(): return seed
        seed = nxt
def key_clean(path, ground=.84, dark=80):
    a = np.array(Image.open(path).convert('RGB')).astype(float); orig = a.copy()
    ex = a[:, :, 1] - np.maximum(a[:, :, 0], a[:, :, 2]); al = np.clip((55 - ex) / 35, 0, 1) * 255
    a[:, :, 1] = np.minimum(a[:, :, 1], np.maximum(a[:, :, 0], a[:, :, 2]))
    al = np.array(Image.fromarray(al.astype('uint8')).filter(ImageFilter.MinFilter(3))).astype(float)
    h, w = al.shape; band = np.zeros((h, w), bool); band[int(h * ground):] = True
    crack = band & (orig.max(axis=2) < dark); crack = dil(crack, 1) & band & (orig.max(axis=2) < dark + 30) | crack
    al[crack] = 0
    solid = al >= 32; seed = np.zeros_like(solid); seed[int(h * .35):int(h * .6), int(w * .4):int(w * .6)] = True
    keep = dil(reconstruct(seed, solid), 2); al[~keep] = 0
    im = Image.fromarray(a.astype('uint8')).convert('RGBA'); im.putalpha(Image.fromarray(al.astype('uint8'))); return im
if __name__ == '__main__':
    out = SRC / 'clean-frames'; out.mkdir(exist_ok=True)
    for p in sorted((SRC / 'raw-frames').glob('*.png')): key_clean(p).save(out / p.name)
    ids = [1, 44, 51, 53, 55, 57, 60, 64, 70, 78, 86, 100]
    sheet = Image.new('RGBA', (240 * 6, 480), '#253632')
    for n, i in enumerate(ids): sheet.alpha_composite(Image.open(out / f'{i:03d}.png').resize((240, 240), Image.LANCZOS), (n % 6 * 240, n // 6 * 240))
    sheet.convert('RGB').save(HERE / 'clean-tiger-preview.png')

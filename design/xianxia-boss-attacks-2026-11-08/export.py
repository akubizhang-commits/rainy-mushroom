# 2026-11-08 rhino sweep and yak slam from Scenario P-Video 2 Pro (480px, 124 frames). Adapted from the boar bite export.
# usage: export.py rhino|yak
# 20-frame bite (9/3/8). One fixed scale/offset: source frame-0 subject matches the runtime walk move-000 subject
# height, bbox centre x and feet. If the lunge overflows the 480 cell, the clip is fitted inside 8..472 and a shared
# displayScale/anchor restores size and ground point. Walk frames are copied byte-identically; atlas becomes 2880².
from pathlib import Path
from PIL import Image, ImageFilter
import numpy as np, json, hashlib, sys
ROOT = Path(__file__).resolve().parents[2]; RES = ROOT / 'cocos-pilot/assets/resources/tower-monsters-motion'; OUT = Path(__file__).resolve().parent
FAM = sys.argv[1]; CFG = {'rhino': ('sweep', {'windup': (20, 40), 'active': (40, 50), 'recovery': (50, 96)}), 'yak': ('slam', {'windup': (16, 52), 'active': (52, 60), 'recovery': (60, 96)})}
OUT = OUT / FAM; SRC = OUT / 'raw-frames'; CLIP = CFG[FAM][0]; NAME = f'{FAM}-v1'
COUNTS = {'windup': 9, 'active': 3, 'recovery': 8}; WIN = CFG[FAM][1]
def key(path):
    a = np.array(Image.open(path).convert('RGB')).astype(float)
    ex = a[:, :, 1] - np.maximum(a[:, :, 0], a[:, :, 2]); al = np.clip((55 - ex) / 35, 0, 1) * 255
    a[:, :, 1] = np.minimum(a[:, :, 1], np.maximum(a[:, :, 0], a[:, :, 2]))
    im = Image.fromarray(a.astype('uint8')).convert('RGBA'); im.putalpha(Image.fromarray(al.astype('uint8')).filter(ImageFilter.MinFilter(3))); return im
box = lambda im: im.getchannel('A').point(lambda v: 255 if v >= 32 else 0).getbbox()
meta = json.loads((RES / f'{NAME}.json').read_text()); old = Image.open(RES / f'{NAME}.png').convert('RGBA')
# keep a pristine copy of the walk-only runtime files on first run
for ext in ('png', 'json'):
    keep = OUT / f'runtime-before.{ext}'
    if not keep.exists(): keep.write_bytes((RES / f'{NAME}.{ext}').read_bytes())
meta = json.loads((OUT / 'runtime-before.json').read_text()); old = Image.open(OUT / 'runtime-before.png').convert('RGBA')
move = meta['clips']['move']['frames']; cells = []
for k in move:
    r = meta['frames'][k]; cells.append((k, old.crop((r['x'], r['y'], r['x'] + r['w'], r['y'] + r['h'])), {kk: v for kk, v in r.items() if kk not in 'xywh'}))
movehash = {k: hashlib.sha256(f.tobytes()).hexdigest() for k, f, _ in cells}
wb = box(cells[0][1]); sb = box(key(SRC / '001.png'))
s = (wb[3] - wb[1]) / (sb[3] - sb[1]); ox = (wb[0] + wb[2]) / 2 - (sb[0] + sb[2]) / 2 * s; oy = wb[3] - sb[3] * s
ids = []; phases = {}; n = 0
for ph in ('windup', 'active', 'recovery'):
    a, b = WIN[ph]; c = COUNTS[ph]; phases[ph] = [n, c]
    for i in range(c): ids.append(a + round(i * (b - a) / c)); n += 1
keyed = [key(SRC / f'{i + 1:03}.png') for i in ids]; bs = [box(k) for k in keyed]
ux0, uy0, ux1, uy1 = min(b[0] for b in bs), min(b[1] for b in bs), max(b[2] for b in bs), max(b[3] for b in bs)
fits = ux0 * s + ox >= 8 and ux1 * s + ox <= 472 and uy0 * s + oy >= 8 and uy1 * s + oy <= 472
extra = {}
if not fits:
    s2 = min(s, 464 / (ux1 - ux0), 464 / (uy1 - uy0)); ox2 = 8 - ux0 * s2; oy2 = 472 - uy1 * s2
    ax, ay = meta['anchor']; gx, gy = ax * 480, ay * 480  # walk ground point in the cell
    px, py = (gx - ox) / s, (gy - oy) / s                  # same point in source coords
    extra = dict(displayScale=round(s / s2, 4), anchor=[round((ox2 + px * s2) / 480, 4), round((oy2 + py * s2) / 480, 4)])
    s, ox, oy = s2, ox2, oy2
size = round(480 * s); edge = []
for n, im in enumerate(keyed):
    f = Image.new('RGBA', (480, 480)); sc = im.resize((size, size), Image.Resampling.LANCZOS); f.paste(sc, (round(ox), round(oy)), sc)
    bb = box(f)
    if bb[0] == 0 or bb[1] == 0 or bb[2] >= 479 or bb[3] >= 479: edge.append(f'{CLIP}-{n:03}')
    kname = f'{CLIP}-{n:03}'; f.save(OUT / 'final' / f'{kname}.png') if (OUT / 'final').exists() else ((OUT / 'final').mkdir(), f.save(OUT / 'final' / f'{kname}.png')); cells.append((kname, f, extra))
atlas = Image.new('RGBA', (2880, 2880)); frames = {}
for i, (k, f, ex) in enumerate(cells):
    x, y = i % 6 * 480, i // 6 * 480; atlas.alpha_composite(f, (x, y)); frames[k] = dict(x=x, y=y, w=f.width, h=f.height, **ex)
o = OUT / 'final'; atlas.save(o / f'{NAME}.png'); meta.update(width=2880, height=2880, frames=frames)
meta['clips'][CLIP] = dict(frames=[k for k, _, _ in cells if k.startswith(CLIP + '-')], fps=10, loop=False, phases=phases)
meta['sourceSha256'] = hashlib.sha256((o / f'{NAME}.png').read_bytes()).hexdigest(); (o / f'{NAME}.json').write_text(json.dumps(meta, indent=2) + '\n')
prev = []
for k, f, _ in cells[len(move):]:
    bg = Image.new('RGBA', (360, 300), '#253632'); bg.alpha_composite(f.resize((260, 260), Image.LANCZOS), (50, 20)); prev.append(bg.convert('RGB'))
prev[0].save(o / f'{FAM}-{CLIP}.gif', save_all=True, append_images=prev[1:], duration=[110] * 9 + [60] * 3 + [110] * 8 + [400], loop=0)
sheet = Image.new('RGBA', (10 * 240, 3 * 240), '#253632')
for i, (k, f, _) in enumerate([cells[0]] + cells[len(move):]):
    t = f.resize((240, 240), Image.LANCZOS); sheet.alpha_composite(t, (i % 10 * 240, i // 10 * 240))
sheet.convert('RGB').save(o / 'contact.png')
(o / 'export.json').write_text(json.dumps(dict(family=FAM, sourceIndices=ids, phases=phases, scale=s, offset=[ox, oy], edgeTouchingFrames=edge, layout=extra, movePixelHashes=movehash), indent=2) + '\n')
print('scale', round(s, 4), 'offset', (round(ox), round(oy)), 'edge', edge, 'layout', extra)

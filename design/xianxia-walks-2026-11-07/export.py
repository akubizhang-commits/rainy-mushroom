# 2026-11-07 upright walks (Scenario P-Video 2 Pro 480p/24fps/124 frames) -> 16 native 480 frames, 1920 atlas.
# One fixed scale per family (portrait subject height 0.805) and one fixed offset: frame 0 bbox centred at x=240,
# feet at y=432. No per-frame correction, so planted feet stay put.
from pathlib import Path
from PIL import Image, ImageFilter, ImageDraw
import numpy as np, json, hashlib, sys
ROOT = Path(__file__).resolve().parents[2]; OUT = Path(__file__).resolve().parent
# white-tiger v1 (raw-frames, window 29/59) rejected: green-tinted hair from reference alpha gaps; v2 uses the filled reference.
JOBS = {'white-tiger': ('xianxia-white-tiger-walk-scenario', 65, 39, 'raw-frames-v2'), 'crocodile-humanoid': ('xianxia-crocodile-humanoid-walk-scenario', 39, 43, 'raw-frames'),
        # 11-08: walk subject height follows each runtime portrait (spider-lady portrait subject is 0.6953 tall).
        'snake-lady': ('xianxia-snake-lady-walk-scenario', 26, 61, 'raw-frames'), 'spider-lady': ('xianxia-spider-lady-walk-scenario', 59, 57, 'raw-frames'),
        'bat-humanoid': ('xianxia-bat-humanoid-walk-scenario', 63, 38, 'raw-frames')}
HEIGHT = {'spider-lady': 0.6953}
N = 16
def key(p):
    a = np.array(Image.open(p).convert('RGB')).astype(float)
    ex = a[:, :, 1] - np.maximum(a[:, :, 0], a[:, :, 2]); al = np.clip((55 - ex) / 35, 0, 1) * 255
    a[:, :, 1] = np.minimum(a[:, :, 1], np.maximum(a[:, :, 0], a[:, :, 2]))
    im = Image.fromarray(a.astype('uint8')).convert('RGBA'); im.putalpha(Image.fromarray(al.astype('uint8')).filter(ImageFilter.MinFilter(3))); return im
box = lambda im: im.getchannel('A').point(lambda v: 255 if v >= 32 else 0).getbbox()
def build(fam):
    src, start, length, rawdir = JOBS[fam]; raw = ROOT / 'design' / src / rawdir; o = OUT / fam; o.mkdir(parents=True, exist_ok=True)
    ids = [start + round(i * length / N) for i in range(N)]; keyed = [key(raw / f'{i + 1:03}.png') for i in ids]
    b0 = box(keyed[0]); target = HEIGHT.get(fam, 0.805) * 480 / (b0[3] - b0[1])
    us = [box(k) for k in keyed]; ux0, uy0, ux1, uy1 = min(b[0] for b in us), min(b[1] for b in us), max(b[2] for b in us), max(b[3] for b in us)
    # Fit the union of all frames inside 8..472 when the portrait scale would overflow; displayScale restores size.
    scale = min(target, 464 / (ux1 - ux0), 424 / (uy1 - uy0)); size = round(480 * scale); layout = {}
    if scale < target:
        ox = round(8 - ux0 * scale); oy = 472 - round(uy1 * scale)
        cx = ox + (b0[0] + b0[2]) / 2 * scale; fy = oy + b0[3] * scale
        layout = dict(displayScale=round(target / scale, 4), anchor=[round(cx / 480, 4), round(fy / 480, 4)])
    else:
        ox = round(240 - (b0[0] + b0[2]) / 2 * scale); oy = 432 - round(b0[3] * scale)
    frames, edge = [], []
    for n, im in enumerate(keyed):
        s = im.resize((size, size), Image.Resampling.LANCZOS); f = Image.new('RGBA', (480, 480)); f.alpha_composite(s, (ox, oy)) if ox >= 0 and oy >= 0 else f.paste(s, (ox, oy), s)
        b = box(f)
        if b[0] == 0 or b[1] == 0 or b[2] >= 480 or b[3] >= 480: edge.append(n)
        f.save(o / f'move-{n:03}.png'); frames.append(f)
    atlas = Image.new('RGBA', (1920, 1920))
    for i, f in enumerate(frames): atlas.alpha_composite(f, (i % 4 * 480, i // 4 * 480))
    name = f'{fam}-v1'; atlas.save(o / f'{name}.png'); loop = length / 24
    meta = {'version': 2, 'width': 1920, 'height': 1920, 'facing': 'left', 'anchor': [.5, .9],
        'frames': {f'move-{i:03}': {'x': i % 4 * 480, 'y': i // 4 * 480, 'w': 480, 'h': 480, **layout} for i in range(N)},
        'clips': {'move': {'frames': [f'move-{i:03}' for i in range(N)], 'fps': N / loop, 'loop': True}},
        'damageEvents': [], 'sourceSha256': hashlib.sha256((o / f'{name}.png').read_bytes()).hexdigest()}
    (o / f'{name}.json').write_text(json.dumps(meta, indent=2) + '\n')
    prev = []
    for f in frames:
        bg = Image.new('RGBA', (320, 280), '#253632'); bg.alpha_composite(f.resize((220, 220), Image.Resampling.LANCZOS), (50, 30)); prev.append(bg.convert('RGB'))
    prev[0].save(o / f'{fam}-walk.gif', save_all=True, append_images=prev[1:], duration=round(loop * 1000 / N), loop=0)
    sh = Image.new('RGB', (4 * 240, 4 * 240), '#253632'); d = ImageDraw.Draw(sh)
    for i, f in enumerate(frames):
        t = f.resize((240, 240), Image.Resampling.LANCZOS); sh.paste(t, (i % 4 * 240, i // 4 * 240), t); d.text((i % 4 * 240 + 4, i // 4 * 240 + 4), f'{i} src{ids[i]}', fill='white')
    sh.save(o / 'contact.png')
    (o / 'export.json').write_text(json.dumps(dict(sourceIndices=ids, scale=scale, layout=layout, offset=[ox, oy], loopSeconds=loop, edgeFrames=edge), indent=2))
    print(fam, 'layout', layout, 'scale', round(scale, 4), 'offset', (ox, oy), 'loop', round(loop, 3), 'edge', edge)
for fam in sys.argv[1:] or JOBS: build(fam)

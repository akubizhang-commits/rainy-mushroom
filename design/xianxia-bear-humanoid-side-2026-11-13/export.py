# 2026-11-14 bear-humanoid side-view atlas, rebuilt from scratch from the Scenario P-Video 2 Pro side clips
# (480px / 24fps / 124 frames each, all starting and ending on reference-green.png).
# One scale and offset for every clip: source frame 0 (the shared reference pose) is matched to the old runtime
# move-000 (height 386 px, feet at y=431 of the 480 cell) and centred at x=240, so the anchor stays [0.5, 0.9].
# Cleaning: green key, greenish-white swoosh pixels removed, then only the body blob connected to the torso is kept
# (drops the rocks and the trail the model added to the slam). Slam also drops grey ground rocks touching the fist
# (low red-blue difference, below y=402, left of x=205). Slam active skips source frame 35-36 (motion smear).
# M09 heave comes from Meowa (640px / 73 frames, m09-meowa/raw-frames) and gets its own scale from its frame 1, which is the
# same reference pose. Its source frames 29-36 have the raised fist cut by the top edge, so the active phase uses 27 and 40.
# Windows are 0-based source frame indices. move and slam use 480 cells; stomp and guard use 384 cells with
# displayScale 1.25, the same layout as the old atlas.
from pathlib import Path
from PIL import Image, ImageFilter
import numpy as np, json, hashlib
ROOT = Path(__file__).resolve().parents[2]; RES = ROOT / 'cocos-pilot/assets/resources/tower-monsters-motion'; HERE = Path(__file__).resolve().parent
NAME = 'bear-humanoid-v1'; W, H, SMALL = 3840, 4096, 384
CLIPS = [  # name, source dir, windows, counts, fps, loop, big cell
    ('move', 'walk-v2', {'cycle': (48, 84)}, {'cycle': 16}, 16 / 1.5, True, True),
    ('slam', 'slam-v2', {'windup': (5, 34), 'active': (37, 43), 'recovery': (44, 104)}, {'windup': 9, 'active': 3, 'recovery': 8}, 10, False, True),
    ('stomp', 'm07-v2', {'windup': (7, 50), 'active': (51, 58), 'recovery': (59, 104)}, {'windup': 6, 'active': 2, 'recovery': 8}, 10, False, False),
    ('heave', 'm09-meowa', {'windup': [4, 9, 14, 19], 'active': [26, 39], 'recovery': [42, 46, 50, 55, 60, 66]}, None, 10, False, False),
    ('guard', 'm04-v2', {'windup': (4, 29), 'active': (30, 85), 'recovery': (88, 112)}, {'windup': 6, 'active': 2, 'recovery': 8}, 10, False, False),
]
def key(path, rocks=False):
    a = np.array(Image.open(path).convert('RGB')).astype(float)
    mx = np.maximum(a[:, :, 0], a[:, :, 2]); ex = a[:, :, 1] - mx; al = np.clip((55 - ex) / 35, 0, 1) * 255
    al[(ex > 12) & (np.minimum(a[:, :, 0], a[:, :, 2]) > 110)] = 0  # pale green trail
    a[:, :, 1] = np.minimum(a[:, :, 1], mx)
    if rocks:  # slam only: grey-purple rocks on the ground left of the feet touch the fist; fur is warm (r >> b)
        rk = (a[:, :, 0] - a[:, :, 2] < 15) & (np.maximum(a[:, :, 0], a[:, :, 2]) < 150); rk[:402] = False; rk[:, 205:] = False; wt = a.min(2) > 150; wt[:360] = False; wt[:, 120:] = False; al[rk | wt] = 0
    m = al >= 32; seed = np.zeros_like(m); u = m.shape[0] / 480; seed[int(150 * u):int(300 * u), int(190 * u):int(290 * u)] = True; seed &= m
    while True:
        g = seed.copy(); g[1:] |= seed[:-1]; g[:-1] |= seed[1:]; g[:, 1:] |= seed[:, :-1]; g[:, :-1] |= seed[:, 1:]; g &= m
        if (g == seed).all(): break
        seed = g
    keep = np.array(Image.fromarray(seed.astype('uint8') * 255).filter(ImageFilter.MaxFilter(5))) > 0
    al[~keep] = 0
    im = Image.fromarray(a.astype('uint8')).convert('RGBA'); im.putalpha(Image.fromarray(al.astype('uint8')).filter(ImageFilter.MinFilter(3))); return im
box = lambda im: im.getchannel('A').point(lambda v: 255 if v >= 32 else 0).getbbox()
def main():
    out = HERE / 'export'; out.mkdir(exist_ok=True)
    for ext in ('png', 'json'):
        keep = HERE / f'runtime-before.{ext}'
        if not keep.exists(): keep.write_bytes((RES / f'{NAME}.{ext}').read_bytes())
    old = json.loads((HERE / 'runtime-before.json').read_text())
    oa = Image.open(HERE / 'runtime-before.png').convert('RGBA'); r0 = old['frames']['move-000']
    wb = box(oa.crop((r0['x'], r0['y'], r0['x'] + r0['w'], r0['y'] + r0['h'])))
    cells = []; clips = {}; report = dict(oldMove000Box=wb, clips={})
    for name, src, win, counts, fps, loop, big in CLIPS:
        f0 = key(HERE / src / 'raw-frames/001.png'); sb = box(f0); dim = f0.width
        s = (wb[3] - wb[1]) / (sb[3] - sb[1]); ox = 240 - (sb[0] + sb[2]) / 2 * s; oy = wb[3] - sb[3] * s; size = round(dim * s)
        ids, phases, n = [], {}, 0
        for ph, w in win.items():
            pick = w if counts is None else [w[0] + round(i * (w[1] - w[0]) / counts[ph]) for i in range(counts[ph])]
            phases[ph] = [n, len(pick)]; ids += pick; n += len(pick)
        keys = []
        for j, i in enumerate(ids):
            f = Image.new('RGBA', (480, 480)); sc = key(HERE / src / f'raw-frames/{i + 1:03}.png', name == 'slam').resize((size, size), Image.Resampling.LANCZOS)
            f.paste(sc, (round(ox), round(oy)), sc); k = f'{name}-{j:03}'; f.save(out / f'{k}.png'); keys.append(k)
            cells.append((k, f if big else f.resize((SMALL, SMALL), Image.Resampling.LANCZOS), {} if big else dict(displayScale=480 / SMALL)))
        clips[name] = dict(frames=keys, fps=fps, loop=loop, **({} if 'cycle' in win else dict(phases=phases)))
        report['clips'][name] = dict(source=src, sourceFrame0Box=sb, scale=s, offset=[ox, oy], sourceIndices=ids, phases=phases)
        sheet = Image.new('RGBA', (8 * 240, -(-len(keys) // 8) * 240), '#253632')
        for j, k in enumerate(keys): sheet.alpha_composite(Image.open(out / f'{k}.png').resize((240, 240), Image.LANCZOS), (j % 8 * 240, j // 8 * 240))
        sheet.convert('RGB').save(HERE / f'contact-{name}.png')
    bigs = [c for c in cells if c[1].width == 480]; sms = [c for c in cells if c[1].width != 480]; place = {}
    for i, (k, f, _) in enumerate(bigs): place[k] = (i % 8 * 480, i // 8 * 480)
    rows = -(-len(bigs) // 8); free = [(j * 480, (rows - 1) * 480) for j in range(len(bigs) % 8, 8)] if len(bigs) % 8 else []
    y = rows * 480; per = W // SMALL; i = 0
    for k, f, _ in sms:
        if free: place[k] = free.pop(0); continue
        place[k] = (i % per * SMALL, y + i // per * SMALL); i += 1
    height = max(place[k][1] + f.height for k, f, _ in cells); assert height <= H, height
    rects = [(place[k][0], place[k][1], place[k][0] + f.width, place[k][1] + f.height) for k, f, _ in cells]
    for i, r in enumerate(rects):
        assert r[2] <= W
        for q in rects[i + 1:]: assert r[2] <= q[0] or q[2] <= r[0] or r[3] <= q[1] or q[3] <= r[1], ('overlap', r, q)
    atlas = Image.new('RGBA', (W, height)); fr = {}
    for k, f, ex in cells:
        x, y = place[k]; atlas.alpha_composite(f, (x, y)); fr[k] = dict(x=x, y=y, w=f.width, h=f.height, **ex)
    atlas.save(HERE / f'{NAME}.png')
    meta = dict(version=old['version'], width=W, height=height, facing='left', anchor=old['anchor'], clips=clips, damageEvents=[], frames=fr)
    meta['sourceSha256'] = hashlib.sha256((HERE / f'{NAME}.png').read_bytes()).hexdigest()
    (HERE / f'{NAME}.json').write_text(json.dumps(meta, indent=2) + '\n'); (HERE / 'export.json').write_text(json.dumps(report, indent=2) + '\n')
    print('atlas', W, height, 'frames', len(cells), {k: round(v['scale'], 4) for k, v in report['clips'].items()})
main()

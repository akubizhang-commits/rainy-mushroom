# 2026-11-07 ordinary attacks from Scenario P-Video 2 Pro (480px/24fps/124 frames).
# snake: 20-frame bite (9/3/8) in native 480 cells with per-frame displayScale/anchor matching the 384 walk.
# bear-humanoid: 20-frame slam (9/3/8), feet at y=432 like the walk, no scaling.
# Existing walk frames are copied byte-identically from the current runtime atlas.
from pathlib import Path
from PIL import Image, ImageFilter
import numpy as np, json, hashlib, sys
ROOT = Path(__file__).resolve().parents[2]; RES = ROOT / 'cocos-pilot/assets/resources/tower-monsters-motion'; OUT = Path(__file__).resolve().parent
COUNTS = {'windup': 9, 'active': 3, 'recovery': 8}
JOBS = {
  'snake': dict(src='xianxia-snake-bite-scenario', clip='bite', win={'windup': (8, 32), 'active': (32, 44), 'recovery': (44, 96)}),
  'bear-humanoid': dict(src='xianxia-bear-humanoid-slam-scenario', clip='slam', win={'windup': (4, 44), 'active': (44, 52), 'recovery': (52, 96)}),
}
def key(path):
    a = np.array(Image.open(path).convert('RGB')).astype(float)
    ex = a[:, :, 1] - np.maximum(a[:, :, 0], a[:, :, 2]); al = np.clip((55 - ex) / 35, 0, 1) * 255
    a[:, :, 1] = np.minimum(a[:, :, 1], np.maximum(a[:, :, 0], a[:, :, 2]))
    im = Image.fromarray(a.astype('uint8')).convert('RGBA'); im.putalpha(Image.fromarray(al.astype('uint8')).filter(ImageFilter.MinFilter(3))); return im
box = lambda im: im.getchannel('A').point(lambda v: 255 if v >= 32 else 0).getbbox()

def build(fam):
    j = JOBS[fam]; o = OUT / fam; o.mkdir(parents=True, exist_ok=True); name = f'{fam}-v1'
    meta = json.loads((RES / f'{name}.json').read_text()); old = Image.open(RES / f'{name}.png').convert('RGBA')
    move = meta['clips']['move']['frames']; cells = []
    for k in move:
        r = meta['frames'][k]; cells.append((k, old.crop((r['x'], r['y'], r['x'] + r['w'], r['y'] + r['h'])), {kk: v for kk, v in r.items() if kk not in 'xywh'}))
    movehash = {k: hashlib.sha256(f.tobytes()).hexdigest() for k, f, _ in cells}
    src = ROOT / 'design' / j['src'] / 'raw-frames'; b0 = box(key(src / '001.png'))
    if fam == 'snake':
        # walk: cell 384 cropped at source (66,41); bite frames keep the full 480 source, shifted by the reference offset.
        w0 = meta['frames'][move[0]]; ds = w0['displayScale'] * 480 / 384; ax, ay = meta['anchor']
        walk_b0 = (73, 157, 339, 421); dx, dy = b0[0] - walk_b0[0], b0[3] - walk_b0[3]
        anchor = [round((66 + ax * 384 + dx) / 480, 4), round((41 + ay * 384 + dy) / 480, 4)]; extra = dict(displayScale=round(ds, 4), anchor=anchor)
    else: extra = {}
    ids, phases, n, edge = [], {}, 0, []
    for ph in ('windup', 'active', 'recovery'):
        a, b = j['win'][ph]; c = COUNTS[ph]; phases[ph] = [n, c]
        for i in range(c):
            s = a + round(i * (b - a) / c); ids.append(s); im = key(src / f'{s + 1:03}.png')
            if fam == 'snake': f = im
            else:
                f = Image.new('RGBA', (480, 480)); f.alpha_composite(im, (0, 432 - b0[3]))
            bb = box(f)
            if bb[0] == 0 or bb[1] == 0 or bb[2] >= 479 or bb[3] >= 479: edge.append(f'{j["clip"]}-{n:03}')
            kname = f'{j["clip"]}-{n:03}'; f.save(o / f'{kname}.png'); cells.append((kname, f, extra)); n += 1
    atlas = Image.new('RGBA', (2880, 2880)); frames = {}
    for i, (k, f, ex) in enumerate(cells):
        x, y = i % 6 * 480, i // 6 * 480; atlas.alpha_composite(f, (x, y)); frames[k] = dict(x=x, y=y, w=f.width, h=f.height, **ex)
    atlas.save(o / f'{name}.png'); meta.update(width=2880, height=2880, frames=frames)
    meta['clips'][j['clip']] = dict(frames=[k for k, _, _ in cells if k.startswith(j['clip'] + '-')], fps=10, loop=False, phases=phases)
    meta['sourceSha256'] = hashlib.sha256((o / f'{name}.png').read_bytes()).hexdigest(); (o / f'{name}.json').write_text(json.dumps(meta, indent=2) + '\n')
    prev = []
    for k, f, _ in cells[len(move):]:
        bg = Image.new('RGBA', (360, 300), '#253632'); bg.alpha_composite(f.resize((260, 260), Image.LANCZOS), (50, 20)); prev.append(bg.convert('RGB'))
    prev[0].save(o / f'{fam}-{j["clip"]}.gif', save_all=True, append_images=prev[1:], duration=[110] * 9 + [60] * 3 + [110] * 8 + [400], loop=0)
    (o / 'export.json').write_text(json.dumps(dict(family=fam, sourceIndices=ids, phases=phases, edgeTouchingFrames=edge, layout=extra, movePixelHashes=movehash), indent=2) + '\n')
    print(fam, 'edge', edge, 'layout', extra)
for fam in sys.argv[1:] or JOBS: build(fam)

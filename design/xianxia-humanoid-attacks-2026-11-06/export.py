# Upright wolf/tiger/falcon single claw attack (Scenario P-Video 2 Pro, 480p/24fps/124 frames each).
# Native 480 frames, green keyed, feet planted at y=432 like the walk; existing move frames kept byte-identical.
# 20 attack frames per family: windup 9, active 3, recovery 8. Atlas 2880x2880 (36 cells).
from pathlib import Path
from PIL import Image, ImageFilter
import numpy as np, json, hashlib, sys
ROOT = Path(__file__).resolve().parents[2]
RES = ROOT / 'cocos-pilot/assets/resources/tower-monsters-motion'
OUT = Path(__file__).resolve().parent
WINDOWS = {  # source frame windows (0-based) chosen from per-frame motion energy
    'wolf':   {'windup': (8, 40), 'active': (40, 52), 'recovery': (52, 80)},
    'tiger':  {'windup': (12, 36), 'active': (36, 48), 'recovery': (48, 80)},
    'falcon': {'windup': (12, 32), 'active': (32, 40), 'recovery': (40, 82)},
}
COUNTS = {'windup': 9, 'active': 3, 'recovery': 8}

def key(path):
    a = np.array(Image.open(path).convert('RGB')).astype(float)
    ex = a[:, :, 1] - np.maximum(a[:, :, 0], a[:, :, 2]); al = np.clip((55 - ex) / 35, 0, 1) * 255
    a[:, :, 1] = np.minimum(a[:, :, 1], np.maximum(a[:, :, 0], a[:, :, 2]))
    im = Image.fromarray(a.astype('uint8')).convert('RGBA'); im.putalpha(Image.fromarray(al.astype('uint8')).filter(ImageFilter.MinFilter(3)))
    return im

def build(fam):
    src = ROOT / f'design/xianxia-{fam}-humanoid-attack-scenario'; o = OUT / fam; o.mkdir(parents=True, exist_ok=True)
    name = f'{fam}-humanoid-v1'; meta = json.loads((RES / f'{name}.json').read_text()); old = Image.open(RES / f'{name}.png').convert('RGBA')
    move = meta['clips']['move']['frames']; cells = []
    for k in move:
        r = meta['frames'][k]; cells.append((k, old.crop((r['x'], r['y'], r['x'] + r['w'], r['y'] + r['h']))))
    movehash = {k: hashlib.sha256(f.tobytes()).hexdigest() for k, f in cells}
    ids, phases, n = [], {}, 0; edge = []
    for ph in ('windup', 'active', 'recovery'):
        a, b = WINDOWS[fam][ph]; c = COUNTS[ph]; phases[ph] = [n, c]
        for i in range(c):
            s = a + round(i * (b - a) / c); ids.append(s)
            im = key(src / 'raw-frames' / f'{s + 1:03}.png'); box = im.getchannel('A').point(lambda v: 255 if v >= 32 else 0).getbbox()
            f = Image.new('RGBA', (480, 480)); f.alpha_composite(im, (0, 432 - box[3]))
            if box[0] == 0 or box[2] >= 479: edge.append(f'sweep-{n:03}')
            f.save(o / f'sweep-{n:03}.png'); cells.append((f'sweep-{n:03}', f)); n += 1
    atlas = Image.new('RGBA', (2880, 2880)); frames = {}
    for i, (k, f) in enumerate(cells):
        x, y = i % 6 * 480, i // 6 * 480; atlas.alpha_composite(f, (x, y)); frames[k] = dict(x=x, y=y, w=480, h=480)
    atlas.save(o / f'{name}.png')
    meta.update(width=2880, height=2880, frames=frames)
    meta['clips']['sweep'] = dict(frames=[k for k, _ in cells if k.startswith('sweep')], fps=10, loop=False, phases=phases)
    meta['sourceSha256'] = hashlib.sha256((o / f'{name}.png').read_bytes()).hexdigest()
    (o / f'{name}.json').write_text(json.dumps(meta, indent=2) + '\n')
    prev = []
    for k, f in cells[len(move):]:
        bg = Image.new('RGBA', (360, 300), '#253632'); bg.alpha_composite(f.resize((260, 260), Image.LANCZOS), (50, 20)); prev.append(bg.convert('RGB'))
    prev[0].save(o / f'{fam}-humanoid-attack.gif', save_all=True, append_images=prev[1:], duration=[110] * 9 + [60] * 3 + [110] * 8 + [400], loop=0)
    rec = dict(family=fam, sourceIndices=ids, phases=phases, edgeTouchingFrames=edge, movePixelHashes=movehash, atlas=[2880, 2880], rgbaMiB=2880 * 2880 * 4 / 2**20)
    (o / 'export.json').write_text(json.dumps(rec, indent=2) + '\n'); print(fam, 'edge frames', edge)

for fam in sys.argv[1:] or WINDOWS: build(fam)

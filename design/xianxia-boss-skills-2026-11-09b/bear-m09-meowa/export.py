# 2026-11-09 bear-humanoid M09 撼岳掀浪 "heave" clip from Meowa (640px, 73 frames, debris cleaned by clean.py).
# 12 frames: windup 4 / active 2 / recovery 6. Composed in a 480 cell with one fixed scale/offset (clean frame 1
# matched to the runtime walk move-000: height, centre, feet), stored in 384 cells (displayScale 1.25) appended
# after the existing frames: 2 cells close the last row, 10 cells form one new row. Existing frames keep their
# coordinates and bytes; the canvas only grows downward (3552 -> 3936).
from pathlib import Path
from PIL import Image
import json, hashlib
ROOT = Path(__file__).resolve().parents[3]; RES = ROOT / 'cocos-pilot/assets/resources/tower-monsters-motion'; HERE = Path(__file__).resolve().parent
WIN = {'windup': (6, 27, 4), 'active': (38, 44, 2), 'recovery': (44, 70, 6)}
out = HERE / 'export'; out.mkdir(exist_ok=True)
for ext in ('png', 'json'):
    keep = out / f'runtime-before.{ext}'
    if not keep.exists(): keep.write_bytes((RES / f'bear-humanoid-v1.{ext}').read_bytes())
meta = json.loads((out / 'runtime-before.json').read_text()); old = Image.open(out / 'runtime-before.png').convert('RGBA')
box = lambda im: im.getchannel('A').point(lambda v: 255 if v >= 32 else 0).getbbox()
m0 = meta['frames'][meta['clips']['move']['frames'][0]]
walk = old.crop((m0['x'], m0['y'], m0['x'] + m0['w'], m0['y'] + m0['h']))
if walk.width != 480: walk = walk.resize((480, 480), Image.LANCZOS)
wb = box(walk); src = lambda i: Image.open(HERE / 'clean-frames' / f'{i:03d}.png').convert('RGBA')
sb = box(src(1)); s = (wb[3] - wb[1]) / (sb[3] - sb[1]); ox = (wb[0] + wb[2]) / 2 - (sb[0] + sb[2]) / 2 * s; oy = wb[3] - sb[3] * s
ids, phases, n = [], {}, 0
for ph, (a, b, c) in WIN.items():
    phases[ph] = [n, c]
    for i in range(c): ids.append(a + round(i * (b - a) / c)); n += 1
frames = [src(i) for i in ids]; bs = [box(f) for f in frames]
u = (min(b[0] for b in bs) * s + ox, min(b[1] for b in bs) * s + oy, max(b[2] for b in bs) * s + ox, max(b[3] for b in bs) * s + oy)
assert u[0] >= 8 and u[1] >= 8 and u[2] <= 472 and u[3] <= 472, f'union {u} overflows; fit needed'
size = round(640 * s); cells = []
for j, im in enumerate(frames):
    f = Image.new('RGBA', (480, 480)); sc = im.resize((size, size), Image.LANCZOS); f.paste(sc, (round(ox), round(oy)), sc)
    f.save(out / f'heave-{j:03}.png'); cells.append((f'heave-{j:03}', f.resize((384, 384), Image.LANCZOS)))
last = max(r['y'] for r in meta['frames'].values()); used = max(r['x'] + r['w'] for r in meta['frames'].values() if r['y'] == last)
slots = [(x, last) for x in range(used, 3840 - 383, 384)] + [(i * 384, last + 384) for i in range(10)]
H = max(y for _, y in slots[:len(cells)]) + 384; assert H <= 4096
atlas = Image.new('RGBA', (3840, H)); atlas.alpha_composite(old, (0, 0))
for (k, f), (x, y) in zip(cells, slots):
    atlas.alpha_composite(f, (x, y)); meta['frames'][k] = dict(x=x, y=y, w=384, h=384, displayScale=1.25, anchor=meta['anchor'])
meta['clips']['heave'] = dict(frames=[k for k, _ in cells], fps=10, loop=False, phases=phases)
atlas.save(out / 'bear-humanoid-v1.png'); meta.update(height=H)
meta['sourceSha256'] = hashlib.sha256((out / 'bear-humanoid-v1.png').read_bytes()).hexdigest()
(out / 'bear-humanoid-v1.json').write_text(json.dumps(meta, indent=2) + '\n')
for k, r in json.loads((out / 'runtime-before.json').read_text())['frames'].items():
    assert atlas.crop((r['x'], r['y'], r['x'] + r['w'], r['y'] + r['h'])).tobytes() == old.crop((r['x'], r['y'], r['x'] + r['w'], r['y'] + r['h'])).tobytes(), k
sheet = Image.new('RGBA', (6 * 240, 2 * 240), '#253632')
for i, (k, f) in enumerate(cells): sheet.alpha_composite(f.resize((240, 240), Image.LANCZOS), (i % 6 * 240, i // 6 * 240))
sheet.convert('RGB').save(out / 'contact-heave.png')
(out / 'export.json').write_text(json.dumps(dict(sourceIndices=ids, phases=phases, scale=s, offset=[ox, oy], union480=u, atlas=[3840, H], frames=len(meta['frames'])), indent=2) + '\n')
print('ids', ids, 'scale', round(s, 4), 'union', [round(v) for v in u], 'atlas 3840x%d' % H, 'frames', len(meta['frames']))

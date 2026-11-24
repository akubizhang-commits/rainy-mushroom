# 2026-11-24 skill clips (copied from design/xianxia-normal-attacks-2026-11-22/export.py, same day). Earlier: 2026-11-22 normal attacks (copied from the rage M02 exporter, same day). Earlier header: 2026-11-22 rage M02 clips (exporter copied from 11-13). Original header: 2026-11-13 skill clips (exporter copied from 11-12) from Scenario P-Video 2 Pro (480px/24fps/124 frames), copied from the 11-09 exporter.
# yak: channel (M19); rhino: brace (M20 before the charge); wolf-humanoid: howl (M05); tiger-humanoid / falcon-humanoid: stomp (M07).
# Windows are 0-based source frame indices. Tiger uses clean-frames/ (rocks and cracks removed by clean_tiger.py).
# Each skill clip has 16 frames, phases windup 6 / active 2 / recovery 8. Frames are first composed in a 480 cell
# with one fixed scale/offset per clip (source frame-0 subject matched to the runtime walk move-000: height, centre,
# feet), then stored in a smaller cell (384 or 320) so the atlas stays within 3840x4096; a per-frame displayScale
# restores the 480 display size, and the normalized anchor is unchanged by uniform scaling.
# 2026-11-22 fix: the runtime sets the sprite content size to bodySize*displayScale whatever the cell's pixel size,
# so a smaller cell needs no 480/small compensation; displayScale is only the fit scale ds. Existing atlases were corrected.
# Every existing runtime frame is copied byte-identically. usage: export.py bear-humanoid|rhino|yak
from pathlib import Path
from PIL import Image, ImageFilter
import numpy as np, json, hashlib, sys
ROOT = Path(__file__).resolve().parents[2]; RES = ROOT / 'cocos-pilot/assets/resources/tower-monsters-motion'; HERE = Path(__file__).resolve().parent
COUNTS = {'windup': 6, 'active': 2, 'recovery': 8}
JOBS = {
    # 2026-11-24 spider-lady M10 (缚足蛛网) v1: rear up with both arms raised (2-33), the net strands drawn by the video
    # (source 36-43) are skipped, active is the arms-forward throw (44, 46), then hold and settle (76-100).
    # Falcon-humanoid M07 stomp v2 (padded reference, wings folded): leg lift (2-38), stomp (39-44, rocks/feathers removed by
    # despeckle), settle (60-100). Replaces the 11-11 v1 stomp frames (wing cut by the video edge, already off in routing).
    'falcon-humanoid': [('stomp', 'falcon-humanoid-m07', {'windup': (2, 38), 'active': (39, 44), 'recovery': (60, 100), 'despeckle': True, 'replace': True})],
    'spider-lady': [('web', 'spider-lady-m10', {'windup': (2, 34), 'active': [44, 46], 'recovery': (76, 100)})],
}
W, H = 3840, 4096
def key(path):
    a = np.array(Image.open(path).convert('RGB')).astype(float)
    ex = a[:, :, 1] - np.maximum(a[:, :, 0], a[:, :, 2]); al = np.clip((55 - ex) / 35, 0, 1) * 255
    a[:, :, 1] = np.minimum(a[:, :, 1], np.maximum(a[:, :, 0], a[:, :, 2]))
    im = Image.fromarray(a.astype('uint8')).convert('RGBA'); im.putalpha(Image.fromarray(al.astype('uint8')).filter(ImageFilter.MinFilter(3))); return im
def despeckle(im):
    """Keep only the largest opaque component (8-connected, alpha>=32), dilated 3px so soft edges survive."""
    a = np.array(im.getchannel('A')) >= 32; h, w = a.shape; lab = np.zeros((h, w), np.int32); n = 0; sizes = {}
    for y0, x0 in zip(*np.nonzero(a)):
        if lab[y0, x0]: continue
        n += 1; stack = [(y0, x0)]; lab[y0, x0] = n; c = 0
        while stack:
            y, x = stack.pop(); c += 1
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < h and 0 <= xx < w and a[yy, xx] and not lab[yy, xx]: lab[yy, xx] = n; stack.append((yy, xx))
        sizes[n] = c
    if not sizes: return im
    keep = Image.fromarray(((lab == max(sizes, key=sizes.get)) * 255).astype('uint8')).filter(ImageFilter.MaxFilter(7))
    out = im.copy(); out.putalpha(Image.fromarray(np.minimum(np.array(im.getchannel('A')), np.array(keep)))); return out
box = lambda im: im.getchannel('A').point(lambda v: 255 if v >= 32 else 0).getbbox()
def pack(cells, small):
    """480 cells in 8 columns, then small cells fill free 480 slots of the last row, then shelf rows below."""
    big = [c for c in cells if c[1].width == 480]; sm = [c for c in cells if c[1].width != 480]; place = {}
    for i, (k, f, _) in enumerate(big): place[k] = (i % 8 * 480, i // 8 * 480)
    rows = -(-len(big) // 8); free = [(j * 480, (rows - 1) * 480) for j in range(len(big) % 8, 8)] if len(big) % 8 else []
    # 2026-11-22: shelf packing by each cell's real size, since an atlas can already hold 384 cells next to new 320 cells.
    y = rows * 480; x = 0; shelf = 0
    for k, f, _ in sm:
        if free: place[k] = free.pop(0); continue
        if x + f.width > W: y += shelf; x = 0; shelf = 0
        place[k] = (x, y); x += f.width; shelf = max(shelf, f.height)
    height = max(place[k][1] + f.height for k, f, _ in cells)
    return place, height
def build(fam):
    out = HERE / fam; out.mkdir(exist_ok=True); name = f'{fam}-v1'
    for ext in ('png', 'json'):
        keep = out / f'runtime-before.{ext}'
        if not keep.exists(): keep.write_bytes((RES / f'{name}.{ext}').read_bytes())
    meta = json.loads((out / 'runtime-before.json').read_text()); old = Image.open(out / 'runtime-before.png').convert('RGBA')
    cells = []
    for k, r in meta['frames'].items():
        cells.append((k, old.crop((r['x'], r['y'], r['x'] + r['w'], r['y'] + r['h'])), {kk: v for kk, v in r.items() if kk not in 'xywh'}))
    for clip, _, win in JOBS[fam]:
        if win.get('replace') and clip in meta['clips']:
            old_keys = set(meta['clips'].pop(clip)['frames']); cells = [c for c in cells if c[0] not in old_keys]
    kept = {k: hashlib.sha256(f.tobytes()).hexdigest() for k, f, _ in cells}
    mi = [k for k, _, _ in cells].index(meta['clips']['move']['frames'][0]); mcell = cells[mi][1]
    # 2026-11-23: the walk frame may sit in a smaller cell and/or carry its own displayScale (snake: 384 cell, 1.3068).
    # Express its box in 480-cell coordinates and carry its displayScale into the new frames, so the clip matches
    # the walk's on-screen size instead of its raw pixels.
    wb = tuple(v * 480 / mcell.width for v in box(mcell)); base_ds = cells[mi][2].get('displayScale', 1.0)
    composed = []; report = {}
    for clip, src, win in JOBS[fam]:
        clean = (HERE / src / 'clean-frames').is_dir(); raw = HERE / src / ('clean-frames' if clean else 'raw-frames'); load = (lambda p: Image.open(p).convert('RGBA')) if clean else key; sb = box(load(raw / '001.png'))
        s = (wb[3] - wb[1]) / (sb[3] - sb[1]); ox = (wb[0] + wb[2]) / 2 - (sb[0] + sb[2]) / 2 * s; oy = wb[3] - sb[3] * s
        ids, phases, n = [], {}, 0
        for ph in ('windup', 'active', 'recovery'):
            if isinstance(win[ph], list):  # explicit 0-based source indices (e.g. a reversed windup as recovery)
                phases[ph] = [n, len(win[ph])]; ids += win[ph]; n += len(win[ph]); continue
            a, b = win[ph]; c = win.get('counts', COUNTS)[ph]; phases[ph] = [n, c]
            for i in range(c): ids.append(a + round(i * (b - a) / c)); n += 1
        keyed = [load(raw / f'{i + 1:03}.png') for i in ids]
        if win.get('despeckle'): keyed = [despeckle(k) for k in keyed]
        bs = [box(k) for k in keyed]
        ux0, uy0, ux1, uy1 = min(b[0] for b in bs), min(b[1] for b in bs), max(b[2] for b in bs), max(b[3] for b in bs)
        ds, anchor = 1.0, list(meta['anchor'])
        if not (ux0 * s + ox >= 8 and ux1 * s + ox <= 472 and uy0 * s + oy >= 8 and uy1 * s + oy <= 472):
            s2 = min(s, 464 / (ux1 - ux0), 464 / (uy1 - uy0)); ox2 = 8 - ux0 * s2; oy2 = 472 - uy1 * s2
            gx, gy = anchor[0] * 480, anchor[1] * 480; px, py = (gx - ox) / s, (gy - oy) / s
            ds = s / s2; anchor = [(ox2 + px * s2) / 480, (oy2 + py * s2) / 480]; s, ox, oy = s2, ox2, oy2
        size = round(480 * s); frames = []
        for j, im in enumerate(keyed):
            f = Image.new('RGBA', (480, 480)); sc = im.resize((size, size), Image.Resampling.LANCZOS); f.paste(sc, (round(ox), round(oy)), sc)
            frames.append((f'{clip}-{j:03}', f))
        composed.append((clip, phases, frames, ds, [round(anchor[0], 4), round(anchor[1], 4)]))
        report[clip] = dict(cleanFrames=clean, source=src, sourceIndices=ids, phases=phases, scale=s, offset=[ox, oy], fitDisplayScale=ds)
    big = len(cells); extra = sum(len(c[2]) for c in composed)
    for small in (384, 320):
        trial = cells + [(k, Image.new('RGBA', (small, small)), {}) for c in composed for k, _ in c[2]]
        place, height = pack(trial, small)
        if height <= H: break
    else:
        # 2026-11-22 bear-humanoid: the atlas is already 3840x3936. Keep every old cell at its old position and
        # add a 256-wide column at x=3840 (atlas width 4096, still within the 4096 texture limit).
        small = 256
        if extra * small > meta['height']: raise SystemExit(f'{fam}: does not fit in {W}x{H} nor in a 256 side column')
    column = small == 256
    for clip, phases, frames, ds, anchor in composed:
        for k, f in frames:
            f.save(out / f'{k}.png')
            cells.append((k, f.resize((small, small), Image.Resampling.LANCZOS), dict(displayScale=round(ds * base_ds, 4), anchor=anchor)))
        meta['clips'][clip] = dict(frames=[k for k, _ in frames], fps=10, loop=False, phases=phases)
    if column:
        place = {k: (r['x'], r['y']) for k, r in meta['frames'].items()}; n = 0
        for k, f, _ in cells:
            if k not in place: place[k] = (W, n * small); n += 1
        W2 = W + small; height = meta['height']
    else:
        place, height = pack(cells, small); W2 = W
    rects = [(place[k][0], place[k][1], place[k][0] + f.width, place[k][1] + f.height, k) for k, f, _ in cells]
    for i, r in enumerate(rects):
        assert r[2] <= W2 and r[3] <= height, r
        for q in rects[i + 1:]: assert r[2] <= q[0] or q[2] <= r[0] or r[3] <= q[1] or q[3] <= r[1], ('overlap', r, q)
    atlas = Image.new('RGBA', (W2, height)); fr = {}
    for k, f, ex in cells:
        x, y = place[k]; atlas.alpha_composite(f, (x, y)); fr[k] = dict(x=x, y=y, w=f.width, h=f.height, **ex)
    atlas.save(out / f'{name}.png'); meta.update(width=W2, height=height, frames=fr)
    meta['sourceSha256'] = hashlib.sha256((out / f'{name}.png').read_bytes()).hexdigest(); (out / f'{name}.json').write_text(json.dumps(meta, indent=2) + '\n')
    for clip, phases, frames, ds, anchor in composed:
        sheet = Image.new('RGBA', (8 * 240, 2 * 240), '#253632')
        for i, (k, f) in enumerate(frames): t = f.resize((240, 240), Image.LANCZOS); sheet.alpha_composite(t, (i % 8 * 240, i // 8 * 240))
        sheet.convert('RGB').save(out / f'contact-{clip}.png')
    (out / 'export.json').write_text(json.dumps(dict(family=fam, smallCell=small, atlas=[W2, height], clips=report, keptPixelHashes=kept), indent=2) + '\n')
    print(fam, 'atlas', W2, height, 'cell', small, 'frames', len(cells), {c[0]: (round(c[3], 4), c[4]) for c in composed}, f'RGBA {W2*height*4/2**20:.1f} MiB')
for fam in sys.argv[1:] or JOBS: build(fam)

# 2026-11-27 bat-humanoid bite + elite M07 stomp for bat/snake/snake-lady/falcon (copied from design/xianxia-boss-skills-2026-11-26/export.py; adds degreen). Earlier: 2026-11-26 M08 clips (copied from design/xianxia-boss-skills-2026-11-25/export.py). Earlier: 2026-11-25 skill clips (copied from design/xianxia-boss-skills-2026-11-24/export.py; adds per-phase sources). Earlier: 2026-11-24 skill clips (copied from design/xianxia-normal-attacks-2026-11-22/export.py, same day). Earlier: 2026-11-22 normal attacks (copied from the rage M02 exporter, same day). Earlier header: 2026-11-22 rage M02 clips (exporter copied from 11-13). Original header: 2026-11-13 skill clips (exporter copied from 11-12) from Scenario P-Video 2 Pro (480px/24fps/124 frames), copied from the 11-09 exporter.
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
from PIL import Image, ImageFilter, ImageDraw
import numpy as np, json, hashlib, sys
ROOT = Path(__file__).resolve().parents[2]; RES = ROOT / 'cocos-pilot/assets/resources/tower-monsters-motion'; HERE = Path(__file__).resolve().parent
COUNTS = {'windup': 6, 'active': 2, 'recovery': 8}
JOBS = {
    # 2026-11-28 snake-lady ordinary bite (normal snake-lady, floor 8). v1 grew a snake jaw and sprayed red mist (rejected);
    # v2 26-110 bursts into red glow, so only its clean lunge is used: windup 2-18 lean back, active 20-22 dart forward with
    # the claws, recovery plays the lean back in reverse.
    'snake-lady': [('bite', 'snake-lady-bite-v2', {'windup': [2, 6, 10, 14, 18], 'active': [20, 21, 22], 'recovery': [19, 15, 10, 5, 1], 'degreen': True, 'despeckle': True})],
    # Bat hit + death from one clip: 12-28 flinch back to hover (18-20 fold the wings into a twisted pose, skipped); 72-88 limp fall, 88+ lying still.
    'bat': [('hit', 'bat-hit-death', {'windup': [12, 14, 15], 'active': [16, 21], 'recovery': [24, 26, 28], 'degreen': True, 'despeckle': True}),
            ('death', 'bat-hit-death', {'windup': [70, 72, 74, 76], 'active': [78, 80, 82], 'recovery': [84, 86, 88, 94, 104], 'degreen': True, 'despeckle': True})],
    # Crocodile hit: 2-10 head jerks up and back, played out and back (12+ turns sideways). Death: 56-76 sinks flat, legs splayed.
    'crocodile': [('hit', 'crocodile-hit-death', {'windup': [2, 4, 6], 'active': [8, 10], 'recovery': [8, 6, 3], 'degreen': True, 'despeckle': True}),
                  ('death', 'crocodile-hit-death', {'windup': [56, 58, 60], 'active': [62, 64, 66], 'recovery': [68, 70, 72, 76], 'degreen': True, 'despeckle': True})],
}
# 2026-11-28: the snake-lady atlas was full (4096x3904, its 256 side column used by stomp). Repack it on a 4096-wide shelf
# with its 480 cells resampled to 384 (still above the 256 native minimum) and new frames at 256.
REPACK = {'snake-lady': dict(width=4096, shrink={480: 384}, small=256), 'bat': dict(width=4096, shrink={480: 384}, small=384), 'crocodile': dict(width=4096, shrink={480: 384}, small=384)}
def shelf(cells, width):
    place = {}; x = y = h = 0
    for k, f, _ in sorted(cells, key=lambda c: -c[1].width):
        if x + f.width > width: y += h; x = 0; h = 0
        place[k] = (x, y); x += f.width; h = max(h, f.height)
    return place, y + h
W, H = 3840, 4096
def key(path):
    a = np.array(Image.open(path).convert('RGB')).astype(float)
    ex = a[:, :, 1] - np.maximum(a[:, :, 0], a[:, :, 2]); al = np.clip((55 - ex) / 35, 0, 1) * 255
    a[:, :, 1] = np.minimum(a[:, :, 1], np.maximum(a[:, :, 0], a[:, :, 2]))
    im = Image.fromarray(a.astype('uint8')).convert('RGBA'); im.putalpha(Image.fromarray(al.astype('uint8')).filter(ImageFilter.MinFilter(3))); return im
def degreen(im, th=8):
    """2026-11-27: clear pixels still tinted green after keying (green-tinted trails, rings and glow fringes)."""
    a = np.array(im); m = a[..., 1].astype(int) > np.maximum(a[..., 0], a[..., 2]).astype(int) + th
    a[..., 3] = np.where(m, 0, a[..., 3]); return Image.fromarray(a)
def degrey(im, big=60):
    """2026-11-27: drop flying rock shards: 8-connected blobs of low-saturation grey (max-min < 28, 50 < max < 235)
    of at least `big` pixels. Small grey specks inside the body (belly highlights) stay."""
    a = np.array(im); c = a[..., :3].astype(int); mx, mn = c.max(2), c.min(2)
    g = (a[..., 3] > 0) & (mx - mn < 28) & (mx < 235) & (mx > 50); h, w = g.shape; seen = np.zeros_like(g); drop = np.zeros_like(g)
    for y0, x0 in zip(*np.nonzero(g)):
        if seen[y0, x0]: continue
        stack = [(y0, x0)]; seen[y0, x0] = True; comp = []
        while stack:
            y, x = stack.pop(); comp.append((y, x))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < h and 0 <= xx < w and g[yy, xx] and not seen[yy, xx]: seen[yy, xx] = True; stack.append((yy, xx))
        if len(comp) >= big:
            for y, x in comp: drop[y, x] = True
    drop = np.array(Image.fromarray((drop * 255).astype('uint8')).filter(ImageFilter.MaxFilter(3))) > 0
    a[..., 3] = np.where(drop, 0, a[..., 3]); return Image.fromarray(a)
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
        srcs = {ph: HERE / win.get('srcs', {}).get(ph, src) / 'raw-frames' for ph in ('windup', 'active', 'recovery')}
        s = (wb[3] - wb[1]) / (sb[3] - sb[1]); ox = (wb[0] + wb[2]) / 2 - (sb[0] + sb[2]) / 2 * s; oy = wb[3] - sb[3] * s
        ids, phases, n = [], {}, 0
        for ph in ('windup', 'active', 'recovery'):
            if isinstance(win[ph], list):  # explicit 0-based source indices (e.g. a reversed windup as recovery)
                phases[ph] = [n, len(win[ph])]; ids += [(ph, i) for i in win[ph]]; n += len(win[ph]); continue
            a, b = win[ph]; c = win.get('counts', COUNTS)[ph]; phases[ph] = [n, c]
            for i in range(c): ids.append((ph, a + round(i * (b - a) / c))); n += 1
        keyed = [load(srcs[ph] / f'{i + 1:03}.png') for ph, i in ids]; ids = [f'{win.get("srcs", {}).get(ph, src)}:{i}' for ph, i in ids]
        if win.get('degreen'): keyed = [degreen(k) for k in keyed]
        if win.get('degrey'): keyed = [degrey(k, win.get('degreyMin', 60)) if j in win['degrey'] else k for j, k in enumerate(keyed)]  # clip frame indices
        if win.get('despeckle'): keyed = [despeckle(k) for k in keyed]
        for j, px in win.get('fadeRight', {}).items():  # clip frame index -> ramp width at the right frame edge
            a = np.array(keyed[j]); w = a.shape[1]; ramp = np.clip((w - 1 - np.arange(w)) / px, 0, 1)
            a[..., 3] = (a[..., 3] * ramp[None, :]).astype('uint8'); keyed[j] = Image.fromarray(a)
        bs = [box(k) for k in keyed]
        ux0, uy0, ux1, uy1 = min(b[0] for b in bs), min(b[1] for b in bs), max(b[2] for b in bs), max(b[3] for b in bs)
        ds, anchor = 1.0, list(meta['anchor'])
        if not (ux0 * s + ox >= 8 and ux1 * s + ox <= 472 and uy0 * s + oy >= 8 and uy1 * s + oy <= 472):
            gx, gy = anchor[0] * 480, anchor[1] * 480; px, py = (gx - ox) / s, (gy - oy) / s
            # 2026-11-26: the runtime rejects anchors outside 0..1, so the anchor point counts as part of the fitted box.
            bx0, bx1, by1 = min(ux0, px), max(ux1, px), max(uy1, py)
            s2 = min(s, 464 / (bx1 - bx0), 464 / (by1 - uy0)); ox2 = 8 - bx0 * s2; oy2 = 472 - by1 * s2
            ds = s / s2; anchor = [(ox2 + px * s2) / 480, (oy2 + py * s2) / 480]; s, ox, oy = s2, ox2, oy2
        size = round(480 * s); frames = []
        for j, im in enumerate(keyed):
            f = Image.new('RGBA', (480, 480)); sc = im.resize((size, size), Image.Resampling.LANCZOS); f.paste(sc, (round(ox), round(oy)), sc)
            for x, y, r in win.get('erase', {}).get(j, []):
                m = Image.new('L', f.size, 0); ImageDraw.Draw(m).ellipse((x - r, y - r, x + r, y + r), fill=255)
                al = np.array(f.getchannel('A')); al[np.array(m) > 0] = 0; f.putalpha(Image.fromarray(al))
            frames.append((f'{clip}-{j:03}', f))
        composed.append((clip, phases, frames, ds, [round(anchor[0], 4), round(anchor[1], 4)]))
        report[clip] = dict(cleanFrames=clean, source=src, sourceIndices=ids, phases=phases, scale=s, offset=[ox, oy], fitDisplayScale=ds)
    big = len(cells); extra = sum(len(c[2]) for c in composed)
    rp = REPACK.get(fam)
    if rp:
        cells = [(k, f.resize((rp['shrink'][f.width],) * 2, Image.Resampling.LANCZOS) if f.width in rp['shrink'] else f, ex) for k, f, ex in cells]
        small = rp['small']
        for clip, phases, frames, ds, anchor in composed:
            for k, f in frames:
                f.save(out / f'{k}.png'); cells.append((k, f.resize((small, small), Image.Resampling.LANCZOS), dict(displayScale=round(ds * base_ds, 4), anchor=anchor)))
            meta['clips'][clip] = dict(frames=[k for k, _ in frames], fps=10, loop=False, phases=phases)
        place, height = shelf(cells, rp['width']); W2 = rp['width']
        if height > H: raise SystemExit(f'{fam}: repack height {height} > {H}')
        return finish(fam, out, name, meta, cells, place, W2, height, composed, small, report, kept)
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
    return finish(fam, out, name, meta, cells, place, W2, height, composed, small, report, kept)
def finish(fam, out, name, meta, cells, place, W2, height, composed, small, report, kept):
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

# Boar-humanoid walk: Scenario 480p/24fps source, loop source frames 62..104 (43 frames) sampled to 16.
# Green keyed, one fixed scale (portrait subject height 0.805) and one fixed offset (frame 0 feet at y=432),
# so planted hooves stay put; no per-frame vertical correction.
from pathlib import Path
from PIL import Image, ImageFilter, ImageDraw
import numpy as np, json, hashlib
r = Path(__file__).resolve().parent; o = r / 'final'; o.mkdir(exist_ok=True)
START, LEN, N = 62, 43, 16
ids = [START + round(i * LEN / N) for i in range(N)]

def key(i):
    a = np.array(Image.open(r / 'raw-frames' / f'{i + 1:03}.png').convert('RGB')).astype(float)
    ex = a[:, :, 1] - np.maximum(a[:, :, 0], a[:, :, 2]); al = np.clip((55 - ex) / 35, 0, 1) * 255
    a[:, :, 1] = np.minimum(a[:, :, 1], np.maximum(a[:, :, 0], a[:, :, 2]))
    im = Image.fromarray(a.astype('uint8')).convert('RGBA'); im.putalpha(Image.fromarray(al.astype('uint8')).filter(ImageFilter.MinFilter(3)))
    return im

box = lambda im: im.getchannel('A').point(lambda v: 255 if v >= 32 else 0).getbbox()
keyed = [key(i) for i in ids]; b0 = box(keyed[0]); scale = 0.805 * 480 / (b0[3] - b0[1])
frames = []
for n, im in enumerate(keyed):
    s = im.resize((round(480 * scale), round(480 * scale)), Image.Resampling.LANCZOS)
    f = Image.new('RGBA', (480, 480)); f.alpha_composite(s, ((480 - s.width) // 2, 432 - round(b0[3] * scale)))
    f.save(o / f'move-{n:03}.png'); frames.append(f)
atlas = Image.new('RGBA', (1920, 1920))
for i, f in enumerate(frames): atlas.alpha_composite(f, (i % 4 * 480, i // 4 * 480))
atlas.save(o / 'boar-humanoid-v1.png')
loop = LEN / 24
manifest = {'version': 2, 'width': 1920, 'height': 1920, 'facing': 'left', 'anchor': [.5, .9],
    'frames': {f'move-{i:03}': {'x': i % 4 * 480, 'y': i // 4 * 480, 'w': 480, 'h': 480} for i in range(N)},
    'clips': {'move': {'frames': [f'move-{i:03}' for i in range(N)], 'fps': N / loop, 'loop': True}},
    'damageEvents': [], 'sourceSha256': hashlib.sha256((o / 'boar-humanoid-v1.png').read_bytes()).hexdigest()}
(o / 'boar-humanoid-v1.json').write_text(json.dumps(manifest, indent=2) + '\n')
prev = []
for f in frames:
    bg = Image.new('RGBA', (320, 280), '#253632'); bg.alpha_composite(f.resize((220, 220), Image.Resampling.LANCZOS), (50, 30)); prev.append(bg.convert('RGB'))
prev[0].save(o / 'boar-humanoid-walk.gif', save_all=True, append_images=prev[1:], duration=round(loop * 1000 / N), loop=0)
sh = Image.new('RGB', (4 * 240, 4 * 240), '#253632'); d = ImageDraw.Draw(sh)
for i, f in enumerate(frames):
    t = f.resize((240, 240), Image.Resampling.LANCZOS); sh.paste(t, (i % 4 * 240, i // 4 * 240), t); d.text((i % 4 * 240 + 4, i // 4 * 240 + 4), f'{i} src{ids[i]}', fill='white')
sh.save(o / 'contact.png')
edges = [i for i, f in enumerate(frames) if (b := box(f))[3] >= 479 or b[0] == 0 or b[2] >= 479]
(o / 'final_outputs.json').write_text(json.dumps(dict(sourceIndices=ids, scale=scale, loopSeconds=loop, edgeFrames=edges), indent=2))
print('scale', round(scale, 4), 'loop', loop, 'edge frames', edges, 'b0', b0)

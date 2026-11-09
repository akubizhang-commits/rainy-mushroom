# Low-tier snake slither: approved candidate (16 frames, native 480 source) -> fixed 384px crop, no resampling.
# Crop window x66-450, y41-425 contains every frame's subject (union x73-443, y157-421).
# displayScale/anchor match the static portrait: body (frame 0) 264px tall vs portrait 230/256, feet at body bottom.
from pathlib import Path
from PIL import Image
import json, hashlib
r = Path(__file__).resolve().parent; o = r / 'final'; o.mkdir(exist_ok=True)
X0, Y0, C = 66, 41, 384
frames = []
for i in range(16):
    f = Image.open(r / 'candidate' / f'{i:02}.png').convert('RGBA').crop((X0, Y0, X0 + C, Y0 + C))
    b = f.getchannel('A').point(lambda v: 255 if v >= 32 else 0).getbbox()
    assert b[0] > 0 and b[1] > 0 and b[2] < C and b[3] < C, (i, b)
    f.save(o / f'move-{i:03}.png'); frames.append(f)
b0 = frames[0].getchannel('A').point(lambda v: 255 if v >= 32 else 0).getbbox()
scale = (230 / 256) * C / (b0[3] - b0[1])
anchor = [round(((b0[0] + b0[2]) / 2) / C, 4), round(b0[3] / C, 4)]
cols = 4; atlas = Image.new('RGBA', (cols * C, 4 * C))
for i, f in enumerate(frames): atlas.alpha_composite(f, (i % cols * C, i // cols * C))
atlas.save(o / 'snake-v1.png')
loop = 63 / 24
manifest = {'version': 2, 'width': atlas.width, 'height': atlas.height, 'facing': 'left', 'anchor': anchor,
    'frames': {f'move-{i:03}': {'x': i % cols * C, 'y': i // cols * C, 'w': C, 'h': C, 'displayScale': round(scale, 4)} for i in range(16)},
    'clips': {'move': {'frames': [f'move-{i:03}' for i in range(16)], 'fps': 16 / loop, 'loop': True}},
    'damageEvents': [], 'sourceSha256': hashlib.sha256((o / 'snake-v1.png').read_bytes()).hexdigest()}
(o / 'snake-v1.json').write_text(json.dumps(manifest, indent=2) + '\n')
frames[0].save(o / 'snake-slither.webp', save_all=True, append_images=frames[1:], duration=round(loop * 1000 / 16), loop=0, lossless=True)
print('atlas', atlas.size, 'displayScale', round(scale, 4), 'anchor', anchor, 'fps', 16 / loop)

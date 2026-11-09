# Bear-humanoid walk: Meowa V2 640px source -> 15 native 480px RGBA frames + 1920 atlas.
# One fixed scale for every frame (matches the static portrait: subject height 0.805, feet 0.9).
from pathlib import Path
from PIL import Image, ImageFilter, ImageSequence, ImageDraw
import numpy as np, json, hashlib
r = Path(__file__).resolve().parent; o = r / 'final'; o.mkdir(exist_ok=True)

durations = json.loads((r / 'v1' / 'durations.json').read_text())
raw = [np.array(Image.open(r / 'v1' / 'raw-frames' / f'{i:02}.png').convert('RGB')).astype(float) for i in range(16)]
USE = list(range(16))  # all 16: dropping 15 raised the 14->0 seam to 1.75x the mean motion.
FOOT, CANVAS, TARGET_H = 432, 480, 0.805 * 480

def key(a):
    a = a.copy(); excess = a[:, :, 1] - np.maximum(a[:, :, 0], a[:, :, 2])
    alpha = np.clip((55 - excess) / 35, 0, 1) * 255
    a[:, :, 1] = np.minimum(a[:, :, 1], np.maximum(a[:, :, 0], a[:, :, 2]))
    im = Image.fromarray(a.astype('uint8')).convert('RGBA')
    im.putalpha(Image.fromarray(alpha.astype('uint8')).filter(ImageFilter.MinFilter(3)))
    return im

def solid_box(im):
    return im.getchannel('A').point(lambda v: 255 if v >= 32 else 0).getbbox()

keyed = [key(raw[i]) for i in USE]
b0 = solid_box(keyed[0]); scale = TARGET_H / (b0[3] - b0[1])
frames, report = [], []
for n, im in zip(USE, keyed):
    s = im.resize((round(640 * scale), round(640 * scale)), Image.Resampling.LANCZOS)
    b = solid_box(s)
    f = Image.new('RGBA', (CANVAS, CANVAS))
    f.alpha_composite(s, ((CANVAS - s.width) // 2, FOOT - b[3]))  # fixed x, per-frame foot plant
    fb = solid_box(f); assert fb[0] > 0 and fb[1] > 0 and fb[2] < CANVAS and fb[3] == FOOT, (n, fb)
    f.save(o / f'move-{n:03}.png'); frames.append(f); report.append({'source': n, 'bbox': fb})
atlas = Image.new('RGBA', (1920, 1920))
for i, f in enumerate(frames): atlas.alpha_composite(f, (i % 4 * 480, i // 4 * 480))
atlas.save(o / 'bear-humanoid-v1.png')
loop = sum(durations[i] for i in USE) / 1000
manifest = {'version': 2, 'width': 1920, 'height': 1920, 'facing': 'left', 'anchor': [.5, .9],
            'frames': {f'move-{i:03}': {'x': i % 4 * 480, 'y': i // 4 * 480, 'w': 480, 'h': 480} for i in range(len(frames))},
            'clips': {'move': {'frames': [f'move-{i:03}' for i in range(len(frames))], 'fps': len(frames) / loop, 'loop': True}},
            'damageEvents': [], 'sourceSha256': hashlib.sha256((o / 'bear-humanoid-v1.png').read_bytes()).hexdigest()}
(o / 'bear-humanoid-v1.json').write_text(json.dumps(manifest, indent=2) + '\n')
preview, tiny = [], []
for f in frames:
    bg = Image.new('RGBA', (320, 280), '#253632'); bg.alpha_composite(f.resize((220, 220), Image.Resampling.LANCZOS), (50, 30))
    preview.append(bg.convert('RGB')); tiny.append(np.array(bg.resize((120, 105))).astype(float))
d = [durations[i] for i in USE]
preview[0].save(o / 'bear-humanoid-walk.gif', save_all=True, append_images=preview[1:], duration=d, loop=0)
frames[0].save(o / 'bear-humanoid-walk.webp', save_all=True, append_images=frames[1:], duration=d, loop=0, lossless=True)
mean = float(np.mean([np.abs(a - b).mean() for a, b in zip(tiny, tiny[1:])])); seam = float(np.abs(tiny[-1] - tiny[0]).mean())
contact = Image.new('RGB', (4 * 240, 4 * 240), '#253632'); dr = ImageDraw.Draw(contact)
for i, f in enumerate(frames):
    t = f.resize((240, 240), Image.Resampling.LANCZOS); contact.paste(t, (i % 4 * 240, i // 4 * 240), t); dr.text((i % 4 * 240 + 6, i // 4 * 240 + 6), str(i), fill='white')
contact.save(o / 'contact.png')
(o / 'final_outputs.json').write_text(json.dumps(dict(status='review_candidate', runtimeIntegrated=False, sourceFrames=USE, scale=scale,
    nativeFrameSize=480, frameCount=len(frames), loopDuration=loop, seam=seam, motionMean=mean, seamRatio=seam / mean, frames=report), indent=2))
print('frames', len(frames), 'scale', round(scale, 4), 'loop', loop, 'seam/motion', round(seam / mean, 3))

#!/usr/bin/env python3
"""Reuse approved slash upper bodies with the approved planted riding stance."""
import copy
import json
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'design/xianxia-grounded-character-2026-10-28/production'
OUT = ROOT / 'design/xianxia-sword-seal-cast-2026-11-01/flight-qi-fix'
RUNTIME = ROOT / 'cocos-pilot/assets/resources/tower-character'


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    atlas = json.loads((SOURCE / 'ground-actions.json').read_text())
    source = Image.open(SOURCE / 'ground-actions.png').convert('RGBA')

    def cell(index):
        f = atlas['frames'][index]
        return source.crop((f['x'], f['y'], f['x'] + 256, f['y'] + 384))

    planted = np.array(cell(1), dtype=float) / 255
    indices = atlas['clips']['slash']['frames']
    count = len(atlas['frames']) + len(indices)
    sheet = Image.new('RGBA', (2048, ((count + 7) // 8) * 384))
    sheet.paste(source, (0, 0))
    clip = copy.deepcopy(atlas['clips']['slash'])
    clip['frames'] = []
    preview = Image.new('RGBA', (256 * 5, 384 * 3), '#304050')
    # Narrow the stance continuously below the hips, preserving moving sleeves
    # and robe. Join at the boot ankles, never across the swinging hands/robe.
    weight = np.clip((274 - np.arange(384)) / 8, 0, 1)[:, None, None]
    for n, index in enumerate(indices):
        upper = np.array(cell(index), dtype=float) / 255
        xs = np.where((upper[274:285, :, 3] > .4).any(axis=0))[0]
        feet = [g for g in np.split(xs, np.where(np.diff(xs) > 1)[0] + 1) if len(g) > 2]
        assert len(feet) == 2
        left, right = [float((g.min() + g.max()) / 2) for g in feet]
        grid = np.arange(256)
        foot_map = np.interp(grid, [0, 122, 152, 255], [0, left, right, 255])
        premult = upper.copy()
        premult[:, :, :3] *= premult[:, :, 3:]
        for y in range(214, 274):
            t = min(1, (y - 214) / 48)
            t = t * t * (3 - 2 * t)
            coords = grid * (1 - t) + foot_map * t
            for channel in range(4):
                upper[y, :, channel] = np.interp(coords, grid, premult[y, :, channel])
            upper[y, :, :3] /= np.maximum(upper[y, :, 3:], 1e-8)
        alpha = upper[:, :, 3:] * weight + planted[:, :, 3:] * (1 - weight)
        rgb = (upper[:, :, :3] * upper[:, :, 3:] * weight
               + planted[:, :, :3] * planted[:, :, 3:] * (1 - weight))
        rgba = np.concatenate((rgb / np.maximum(alpha, 1e-8), alpha), axis=2)
        pixels = np.uint8(np.clip(rgba * 255 + .5, 0, 255))
        pixels[274:] = np.array(cell(1))[274:]
        frame = Image.fromarray(pixels)
        assert np.array_equal(np.array(frame)[274:], np.array(cell(1))[274:])
        slot = len(atlas['frames'])
        info = {**atlas['frames'][index], 'x': slot % 8 * 256, 'y': slot // 8 * 384}
        def mapped(point):
            px, py = point
            t = np.clip((py - 214) / 48, 0, 1)
            t = t * t * (3 - 2 * t)
            return [float(np.interp(px, grid * (1 - t) + foot_map * t, grid)), py]
        info['grip'] = mapped(info['grip'])
        info['guard'] = mapped(info['guard'])
        atlas['frames'].append(info)
        clip['frames'].append(slot)
        sheet.paste(frame, (info['x'], info['y']))
        preview.alpha_composite(frame, (n % 5 * 256, n // 5 * 384))
    atlas['height'] = sheet.height
    atlas['clips']['flightSlash'] = clip
    sheet.save(OUT / 'ground-actions.png', optimize=True)
    (OUT / 'ground-actions.json').write_text(json.dumps(atlas, ensure_ascii=False, indent=2) + '\n')
    preview.convert('RGB').save(OUT / 'contact.jpg')
    for name in ['ground-actions.png', 'ground-actions.json']:
        (RUNTIME / name).write_bytes((OUT / name).read_bytes())
    print(f'{len(indices)} riding slash frames; soles identical; original frames and sources preserved.')


if __name__ == '__main__':
    main()

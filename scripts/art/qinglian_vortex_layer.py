#!/usr/bin/env python3
"""Key the grey background out of the 青莲剑阵 vortex reference and split the centre pool.

Input (never modified): design/xianxia-qinglian-2026-11-09/source/vortex-reference-1536x1024.png
Output (design/xianxia-qinglian-2026-11-09/processed/):
  qinglian-vortex-layer-v1.png  petal/ring layer, centre pool removed
  qinglian-pool-v1.png          centre pool only, alpha scaled to 0.35
  qa-on-dark.png                layer composited on a dark ground for review
Runtime copies go to cocos-pilot/assets/resources/tower-skill-fx/ with the same names.
"""
import hashlib
import shutil
import statistics
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "design/xianxia-qinglian-2026-11-09/source/vortex-reference-1536x1024.png"
OUT = ROOT / "design/xianxia-qinglian-2026-11-09/processed"
RUNTIME = ROOT / "cocos-pilot/assets/resources/tower-skill-fx"
POOL_CENTRE = (768, 490)
POOL_RADII = (180, 110)
POOL_ALPHA = 0.35
MARGIN = 16


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def measure_background(im):
    w, h = im.size
    px = im.load()
    edge = []
    for x in range(0, w, 4):
        edge.append(px[x, 0])
        edge.append(px[x, h - 1])
    for y in range(0, h, 4):
        edge.append(px[0, y])
        edge.append(px[w - 1, y])
    return tuple(int(statistics.median(p[i] for p in edge)) for i in range(3))


def main():
    before = sha256(SRC)
    im = Image.open(SRC).convert("RGB")
    w, h = im.size
    bg = measure_background(im)
    src = im.load()
    layer = Image.new("RGBA", im.size)
    pool = Image.new("RGBA", im.size)
    lp, pp = layer.load(), pool.load()
    cx, cy = POOL_CENTRE
    rx, ry = POOL_RADII
    for y in range(h):
        for x in range(w):
            r, g, b = src[x, y]
            diff = max(abs(r - bg[0]), abs(g - bg[1]), abs(b - bg[2]))
            a = min(1.0, max(0.0, (diff - 6) / 34))
            if a <= 0:
                continue
            # Unpremultiply against the measured background to remove the grey halo.
            if a >= 0.05:
                colour = [min(255, max(0, round(bg[i] + (src[x, y][i] - bg[i]) / a))) for i in range(3)]
            else:
                colour = [r, g, b]
            inside = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.0
            if inside:
                # The centre pool goes to its own layer, so the petal layer stays clear of it.
                pp[x, y] = (*colour, round(255 * a * POOL_ALPHA))
            else:
                lp[x, y] = (*colour, round(255 * a))
    # Pool alpha on the petal layer is zero inside the ellipse; the pool layer holds the water.
    bbox = layer.getchannel("A").getbbox()
    if bbox is None:
        raise SystemExit("no foreground found; check background measurement")
    left = max(0, bbox[0] - MARGIN)
    top = max(0, bbox[1] - MARGIN)
    right = min(w, bbox[2] + MARGIN)
    bottom = min(h, bbox[3] + MARGIN)
    box = (left, top, right, bottom)
    layer = layer.crop(box)
    pool = pool.crop(box)

    OUT.mkdir(parents=True, exist_ok=True)
    layer_path = OUT / "qinglian-vortex-layer-v1.png"
    pool_path = OUT / "qinglian-pool-v1.png"
    layer.save(layer_path)
    pool.save(pool_path)

    dark = Image.new("RGBA", layer.size, (18, 22, 28, 255))
    dark.alpha_composite(layer)
    dark.alpha_composite(pool)
    dark.convert("RGB").save(OUT / "qa-on-dark.png")

    RUNTIME.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(layer_path, RUNTIME / layer_path.name)
    shutil.copyfile(pool_path, RUNTIME / pool_path.name)

    after = sha256(SRC)
    if before != after:
        sys.exit("source reference was modified")
    print(f"background={bg} crop={box} size={layer.size}")
    print(f"layer_alpha_max={layer.getchannel('A').getextrema()[1]} "
          f"pool_alpha_max={pool.getchannel('A').getextrema()[1]}")
    print(f"source_sha256={after}")


if __name__ == "__main__":
    main()

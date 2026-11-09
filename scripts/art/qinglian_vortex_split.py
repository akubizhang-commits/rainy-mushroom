"""Split the 青莲 vortex (v2) into an outer layer (large petals) and an inner layer (small petals).

Each output is normalised to a circle: the elliptical reference (about 409:263 on screen) is
stretched vertically until the ring is round, so the layer can rotate as a flat disc. The
game squashes the parent back to the ellipse, which gives a ground-plane turn.

Inputs are read only. Outputs are written beside the design sources and copied to the Cocos
runtime folder. Split uses a radial soft mask. Alpha in the two layers sums to the v2 alpha.
"""
from pathlib import Path
import uuid
import numpy as np
from PIL import Image

SPLIT = 0.52      # radius (fraction of ring radius) where the inner and outer petals meet
FEATHER = 0.05    # half-width of the blend band, same fraction
PAD = 16          # pixels kept around the round ring
ROOT = Path(__file__).resolve().parents[2]
PROCESSED = ROOT / "design/xianxia-qinglian-2026-11-09/processed"
RUNTIME = ROOT / "cocos-pilot/assets/resources/tower-skill-fx"
SOURCE = PROCESSED / "qinglian-vortex-layer-v2.png"


def smoothstep(edge0, edge1, x):
    t = np.clip((x - edge0) / (edge1 - edge0), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def ring_box(alpha):
    ys, xs = np.where(alpha > 8)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def main():
    im = Image.open(SOURCE).convert("RGBA")
    arr = np.array(im).astype(np.float32)
    x0, y0, x1, y1 = ring_box(arr[..., 3])
    width, height = x1 - x0, y1 - y0
    # Stretch the ring's height to its width so the ellipse becomes a circle.
    cropped = im.crop((x0, y0, x1, y1)).resize((width, width), Image.LANCZOS)
    arr = np.array(cropped).astype(np.float32)
    side = width + 2 * PAD
    canvas = np.zeros((side, side, 4), np.float32)
    canvas[PAD:PAD + width, PAD:PAD + width] = arr
    ys, xs = np.mgrid[0:side, 0:side].astype(np.float32)
    radius = np.hypot(xs - side / 2 + .5, ys - side / 2 + .5) / (width / 2)
    blend = smoothstep(SPLIT - FEATHER, SPLIT + FEATHER, radius)
    outer = canvas.copy(); outer[..., 3] = canvas[..., 3] * blend
    inner = canvas.copy(); inner[..., 3] = canvas[..., 3] * (1 - blend)
    for name, layer in [("outer", outer), ("inner", inner)]:
        image = Image.fromarray(np.clip(layer, 0, 255).round().astype(np.uint8), "RGBA")
        for folder in (PROCESSED, RUNTIME):
            image.save(folder / f"qinglian-vortex-{name}-v3.png")
        print(f"wrote qinglian-vortex-{name}-v3.png", image.size, "alpha max", int(layer[..., 3].max()))
    check = canvas[..., 3]
    summed = outer[..., 3] + inner[..., 3]
    print("alpha sum error max", float(np.abs(summed - check).max()))
    print("ring box", (x0, y0, x1, y1), "canvas", side)


if __name__ == "__main__":
    main()

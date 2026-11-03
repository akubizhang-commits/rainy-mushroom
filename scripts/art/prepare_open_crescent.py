"""Remap the approved icy blade into an open 220-degree moon; no generation.

The white ridge is mapped to the collision circle. Source color/alpha and
lengthwise texture remain intact. Outputs have new paths; sources are read-only.
"""
from pathlib import Path
import hashlib
import json
import sys

import numpy as np
from PIL import Image, ImageDraw

from prepare_sword_qi import image_meta

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "design/xianxia-crescent-220-2026-11-02"
SOURCE = ROOT / "cocos-pilot/assets/resources/tower-skill-fx/sword-qi-crescent-v1.png"
DEST = ROOT / "cocos-pilot/assets/resources/tower-skill-fx/sword-qi-crescent-220-v2.png"


def render():
    src = np.asarray(Image.open(SOURCE).convert("RGBA")).astype(float)
    # Locate the actual white edge per row rather than stretching the shallow
    # source's bounding rectangle. A weighted smooth fit ignores isolated sparks.
    white = np.min(src[:, :, :3], axis=2) * src[:, :, 3] / 255
    ridge = np.argmax(white, axis=1).astype(float)
    rows = np.arange(512)
    fit_rows = (rows >= 25) & (rows <= 490)
    ridge_curve = np.polynomial.Polynomial.fit(rows[fit_rows], ridge[fit_rows], 6,
                                              w=np.sqrt(white.max(axis=1)[fit_rows]))
    yy, xx = np.mgrid[:1536, :1152] / 3
    theta = np.arctan2(256 - yy, xx - 130)
    radius = np.hypot(xx - 130, 256 - yy)
    old_theta = theta * 45 / 110
    sy = 256 - 237 * np.sin(old_theta) / np.sqrt(.5)
    sy = np.clip(sy, 0, 510.999)
    ridge_at = ridge_curve(sy)
    sx = ridge_at + (radius - 220) * 474 / 440
    valid = (np.abs(theta) <= np.deg2rad(110)) & (sx >= 0) & (sx < 159)
    sx = np.clip(sx, 0, 158.999)
    x0, y0 = sx.astype(int), sy.astype(int)
    wx, wy = (sx-x0)[..., None], (sy-y0)[..., None]
    # Interpolate premultiplied pixels to avoid dark transparent fringes.
    src[:, :, :3] *= src[:, :, 3:4] / 255
    pixels = ((src[y0, x0]*(1-wx) + src[y0, x0+1]*wx)*(1-wy)
              + (src[y0+1, x0]*(1-wx) + src[y0+1, x0+1]*wx)*wy)
    pixels[:, :, :3] = np.divide(pixels[:, :, :3]*255, pixels[:, :, 3:4],
                                out=np.zeros_like(pixels[:, :, :3]),
                                where=pixels[:, :, 3:4] > 0)
    tip_fade = np.clip((110 - np.abs(np.rad2deg(theta))) / 5, 0, 1)
    pixels[:, :, 3] *= valid * tip_fade
    pixels = np.clip(pixels, 0, 255).astype("uint8")
    pixels[pixels[:, :, 3] == 0, :3] = 0
    return Image.fromarray(pixels).resize((384, 512), Image.Resampling.LANCZOS)


def main():
    if DEST.exists():
        sys.exit("Output already exists; preserve it and choose a new version.")
    OUT.mkdir(parents=True, exist_ok=True)
    source_hash = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
    image = render()
    a = np.asarray(image)[:, :, 3]
    assert not any((a[0].any(), a[-1].any(), a[:, 0].any(), a[:, -1].any()))
    image.save(DEST)
    image_meta(DEST)
    image.save(OUT / "moon-220-rgba.png")
    comparison = Image.new("RGB", (900, 600), (24, 39, 44))
    comparison.paste(Image.open(SOURCE), (120, 60), Image.open(SOURCE))
    comparison.paste(image, (450, 60), image)
    d = ImageDraw.Draw(comparison)
    d.text((105, 25), "BEFORE - SHALLOW ARC", fill="white")
    d.text((440, 25), "AFTER - 220 DEG / 140 DEG OPENING", fill="white")
    comparison.save(OUT / "comparison.png")
    assert hashlib.sha256(SOURCE.read_bytes()).hexdigest() == source_hash
    contract = {
        "source": str(SOURCE.relative_to(ROOT)), "sourceSha256": source_hash,
        "output": str(DEST.relative_to(ROOT)),
        "outputSha256": hashlib.sha256(DEST.read_bytes()).hexdigest(),
        "size": [384, 512], "span": 440, "anchor": [350/384, .5],
        "circleCenterPixels": [130, 256], "radiusPixels": 220,
        "arcDegrees": 220, "rearOpeningDegrees": 140,
        "mapping": "Source white ridge to radius220, original colors/alpha bilinearly resampled.",
        "alphaEdgesEmpty": True, "sourcePreserved": True,
        "generationCalls": 0, "costCU": 0, "uploads": 0,
    }
    (OUT / "art-contract.json").write_text(json.dumps(contract, indent=2) + "\n")
    print(json.dumps(contract, indent=2))


if __name__ == "__main__":
    main()

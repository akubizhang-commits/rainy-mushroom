"""Pack the user-approved open sword arc into a pivot-aligned Cocos atlas.

Only approved straight-alpha PNG frames are used; never re-key the MP4.
Run with the bundled Python (Pillow + numpy); --check validates without writing.
"""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / "design/xianxia-sword-arc-v2-2026-10-30"
DEST = ROOT / "cocos-pilot/assets/resources/tower-skill-fx/sword-arc-v2.png"
CONTRACT = ART / "runtime-contract.json"
FRAMES = [3, 4, 6, 7, 9, 10, 11, 13, 14, 16, 17, 18, 20, 21, 23, 24]
CROP = (-24, -56, 792, 760)  # 816 square; source pivot (384,352) stays centered.
CELL = 256
SOURCE_RADIUS = 394


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def build():
    atlas = Image.new("RGBA", (1024, 1024))
    metrics, source_hashes, cells = [], {}, []
    yy, xx = np.mgrid[:CELL, :CELL]
    # A texel represents an area; allow one texel at the analytical boundary.
    dx, dy = xx + .5 - CELL / 2, yy + .5 - CELL / 2
    radius = np.hypot(dx, dy)
    for index, source_index in enumerate(FRAMES):
        source = ART / f"review/frames/{source_index:03d}.png"
        image = Image.open(source)
        assert image.mode == "RGBA" and image.size == (1280, 704), source
        cell = image.crop(CROP).resize((CELL, CELL), Image.Resampling.LANCZOS)
        pixels = np.array(cell)
        # Clear otherwise invisible RGB to keep atlas sampling/interpolation clean.
        pixels[pixels[:, :, 3] == 0, :3] = 0
        cell = Image.fromarray(pixels)
        alpha = pixels[:, :, 3]
        assert not np.any(alpha[[0, -1], :]) and not np.any(alpha[:, [0, -1]]), "Clipped glow"
        visible = alpha > 8
        assert not np.any(visible & (dx < -1)), "Energy behind caster"
        assert not np.any(visible & (np.abs(dy) > dx + 1)), "Energy outside forward sector"
        assert not np.any(visible & (radius > SOURCE_RADIUS * CELL / 816 + 1)), "Beyond hit radius"
        metrics.append({
            "index": index, "sourceFrame": source_index,
            "alphaBounds": cell.getchannel("A").getbbox(),
            "visiblePixels": int(np.count_nonzero(visible)),
            "maximumRadius": round(float(radius[visible].max()), 3) if visible.any() else 0,
        })
        source_hashes[str(source_index)] = digest(source)
        atlas.paste(cell, ((index % 4) * CELL, (index // 4) * CELL))
        cells.append(cell)
    assert metrics[0]["visiblePixels"] > 0, "The hit must start with a visible blade"
    assert any(m["visiblePixels"] > 0 for m in metrics[1:-1])
    assert metrics[-1]["visiblePixels"] == 0, "End with a clean empty frame"
    return atlas, cells, metrics, source_hashes


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    atlas, cells, metrics, hashes = build()
    contract = {
        "approvedAsset": "asset_xoVQvWdHedrAdG8xcxZew9Rh",
        "approvalDate": "2026-10-30",
        "sourceFrames": FRAMES, "sourceFrameSha256": hashes,
        "sourceSize": [1280, 704], "sourcePivot": [384, 352],
        "sourceCrop": list(CROP), "sourceCropSize": [816, 816],
        "sourceRadius": SOURCE_RADIUS, "anchor": [.5, .5],
        "atlasSize": [1024, 1024], "cellSize": [256, 256],
        "columns": 4, "frameCount": 16, "durationSeconds": .25,
        "resource": "tower-skill-fx/sword-arc-v2",
        "direction": "right", "alpha": "straight",
        "worldSize": "effect.radius * 816 / 394",
        "worldPosition": "effect origin minus camera, no forward offset",
        "cadence": "one animation per actual hit event, keyed by effect.id",
        "decodedTextureBytes": 1024 * 1024 * 4,
        "cells": metrics,
    }
    if args.check:
        actual = Image.open(DEST).convert("RGBA")
        assert actual.size == atlas.size and np.array_equal(np.asarray(actual), np.asarray(atlas)), "Atlas differs from approved frames"
        saved = json.loads(CONTRACT.read_text())
        # JSON turns bounding-box tuples into lists.
        expected = json.loads(json.dumps(contract))
        assert saved == expected, "Runtime contract is stale"
    else:
        DEST.parent.mkdir(parents=True, exist_ok=True)
        atlas.save(DEST, optimize=True)
        CONTRACT.write_text(json.dumps(contract, ensure_ascii=False, indent=2) + "\n")
        # Review straight alpha over dark stone, pale UI and a saturated color.
        backgrounds = [(70, 89, 83), (240, 237, 223), (71, 45, 71)]
        preview = Image.new("RGB", (CELL * 4, CELL * 3))
        for row, color in enumerate(backgrounds):
            for col, index in enumerate([0, 3, 7, 12]):
                panel = Image.new("RGBA", (CELL, CELL), (*color, 255))
                panel.alpha_composite(cells[index])
                preview.paste(panel.convert("RGB"), (col * CELL, row * CELL))
        ImageDraw.Draw(preview).text((10, 10), "RGBA over stone / light / violet", fill="white")
        preview.save(ART / "review/runtime-alpha-preview.png")
    print(f"{'Checked' if args.check else 'Packed'} 16 pivot-aligned RGBA frames; no clipped edge or out-of-sector blade.")


if __name__ == "__main__":
    main()

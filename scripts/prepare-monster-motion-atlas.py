"""Package existing boar review frames only. No generation or runtime writes."""
from pathlib import Path
import hashlib
import json

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "design/xianxia-monster-motion-2026-10-29"
# Keep newly delivered material in the currently authorized output directory.
OUT = ROOT / "design/sect-scene-2026-10-29/boar-handoff"
OUT.mkdir(parents=True, exist_ok=True)
paths = sorted((SOURCE / "alpha-review-frames").glob("boar-*.png"))
assert len(paths) == 62
atlas = Image.new("RGBA", (2048, 2048))
frames, small = {}, []
for i, path in enumerate(paths):
    im = Image.open(path).convert("RGBA")
    assert im.size == (480, 480)
    # Fixed canvas scale and 2px transparent gutter; never recenter individual poses.
    tile = im.resize((252, 252), Image.Resampling.LANCZOS)
    x, y = (i % 8) * 256 + 2, (i // 8) * 256 + 2
    atlas.paste(tile, (x, y))
    frames[path.stem] = {
        "frame": {"x": x, "y": y, "w": 252, "h": 252},
        "rotated": False, "trimmed": False,
        "spriteSourceSize": {"x": 0, "y": 0, "w": 252, "h": 252},
        "sourceSize": {"w": 252, "h": 252},
        "sourceReviewFrame": i + 1, "sourceTimeSeconds": i / 12,
        "alphaBounds": tile.getchannel("A").getbbox(),
    }
    a = np.array(im.resize((120, 120)), dtype=float) / 255
    small.append(np.concatenate((a[:, :, :3] * a[:, :, 3:], a[:, :, 3:]), axis=2))
atlas.save(OUT / "boar-review-atlas.png")
search = []
for start in range(1, 19):
    for count in range(12, 21):
        end = start + count - 1
        if end >= 31:
            continue
        baseline = float(np.mean([
            np.abs(small[i + 1] - small[i]).mean() for i in range(start, end)
        ]))
        seam = float(np.abs(small[end] - small[start]).mean())
        search.append({"first": start + 1, "last": end + 1,
                       "baseline": baseline, "seam": seam,
                       "ratio": seam / baseline})
search.sort(key=lambda row: row["ratio"])
metadata = {
    "frames": frames,
    "meta": {"image": "boar-review-atlas.png", "format": "RGBA8888",
             "size": {"w": 2048, "h": 2048}, "scale": 1,
             "coordinateOrigin": "top-left", "columns": 8,
             "cellSize": 256, "gutterPixels": 2},
    "integration": {
        "status": "review_only_do_not_enable_in_production",
        "runtimeIntegrated": False, "productionApproved": False,
        "facing": "three-quarter left",
        "anchor": {"normalized": [0.5, 0.5], "meaning": "fixed source canvas center, not calibrated foot pivot"},
        "sourceCanvas": [480, 480], "sourceToFrameScale": 252 / 480,
        "perFrameTranslation": False, "fps": 12,
        "damageEvents": [], "hitFrame": None,
        "combatContract": "Visual-only candidate; never derive hitboxes, damage, reach, or telegraph timing from these frames.",
    },
    "clips": {
        "fullReview": {"frames": list(frames), "loop": False},
        "walkCandidate": {"sourceFrames": list(range(search[0]["first"], search[0]["last"] + 1)),
                          "loop": False, "approved": False},
        "attackReview": {"sourceFrames": list(range(31, 63)), "loop": False,
                         "approved": False, "hitFrame": None,
                         "note": "Contains preparation, upward gore and recovery; visual ranges only."},
    },
    "validation": {
        "bestWalkSeam": search[0], "seamAcceptanceRatioMax": 1,
        "walkSeamPassed": search[0]["ratio"] <= 1,
        "alphaProductionApproved": False,
        "reason": "Best 12-20-frame walk window has >2x normal motion at wrap; local chroma matte and foot pivot still require approval.",
        "searchMethod": "First 31 review frames, exclude first source frame as start; premultiplied RGB+alpha MAD at 120px; compare wrap to window mean consecutive delta.",
    },
    "provenance": {"jobId": "job_k3nbPaTgmeGqDu1VM9vGGHvu",
                   "sourceAssetId": "asset_Jk6jAHSPBz7KGuUdkdgtNsrh",
                   "paidGenerationAdded": False,
                   "atlasSha256": hashlib.sha256((OUT / "boar-review-atlas.png").read_bytes()).hexdigest()},
}
(OUT / "boar-review-atlas.json").write_text(json.dumps(metadata, indent=2) + "\n")
(OUT / "seam-search.json").write_text(json.dumps(search, indent=2) + "\n")
# Verify the texture-packer-style rects recover the exact resized source pixels.
saved = Image.open(OUT / "boar-review-atlas.png")
for path, row in zip(paths, frames.values()):
    r = row["frame"]
    extracted = saved.crop((r["x"], r["y"], r["x"] + r["w"], r["y"] + r["h"]))
    expected = Image.open(path).convert("RGBA").resize((252, 252), Image.Resampling.LANCZOS)
    assert extracted.tobytes() == expected.tobytes()
print(json.dumps({"frameCount": len(frames), "rectRoundTrip": "pass",
                  "bestWalkSeam": search[0], "productionApproved": False}, indent=2))

"""Reuse approved crescent and line textures for the travelling sword-qi pair.

The old material is never changed. The exported crescent is byte-identical to
its approved single-body crop; the cross combines two copies of one line frame.
"""
from pathlib import Path
import hashlib
import json
import math
import shutil
import uuid

import numpy as np
from PIL import Image, ImageChops, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "design/xianxia-sword-qi-integration-2026-10-30/art"
DEST = ROOT / "cocos-pilot/assets/resources/tower-skill-fx"
CRESCENT = ROOT / "design/xianxia-sword-arc-flight-2026-10-30/attempt-01/components/body-approved-frame006-rgba.png"
LINE = DEST / "sword-line-v1.png"


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def image_meta(path):
    identifier = str(uuid.uuid4())
    data = {
        "ver": "1.0.27", "importer": "image", "imported": True,
        "uuid": identifier, "files": [".json", ".png"],
        "subMetas": {"6c48a": {
            "importer": "texture", "uuid": identifier + "@6c48a",
            "displayName": path.stem, "id": "6c48a", "name": "texture",
            "userData": {"wrapModeS": "clamp-to-edge", "wrapModeT": "clamp-to-edge",
                         "minfilter": "linear", "magfilter": "linear", "mipfilter": "none",
                         "anisotropy": 0, "isUuid": True,
                         "imageUuidOrDatabaseUri": identifier, "visible": False},
            "ver": "1.0.22", "imported": True, "files": [".json"], "subMetas": {},
        }},
        "userData": {"type": "texture", "fixAlphaTransparencyArtifacts": False,
                     "hasAlpha": True, "redirect": identifier + "@6c48a"},
    }
    path.with_suffix(path.suffix + ".meta").write_text(json.dumps(data, indent=2) + "\n")


def main():
    OUT.mkdir(parents=True, exist_ok=False)
    before = {str(p.relative_to(ROOT)): sha(p) for p in [CRESCENT, LINE]}
    crescent_dest = DEST / "sword-qi-crescent-v1.png"
    cross_dest = DEST / "sword-qi-cross-v1.png"
    assert not crescent_dest.exists() and not cross_dest.exists(), "Never overwrite an existing version"
    shutil.copyfile(CRESCENT, crescent_dest)
    line = Image.open(LINE).convert("RGBA").crop((0, 0, 1024, 128))
    cross = Image.new("RGBA", (512, 512))
    # Two diagonals: the centreline endpoints are (64,64)/(448,448), mirrored.
    for sign in [-1, 1]:
        start_y = 64 if sign == 1 else 448
        along = 985 / 768
        norm = math.sqrt(2)
        affine = (along, sign * along, 19 - along * (64 + sign * start_y),
                  -sign * norm, norm, 64 + sign * norm * 64 - norm * start_y)
        blade = line.transform((512, 512), Image.Transform.AFFINE,
                               affine, Image.Resampling.BICUBIC)
        cross = Image.alpha_composite(cross, blade)
    pixels = np.array(cross)
    pixels[pixels[:, :, 3] == 0, :3] = 0
    cross = Image.fromarray(pixels)
    cross.save(cross_dest, optimize=True)
    for p in [crescent_dest, cross_dest]:
        image_meta(p)
    sheet = Image.new("RGB", (768, 512), (25, 46, 50))
    crescent = Image.open(crescent_dest).convert("RGBA")
    sheet.paste(crescent, (35, 0), crescent)
    sheet.paste(cross, (256, 0), cross)
    sheet.save(OUT / "reused-sword-qi-components.png")
    records = []
    for path, anchor, span in [(crescent_dest, [138 / 160, .5], 474),
                              (cross_dest, [448 / 512, .5], 384)]:
        im = Image.open(path).convert("RGBA")
        alpha = np.array(im)[:, :, 3]
        assert not alpha[0].any() and not alpha[-1].any()
        assert not alpha[:, 0].any() and not alpha[:, -1].any()
        yy, xx = np.where(alpha > 8)
        records.append({"path": str(path.relative_to(ROOT)), "sha256": sha(path),
                        "size": list(im.size), "anchor": anchor, "referenceSpan": span,
                        "alphaGT8Bounds": [int(xx.min()), int(yy.min()), int(xx.max()), int(yy.max())]})
    for name, digest in before.items():
        assert sha(ROOT / name) == digest
    contract = {"sourceHashes": before, "sourcesUnchanged": True,
                "newGenerationCalls": 0, "newGenerationCostCU": 0, "cloudUploads": 0,
                "crescent": "Byte-identical approved body crop; front alpha reference x138, vertical span474.",
                "cross": "Two affine copies of approved sword-line-v1 frame0. One merged X, no extra hit beat.",
                "geometry": "World x/y is forward edge centre. Cross centreline x in [-width,0], y in [-width/2,width/2].",
                "assets": records}
    (OUT / "source-and-runtime-contract.json").write_text(json.dumps(contract, ensure_ascii=False, indent=2) + "\n")
    shutil.copyfile(__file__, OUT / "prepare_sword_qi.py")
    print(json.dumps(contract, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

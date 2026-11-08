"""Derive horizontal held swords from existing HD art; preserve all source images."""
from pathlib import Path
import hashlib
import json
import math
import re
import uuid
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "cocos-pilot/assets/resources/tower-held-weapons-v2"
REPORT = ROOT / "reports/held-weapons-2026-11-05"
# Hand-measured guard centers and blade tips in the approved 512px illustrations.
SWORDS = json.loads(Path(__file__).with_name("held_weapon_specs.json").read_text())

def pad_for_mipmaps(image):
    """Keep visible pixels intact; POT storage also supports WebGL 1 mipmaps."""
    width = 1 << (image.width + 31).bit_length()
    height = 1 << (image.height + 31).bit_length()
    offset = (16, (height-image.height)//2)
    result = Image.new("RGBA", (width, height))
    result.paste(image, offset)
    a = np.array(result)
    rgb = a[:, :, :3].astype(np.float32)
    known = a[:, :, 3] > 0
    # Extend only invisible RGB so filtered transparent edges do not turn black.
    # Alpha, source silhouettes, and all visible colors remain exactly unchanged.
    for _ in range(12):
        k = np.pad(known, 1)
        c = np.pad(rgb, ((1,1),(1,1),(0,0)))
        count = np.zeros(known.shape, dtype=np.float32)
        total = np.zeros(rgb.shape, dtype=np.float32)
        for ys, xs in [(slice(None,-2),slice(1,-1)), (slice(2,None),slice(1,-1)),
                       (slice(1,-1),slice(None,-2)), (slice(1,-1),slice(2,None))]:
            valid = k[ys,xs]
            count += valid
            total += c[ys,xs] * valid[:,:,None]
        fill = ~known & (count > 0)
        rgb[fill] = total[fill] / count[fill,None]
        known |= fill
    a[:,:,:3] = np.rint(rgb).clip(0,255).astype(np.uint8)
    return Image.fromarray(a), offset


def main():
    OUT.mkdir(exist_ok=True)
    REPORT.mkdir(exist_ok=True, parents=True)
    records = {}
    for name, spec in SWORDS.items():
        guard, tip, display_length = spec["guard"], spec["tip"], spec["bladeLength"]
        source = ROOT / f"cocos-pilot/assets/resources/tower-library-items/{name}.png"
        im = Image.open(source).convert("RGBA")
        length = math.dist(guard, tip)
        dx, dy = (tip[0]-guard[0])/length, (tip[1]-guard[1])/length
        # Inverse sampling: blade points right; guard starts at (220, 380).
        result = im.transform((1000, 760), Image.Transform.AFFINE,
            (dx, -dy, guard[0]-220*dx+380*dy,
             dy, dx, guard[1]-220*dy-380*dx),
            Image.Resampling.BICUBIC)
        bounds = result.getbbox()
        result = result.crop((bounds[0]-2, bounds[1]-2, bounds[2]+2, bounds[3]+2))
        gx, gy = 222-bounds[0], 382-bounds[1]
        source_size = result.size
        result, offset = pad_for_mipmaps(result)
        gx += offset[0]
        gy += offset[1]
        result.save(OUT / f"{name}.png")
        records[name] = dict(width=result.width, height=result.height, guard=[gx,gy],
            bladePixels=round(length, 4), bladeLength=display_length,
            sourceRect=[*offset, *source_size], transparentRgbDilation=12,
            source=str(source.relative_to(ROOT)), sha256=hashlib.sha256(source.read_bytes()).hexdigest())
        meta = OUT / f"{name}.png.meta"
        if not meta.exists():
            original = json.loads(source.with_suffix(".png.meta").read_text())
            old, new = original["uuid"], str(uuid.uuid4())
            meta.write_text(json.dumps(json.loads(json.dumps(original).replace(old,new)), indent=2)+"\n")
    (REPORT / "asset-manifest.json").write_text(json.dumps(records, indent=2)+"\n")
    # Keep one authoritative calibration source; tests loading the rendering class
    # also exercise the generated catalog without a separate runtime resource load.
    catalog = "const HELD_WEAPONS:Record<string,{guard:Pair;bladePixels:number;bladeLength:number}>={\n"
    for name, record in records.items():
        catalog += " " + name + ":" + json.dumps({
            "guard": [round(n) for n in record["guard"]],
            "bladePixels": record["bladePixels"], "bladeLength": record["bladeLength"],
        }, separators=(",", ":")) + ",\n"
    catalog += "};"
    target = ROOT / "cocos-pilot/assets/scripts/TowerCharacterArt.ts"
    content, count = re.subn(r"const HELD_WEAPONS:Record[\s\S]*?\n};", lambda _: catalog, target.read_text())
    if count != 1:
        raise ValueError("Expected exactly one held weapon catalog")
    target.write_text(content)
    print(f"Prepared {len(records)} held weapons; manifest: {REPORT / 'asset-manifest.json'}")


if __name__ == "__main__":
    main()

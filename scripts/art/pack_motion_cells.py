"""Losslessly repack complete square motion cells; never trim or resize a frame."""
import argparse
import hashlib
import json
import math
from pathlib import Path

from PIL import Image


def pack(source: Path, output: Path, max_side: int = 4096):
    manifest = json.loads(source.read_text())
    image = Image.open(source.with_suffix(".png")).convert("RGBA")
    frames = list(manifest["frames"].values())
    sizes = {(f["w"], f["h"]) for f in frames}
    if len(sizes) != 1 or not frames:
        raise ValueError("Only uniform whole-cell atlases are supported")
    cell, height = sizes.pop()
    if cell != height or cell <= 0 or max_side < cell:
        raise ValueError("Cells must be square and fit the maximum side")
    if image.size != (manifest["width"], manifest["height"]):
        raise ValueError("Source image and manifest dimensions differ")
    candidates = []
    for columns in range(1, max_side // cell + 1):
        rows = math.ceil(len(frames) / columns)
        width, height = columns * cell, rows * cell
        if height <= max_side:
            candidates.append((width * height, max(width, height), abs(width - height), -width, columns, rows))
    if not candidates:
        raise ValueError("No layout fits the maximum side")
    _, _, _, _, columns, rows = min(candidates)
    packed = Image.new("RGBA", (columns * cell, rows * cell))
    if packed.width * packed.height >= image.width * image.height:
        raise ValueError("No area reduction; preserve the existing atlas")
    for index, frame in enumerate(frames):
        x, y = frame["x"], frame["y"]
        if x < 0 or y < 0 or x + cell > image.width or y + cell > image.height:
            raise ValueError("Frame outside source image")
        tile = image.crop((x, y, x + cell, y + cell))
        bounds = tile.getchannel("A").getbbox()
        if bounds and (min(bounds[:2]) < 1 or max(bounds[2:]) > cell - 1):
            raise ValueError("Frame lacks transparent border; repacking may cause texture bleed")
        frame["x"], frame["y"] = index % columns * cell, index // columns * cell
        packed.paste(tile, (frame["x"], frame["y"]))  # No mask: retain every RGBA byte.
    output.mkdir(parents=True, exist_ok=True)
    png, metadata = output / source.with_suffix(".png").name, output / source.name
    if png.exists() or metadata.exists():
        raise FileExistsError("Output already exists; preserve previous exports")
    packed.save(png)
    manifest["width"], manifest["height"] = packed.size
    if "sourceSha256" in manifest:
        manifest["sourceSha256"] = hashlib.sha256(png.read_bytes()).hexdigest()
    metadata.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    return {"source": str(source), "output": str(png), "before": image.size, "after": packed.size}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    args = parser.parse_args()
    print(json.dumps(pack(args.manifest, args.output_dir), ensure_ascii=False))

"""Prepare the approved stone ring locally, retaining the untouched source."""
from pathlib import Path
import hashlib
import json
import shutil
import subprocess
import sys
import uuid
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "design/equipment-huyuan-intake"
TARGET = ROOT / "cocos-pilot/assets/resources/tower-equipment/eq_ring_huyuan.png"
OUT.mkdir(parents=True, exist_ok=True)
source = OUT / "eq_ring_huyuan-source.png"
if not source.exists():
    shutil.copyfile(Path.home() / "Downloads/d50cb4f125afa.png", source)
original = Image.open(source).convert("RGB")
assert original.size == (1536, 1536)
# The full ring lies inside this rectangle; the detached watermark lies outside.
ring = original.crop((250, 200, 1330, 1320))
# Flood only the pale background, including the enclosed finger opening.
# Isolated pale mineral highlights remain opaque.
mask = ring.point(lambda v: 255 if v >= 220 else 0).convert("RGB")
pixels = mask.load()
for y in range(mask.height):
    for x in range(mask.width):
        pixels[x, y] = (255, 255, 255) if min(pixels[x, y]) == 255 else (0, 0, 0)
ImageDraw.floodfill(mask, (0, 0), (255, 0, 0))
ImageDraw.floodfill(mask, (550, 700), (255, 0, 0))
alpha = Image.new("L", ring.size, 255)
ap = alpha.load()
for y in range(mask.height):
    for x in range(mask.width):
        if pixels[x, y] == (255, 0, 0):
            ap[x, y] = 0
ring = ring.convert("RGBA")
ring.putalpha(alpha)
master = OUT / "eq_ring_huyuan-master.png"
ring.save(master)
subprocess.run([sys.executable, str(ROOT / "scripts/art/item_icon.py"),
                "--source", str(master), "--output", str(TARGET)], check=True)
template = ROOT / "cocos-pilot/assets/resources/tower-equipment/eq_ring_anxi.png.meta"
data = json.loads(template.read_text())
identifier = str(uuid.uuid5(uuid.NAMESPACE_URL, "rainy-mushroom/tower-equipment/eq_ring_huyuan"))
TARGET.with_suffix(".png.meta").write_text(
    json.dumps(data, indent=2).replace(data["uuid"], identifier)
    .replace("eq_ring_anxi", "eq_ring_huyuan") + "\n")
icon = Image.open(TARGET)
preview = Image.new("RGB", (400, 300))
draw = ImageDraw.Draw(preview)
for row, color in enumerate(["#FBF9F1", "#213833"]):
    draw.rectangle((0, row * 150, 400, row * 150 + 150), fill=color)
    for size, x in [(40, 20), (64, 100), (128, 220)]:
        scaled = icon.resize((size, size), Image.Resampling.LANCZOS)
        preview.paste(scaled, (x, row * 150 + 10), scaled)
preview.save(OUT / "size-review.png")
(OUT / "intake.json").write_text(json.dumps({
    "id": "eq_ring_huyuan",
    "sourceSHA256": hashlib.sha256(source.read_bytes()).hexdigest(),
    "runtimeSize": icon.size,
    "runtimeAlphaBounds": icon.getchannel("A").getbbox(),
    "processing": "Background flood fill, including ring opening; original colors retained.",
}, indent=2) + "\n")

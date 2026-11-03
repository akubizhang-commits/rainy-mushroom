"""Prepare the approved ring batch locally, retaining the untouched source."""
from pathlib import Path
import hashlib
import json
import shutil
import subprocess
import sys
import uuid
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
ITEMS = [
    ("eq_ring_dingxin", "f77f79e8601e4.png", [(750, 930)]),
    ("eq_ring_qinglu", "d461ea9714dc5.png", [(750, 930)]),
    ("eq_ring_wenmai", "ce94c99b3c97a8.png", [(750, 930)]),
    ("eq_ring_wenpo", "96f37ff447c8.png", [(750, 930), (780, 650)]),
]
report = []
preview = Image.new("RGB", (640, 320))
for index, (key, filename, seeds) in enumerate(ITEMS):
    OUT = ROOT / "design/equipment-ring-batch" / key
    TARGET = ROOT / f"cocos-pilot/assets/resources/tower-equipment/{key}.png"
    OUT.mkdir(parents=True, exist_ok=True)
    source = OUT / f"{key}-source.png"
    if not source.exists():
        shutil.copyfile(Path.home() / "Downloads" / filename, source)
    original = Image.open(source).convert("RGB")
    assert original.size == (1536, 1536)
    # The full ring lies inside this rectangle; the detached watermark lies outside.
    ring = original.crop((240, 210, 1330, 1300))
    # Flood only the pale background, including the enclosed finger opening.
    # Isolated pale mineral highlights remain opaque.
    mask = ring.point(lambda v: 255 if v >= 220 else 0).convert("RGB")
    pixels = mask.load()
    for y in range(mask.height):
        for x in range(mask.width):
            pixels[x, y] = (255, 255, 255) if min(pixels[x, y]) == 255 else (0, 0, 0)
    ImageDraw.floodfill(mask, (0, 0), (255, 0, 0))
    for gx, gy in seeds:
        ImageDraw.floodfill(mask, (gx - 240, gy - 210), (255, 0, 0))
    alpha = Image.new("L", ring.size, 255)
    ap = alpha.load()
    for y in range(mask.height):
        for x in range(mask.width):
            if pixels[x, y] == (255, 0, 0):
                ap[x, y] = 0
    ring = ring.convert("RGBA")
    ring.putalpha(alpha)
    master = OUT / f"{key}-master.png"
    ring.save(master)
    subprocess.run([sys.executable, str(ROOT / "scripts/art/item_icon.py"),
                    "--source", str(master), "--output", str(TARGET)], check=True)
    template = ROOT / "cocos-pilot/assets/resources/tower-equipment/eq_ring_anxi.png.meta"
    data = json.loads(template.read_text())
    identifier = str(uuid.uuid5(uuid.NAMESPACE_URL, f"rainy-mushroom/tower-equipment/{key}"))
    TARGET.with_suffix(".png.meta").write_text(
        json.dumps(data, indent=2).replace(data["uuid"], identifier)
        .replace("eq_ring_anxi", key) + "\n")
    icon = Image.open(TARGET)
    download = Path.home() / "Downloads" / filename
    if download.exists():
        assert hashlib.sha256(source.read_bytes()).digest() == hashlib.sha256(download.read_bytes()).digest()
    report.append({"id": key, "sourceSHA256": hashlib.sha256(source.read_bytes()).hexdigest(), "runtimeSize": icon.size, "alphaBounds": icon.getchannel("A").getbbox()})
    for row, color in enumerate(["#FBF9F1", "#213833"]):
        ImageDraw.Draw(preview).rectangle((index*160, row*160, index*160+159, row*160+159), fill=color)
        preview.paste(icon, (index*160+16, row*160+4), icon)
        small=icon.resize((40,40),Image.Resampling.LANCZOS)
        preview.paste(small,(index*160+3,row*160+116),small)
preview.save(ROOT / "design/equipment-ring-batch/size-review.png")
(ROOT / "design/equipment-ring-batch/intake.json").write_text(json.dumps(report, indent=2)+"\n")
print(json.dumps(report, indent=2))

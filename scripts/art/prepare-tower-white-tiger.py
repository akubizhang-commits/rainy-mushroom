"""Create the named white tiger variant without changing ordinary tiger art."""
from pathlib import Path
import colorsys
import json
import uuid
from PIL import Image

root = Path(__file__).resolve().parents[2]
folder = root / "cocos-pilot/assets/resources/tower-monsters"
image = Image.open(folder / "tiger.png").convert("RGBA")
pixels = []
for r, g, b, a in image.getdata():
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    # Lift warm fur toward silver, retaining black stripes, shadows and alpha.
    warm = 0.035 <= h <= 0.19 and s > 0.12
    if warm:
        luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
        silver = min(245, luminance + 82 * min(1, luminance / 100))
        r, g, b = int(silver * .96), int(silver * .98), int(silver)
    pixels.append((r, g, b, a))
image.putdata(pixels)
image.save(folder / "white-tiger.png")
meta = folder / "white-tiger.png.meta"
if not meta.exists():
    source = (folder / "tiger.png.meta").read_text()
    old_id = json.loads(source)["uuid"]
    meta.write_text(source.replace(old_id, str(uuid.uuid4())).replace('"tiger"', '"white-tiger"'))

"""Brighten the 青莲剑阵 static layers (alpha × GAIN) and write v2 copies beside the v1 files.

The v1 layers are read only. v2 keeps the same ellipse proportions and canvas, so the
judgment geometry is unchanged. Runtime copies go to cocos-pilot tower-skill-fx; the design
copies go to design/xianxia-qinglian-2026-11-09/processed.
"""
from pathlib import Path
import uuid
import numpy as np
from PIL import Image

GAIN = 1.6
ROOT = Path(__file__).resolve().parents[2]
PROCESSED = ROOT / "design/xianxia-qinglian-2026-11-09/processed"
RUNTIME = ROOT / "cocos-pilot/assets/resources/tower-skill-fx"
LAYERS = ["qinglian-vortex-layer", "qinglian-pool"]


def boost(src: Path, dst: Path) -> None:
    im = np.array(Image.open(src).convert("RGBA")).astype(np.float32)
    im[..., 3] = np.clip(im[..., 3] * GAIN, 0, 255)
    Image.fromarray(im.round().astype(np.uint8), "RGBA").save(dst)


def new_meta(src_meta: Path, dst_meta: Path, name: str) -> None:
    # Copy the v1 importer settings, with a fresh asset uuid and the new display name.
    old = src_meta.read_text()
    old_uuid = old.split('"uuid": "', 1)[1].split('"', 1)[0]
    fresh = str(uuid.uuid4())
    text = old.replace(old_uuid, fresh).replace(src_meta.name.replace(".meta", "").replace(".png", ""), name)
    dst_meta.write_text(text)


for layer in LAYERS:
    v2 = f"{layer}-v2"
    boost(PROCESSED / f"{layer}-v1.png", PROCESSED / f"{v2}.png")
    boost(RUNTIME / f"{layer}-v1.png", RUNTIME / f"{v2}.png")
    new_meta(RUNTIME / f"{layer}-v1.png.meta", RUNTIME / f"{v2}.png.meta", v2)
    print("wrote", v2)

"""Convert the approved black-background Scenario clip to a runtime RGBA atlas.

Run with the game-assets Python runtime (Pillow) and ffmpeg on PATH.
Black-composited RGB is unpremultiplied by max(R,G,B): ordinary alpha blending
then reproduces the source over black without baking a black fringe.
"""
import json
import subprocess
import tempfile
from pathlib import Path
from PIL import Image, ImageChops, ImageOps

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "design/xianxia-sword-arc-2026-10-30/source/scenario-approved.mp4"
OUT = ROOT / "cocos-pilot/assets/resources/tower-skill-fx"


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    sheet = Image.new("RGBA", (1024, 1024))
    with tempfile.TemporaryDirectory() as temp:
        subprocess.run(["ffmpeg", "-v", "error", "-i", str(SOURCE),
                        "-frames:v", "16", f"{temp}/%03d.png"], check=True)
        for i in range(16):
            image = Image.open(Path(temp) / f"{i+1:03d}.png").convert("RGB")
            # One shared square and anchor across the entire clip; never per-frame trim.
            # Original is 1280x704; extra vertical space retains its edge glow.
            image = ImageOps.mirror(image.crop((224, -64, 1056, 768)))
            image = image.resize((256, 256), Image.Resampling.LANCZOS)
            pixels = []
            for r, g, b in image.getdata():
                light = max(r, g, b)
                # Remove video black-level noise, with continuous soft alpha above it.
                a = max(0, round((light - 8) * 255 / 247))
                pixels.append((round(r * 255 / light), round(g * 255 / light),
                               round(b * 255 / light), a) if a else (0, 0, 0, 0))
            frame = Image.new("RGBA", image.size)
            frame.putdata(pixels)
            assert not ImageChops.lighter(
                frame.getchannel("A").crop((0, 0, 256, 1)),
                frame.getchannel("A").crop((0, 255, 256, 256))
            ).getbbox(), "top/bottom edge clipped"
            assert not frame.getchannel("A").crop((0, 0, 1, 256)).getbbox()
            assert not frame.getchannel("A").crop((255, 0, 256, 256)).getbbox()
            sheet.paste(frame, ((i % 4) * 256, (i // 4) * 256))
    sheet.save(OUT / "sword-arc.png", optimize=True)
    (ROOT / "design/xianxia-sword-arc-2026-10-30/asset-contract.json").write_text(
        json.dumps({"sourceAsset": "asset_7YTazeS3aqxDJxCtVnZHvAUw",
                    "sourceFrames": 49, "sourceFPS": 24, "selectedFrames": [0, 15],
                    "atlas": [1024, 1024], "cell": [256, 256], "frames": 16,
                    "columns": 4, "facing": "right", "alpha": "straight, soft",
                    "towerDurationSeconds": 0.5, "survivorDurationTicks": 28},
                   indent=2) + "\n")
    print(f"Validated 16 RGBA frames: {OUT / 'sword-arc.png'}")


if __name__ == "__main__":
    main()

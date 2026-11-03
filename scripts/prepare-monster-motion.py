"""Local preparation/review only; never submits or retries paid generation."""
from pathlib import Path
from collections import deque
import argparse
import hashlib
import json
import subprocess
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "design/xianxia-monster-motion-2026-10-29"
SOURCE = ROOT / "design/xianxia-monster-demonic-2026-10-28/boar-demonic.png"


def prepare():
    OUT.mkdir(parents=True, exist_ok=True)
    image = Image.open(SOURCE).convert("RGB")
    pixels = np.asarray(image)
    # Flood only light, low-chroma background connected to the canvas edge.
    # This is matte preparation, not generated limb motion.
    eligible = ((pixels[:, :, 0] > 200) & (pixels[:, :, 1] > 180)
                & (pixels[:, :, 2] > 155)
                & (pixels.max(axis=2).astype(int) - pixels.min(axis=2) < 65))
    # Approved ivory tusks share the light background's colors. Preserve their
    # local contour with the more conservative threshold; remove foot shadows
    # using the stronger threshold everywhere else.
    conservative = ((pixels[:, :, 0] > 218) & (pixels[:, :, 1] > 207)
                    & (pixels[:, :, 2] > 178)
                    & (pixels.max(axis=2).astype(int) - pixels.min(axis=2) < 65))
    eligible[510:710, 175:430] = conservative[510:710, 175:430]
    h, w = eligible.shape
    seen = np.zeros((h, w), dtype=bool)
    queue = deque()
    for x in range(w):
        for y in (0, h - 1):
            if eligible[y, x]:
                seen[y, x] = True
                queue.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if eligible[y, x] and not seen[y, x]:
                seen[y, x] = True
                queue.append((x, y))
    while queue:
        x, y = queue.popleft()
        for xx, yy in ((x-1, y), (x+1, y), (x, y-1), (x, y+1)):
            if 0 <= xx < w and 0 <= yy < h and eligible[yy, xx] and not seen[yy, xx]:
                seen[yy, xx] = True
                queue.append((xx, yy))
    alpha = Image.fromarray((~seen).astype("uint8") * 255).filter(ImageFilter.GaussianBlur(.45))
    rgba = image.convert("RGBA")
    rgba.putalpha(alpha)
    bbox = alpha.getbbox()
    subject = rgba.crop(bbox)
    subject.thumbnail((540, 540), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (768, 768))
    xy = ((768-subject.width)//2, 650-subject.height)
    canvas.alpha_composite(subject, xy)
    canvas.save(OUT / "boar-input-alpha.png")
    green = Image.new("RGB", canvas.size, "#00ff00")
    green.paste(canvas, mask=canvas.getchannel("A"))
    green.save(OUT / "boar-input-green.png")
    dark = Image.new("RGB", canvas.size, "#19332f")
    dark.paste(canvas, mask=canvas.getchannel("A"))
    dark.save(OUT / "boar-input-dark-review.png")
    (OUT / "input-provenance.json").write_text(json.dumps({
        "source": str(SOURCE.relative_to(ROOT)),
        "sourceAssetId": "asset_XrHbEDvQ4E4tdToscywYDvzv",
        "sourceSha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
        "sourceBounds": bbox, "inputSize": [768, 768], "subjectSize": list(subject.size),
        "subjectPlacement": xy, "groundBaseline": 650,
        "processing": "Border-connected light-background matte, fixed resize/padding only; no synthesized motion.",
        "inputSha256": hashlib.sha256((OUT / "boar-input-green.png").read_bytes()).hexdigest(),
    }, indent=2) + "\n")


def review(video):
    OUT.mkdir(parents=True, exist_ok=True)
    frames = OUT / "review-frames"
    frames.mkdir(exist_ok=True)
    subprocess.run(["ffmpeg", "-y", "-i", str(video), "-vf", "fps=12",
                    str(frames / "boar-%03d.png")], check=True, capture_output=True)
    paths = sorted(frames.glob("boar-*.png"))
    sample = paths[::3]
    sheet = Image.new("RGB", (5*192, ((len(sample)+4)//5)*216), "#eff0ea")
    draw = ImageDraw.Draw(sheet)
    for i, path in enumerate(sample):
        im = Image.open(path).convert("RGB")
        im.thumbnail((192, 192), Image.Resampling.LANCZOS)
        x, y = i % 5 * 192, i // 5 * 216
        sheet.paste(im, (x, y+24))
        draw.text((x+5, y+5), f"{path.stem} {(int(path.stem[-3:])-1)/12:.2f}s", fill="#15231d")
    sheet.save(OUT / "motion-contact.jpg", quality=94)
    preview = [Image.open(p).convert("RGB").resize((320, 320)) for p in paths]
    # Local inspection proxy only, never an asserted production animation loop.
    preview[0].save(OUT / "motion-review.gif", save_all=True, append_images=preview[1:],
                    duration=83, loop=0, disposal=2)
    result = subprocess.run(["ffprobe", "-v", "error", "-show_streams", "-show_format",
                             "-of", "json", str(video)], capture_output=True, text=True, check=True)
    (OUT / "video-probe.json").write_text(result.stdout)
    alpha_dir = OUT / "alpha-review-frames"
    alpha_dir.mkdir(exist_ok=True)
    dark_frames = []
    records = []
    for i, path in enumerate(paths):
        rgb = np.array(Image.open(path).convert("RGB"), dtype=np.float32)
        excess = rgb[:, :, 1] - np.maximum(rgb[:, :, 0], rgb[:, :, 2])
        alpha = 1 - np.clip((excess - 12) / 65, 0, 1)
        rgb[:, :, 1] = np.minimum(rgb[:, :, 1], np.maximum(rgb[:, :, 0], rgb[:, :, 2]) + 8)
        rgba = Image.fromarray(np.dstack((rgb, alpha*255)).astype("uint8"), "RGBA")
        name = path.name
        rgba.save(alpha_dir / name)
        dark = Image.new("RGB", rgba.size, "#19332f")
        dark.paste(rgba, mask=rgba.getchannel("A"))
        dark_frames.append(dark.resize((320, 320), Image.Resampling.LANCZOS))
        records.append({"frame": i+1, "time": i/12, "file": f"alpha-review-frames/{name}",
                        "bounds": rgba.getchannel("A").getbbox()})
    dark_frames[0].save(OUT / "motion-dark-review.gif", save_all=True, append_images=dark_frames[1:],
                        duration=83, loop=0, disposal=2)
    # Continuous source clip only: not a claim that its final-to-first seam loops.
    small = Image.new("RGB", (5*192, ((len(sample)+4)//5)*170), "#19332f")
    sd = ImageDraw.Draw(small)
    for i, path in enumerate(sample):
        idx = int(path.stem[-3:]) - 1
        rgba = Image.open(alpha_dir / path.name)
        rgba.thumbnail((110, 110), Image.Resampling.LANCZOS)
        x, y = i % 5 * 192, i // 5 * 170
        small.paste(rgba, (x+40, y+24), rgba)
        sd.text((x+10, y+140), f"{idx+1:02d} / {idx/12:.2f}s", fill="white")
    small.save(OUT / "motion-110px-contact.png")
    (OUT / "frames.json").write_text(json.dumps({"fps": 12, "canvas": [480, 480],
        "registered": False, "note": "Fixed source canvas; no per-frame repositioning. Local chroma-key review proxy.",
        "frames": records}, indent=2) + "\n")
    print(f"{len(paths)} review frames")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", type=Path)
    args = parser.parse_args()
    review(args.video) if args.video else prepare()

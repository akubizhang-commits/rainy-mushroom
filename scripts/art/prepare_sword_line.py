"""Export the retained sword-line art and author a longer visual tail.

No AI generation or mutation of prior review media. Runtime keeps the original
16 atlas cells; only the simulation-clock phase curve changes after 50ms.
"""
import argparse
import hashlib
import json
import subprocess
import uuid
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / "design/xianxia-yixiantian-v2-2026-10-30"
SOURCE = ART / "attempt-02"
OUT = ART / "attempt-03-long-tail"
DEST = ROOT / "cocos-pilot/assets/resources/tower-skill-fx/sword-line-v1.png"
ATLAS = SOURCE / "yixiantian-candidate-atlas.png"
FFMPEG = "/opt/homebrew/bin/ffmpeg"
OLD_DURATION, DURATION, IMPACT = .25, .33, .05
FPS, W, H = 24, 1280, 720


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def source_age(age):
    return age if age <= IMPACT else IMPACT + (age - IMPACT) * (OLD_DURATION - IMPACT) / (DURATION - IMPACT)


def interpolated_frame(frames, seconds):
    index = min(len(frames) - 1, seconds * FPS)
    if abs(index - round(index)) < 1e-9:
        return Image.fromarray(frames[round(index)].copy())
    a, b = int(index), min(int(index) + 1, len(frames) - 1)
    fraction = index - a
    # Interpolate premultiplied values and return straight alpha.
    p, q = frames[a].astype(float), frames[b].astype(float)
    alpha = p[:, :, 3] * (1 - fraction) + q[:, :, 3] * fraction
    premul = p[:, :, :3] * p[:, :, 3:] / 255 * (1 - fraction) + q[:, :, :3] * q[:, :, 3:] / 255 * fraction
    rgb = np.divide(premul * 255, alpha[:, :, None], out=np.zeros_like(premul), where=alpha[:, :, None] > 0)
    result = np.dstack((np.clip(rgb, 0, 255), alpha)).astype(np.uint8)
    result[result[:, :, 3] == 0, :3] = 0
    return Image.fromarray(result)


def pipe_video(path, frames, fps):
    proc = subprocess.Popen([FFMPEG, "-hide_banner", "-loglevel", "error", "-f", "rawvideo",
                             "-pixel_format", "rgb24", "-video_size", f"{W}x{H}", "-framerate", str(fps),
                             "-i", "-", "-c:v", "libx264", "-crf", "17", "-pix_fmt", "yuv420p",
                             "-movflags", "+faststart", str(path)], stdin=subprocess.PIPE)
    for frame in frames:
        proc.stdin.write(frame.convert("RGB").tobytes())
    proc.stdin.close()
    assert proc.wait() == 0


def contract():
    return {
        "authorizationDate": "2026-10-30",
        "sourceAsset": "asset_4YzyrST5PiMgbQpz3NwiVZgk",
        "sourceAtlas": str(ATLAS.relative_to(ROOT)),
        "sourceSha256": sha(ATLAS),
        "resource": "tower-skill-fx/sword-line-v1",
        "atlasSize": [4096, 512], "cellSize": [1024, 128], "columns": 4, "frameCount": 16,
        "alpha": "straight", "decodedBytes": 4096 * 512 * 4,
        "sourceCropSize": [928, 116], "sourceLength": 896, "sourceWidth": 72,
        "anchor": [16 / 928, .5],
        "position": "effect origin minus camera; no forward offset",
        "worldSize": ["actual endpoint distance * 928 / 896", "effect.width * 116 / 72"],
        "angle": "atan2(toY-y,toX-x)",
        "oldVisualDuration": OLD_DURATION, "visualDuration": DURATION, "impactDuration": IMPACT,
        "sourceAgeFormula": "age <= .05 ? age : .05 + (age-.05)*(.20/.28)",
        "frameFormula": "floor(sourceAge/.25*16), lifetime < .33",
        "gameplayEffectDuration": .25, "realHitInterval": .16,
        "gameplayModified": False, "newGenerationCostCU": 0,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    expected = contract()
    image = Image.open(ATLAS)
    assert image.mode == "RGBA" and image.size == (4096, 512)
    cells = [image.crop((i % 4 * 1024, i // 4 * 128, (i % 4 + 1) * 1024, (i // 4 + 1) * 128)) for i in range(16)]
    for cell in cells:
        a = np.array(cell)[:, :, 3]
        assert not a[0].any() and not a[-1].any() and not a[:, 0].any() and not a[:, -1].any()
    if args.check:
        assert sha(DEST) == expected["sourceSha256"]
        assert json.loads((OUT / "runtime-contract.json").read_text()) == expected
        result = json.loads((OUT / "retiming-check.json").read_text())
        assert result["status"] == "PASS"
        for info in result["frames"]:
            assert sha(OUT / "frames" / info["name"]) == info["sha256"]
        print("PASS: retained atlas pixels, immutable source, retiming contract and frame hashes.")
        return
    assert not OUT.exists(), "New version directory required; keep all prior media."
    OUT.mkdir()
    (OUT / "frames").mkdir()
    (OUT / "prepare_sword_line.snapshot.py").write_bytes(Path(__file__).read_bytes())
    before = sha(ATLAS)
    if DEST.exists():
        assert sha(DEST) == before, "Never overwrite an unrelated runtime resource."
    else:
        DEST.write_bytes(ATLAS.read_bytes())
    meta_path = Path(str(DEST) + ".meta")
    if not meta_path.exists():
        reference = json.loads((DEST.parent / "sword-arc-v2.png.meta").read_text())
        old = reference["uuid"]
        text = json.dumps(reference, ensure_ascii=False, indent=2).replace(old, str(uuid.uuid4())).replace("sword-arc-v2", "sword-line-v1")
        meta_path.write_text(text + "\n")
    (OUT / "runtime-contract.json").write_text(json.dumps(expected, ensure_ascii=False, indent=2) + "\n")
    sources = [np.array(Image.open(SOURCE / "frames" / f"{i:03d}.png")) for i in range(48)]
    preview_frames, metrics, last_energy = [], [], float("inf")
    yy, xx = np.mgrid[:H, :W]
    for i in range(48):
        # Four-times-slower art review, retaining a two-second container.
        t = i / FPS
        frame = interpolated_frame(sources, source_age(t / 4) * 4)
        path = OUT / "frames" / f"{i:03d}.png"
        frame.save(path)
        p = np.array(frame)
        a = p[:, :, 3]
        assert not np.any((a > 0) & ((xx < 192) | (xx > 1088) | (np.abs(yy - 360) > 36)))
        energy = float((p[:, :, :3].astype(float) * a[:, :, None] / 255).sum())
        assert energy <= last_energy + 1
        last_energy = energy
        if t <= IMPACT * 4:
            assert np.array_equal(p, sources[i]), "Impact phase must remain identical."
        if t >= 1.32:
            assert not a.any()
        metrics.append({"name": path.name, "time": t, "sourceTime": source_age(t / 4) * 4,
                        "energy": round(energy, 4), "sha256": sha(path)})
        black = Image.new("RGB", (W, H))
        black.paste(frame, (0, 0), frame)
        preview_frames.append(black)
    pipe_video(OUT / "yixiantian-long-tail-preview.mp4", preview_frames, FPS)
    preview_frames[0].save(OUT / "impact-black.png")

    # Use exact runtime atlas frames for the real-time old/new comparison.
    font = ImageFont.truetype("/System/Library/Fonts/STHeiti Medium.ttc", 26)
    small = ImageFont.truetype("/System/Library/Fonts/STHeiti Medium.ttc", 19)
    floor = Image.open(ROOT / "cocos-pilot/assets/resources/tower-environment/tower_floor_stone.png").convert("RGB")
    floor = floor.resize((840, 960)).crop((0, 150, 840, 850)).resize((W, H)).convert("RGBA")
    floor.alpha_composite(Image.new("RGBA", (W, H), (8, 16, 24, 80)))
    energy_rows = [[], []]
    def comparison_frames():
        for i in range(240):
            t = i / 60
            frame = floor.copy()
            draw = ImageDraw.Draw(frame)
            draw.text((55, 44), "一线天 · 消散延长对比", font=font, fill=(234, 245, 241))
            draw.text((55, 87), "实时速度 · 三贯间隔0.16秒 · 范围与命中不变 · 合成示意", font=small, fill=(182, 212, 205))
            for row, duration in enumerate([OLD_DURATION, DURATION]):
                y = 290 + row * 220
                label = "原版 0.25秒" if row == 0 else "延尾版 0.33秒"
                draw.text((55, y - 12), label, font=small, fill=(239, 246, 242))
                phase = (t - .4) % 2
                energy = 0
                for pulse in range(3):
                    age = phase - pulse * .16
                    if not 0 <= age < duration:
                        continue
                    phase_age = age if row == 0 else source_age(age)
                    index = min(15, int(phase_age / OLD_DURATION * 16))
                    cell = cells[index]
                    stamp = cell.resize((round(510 * 928 / 896), round(28 * 116 / 72)), Image.Resampling.LANCZOS)
                    frame.alpha_composite(stamp, (round(310 - 510 * 16 / 896), round(y - stamp.height / 2)))
                    energy += int(np.array(cell)[:, :, 3].sum())
                energy_rows[row].append(energy)
            if i in [24, 32, 34, 42, 44, 53, 58]:
                frame.convert("RGB").save(OUT / f"comparison-{i:03d}.png")
            yield frame
    pipe_video(OUT / "yixiantian-tail-comparison.mp4", comparison_frames(), 60)
    assert sha(ATLAS) == before
    (OUT / "retiming-check.json").write_text(json.dumps({
        "status": "PASS", "sourcePreserved": True,
        "unchangedImpactPreviewFrames": list(range(5)),
        "previewFrames": 48, "previewFPS": 24, "previewSeconds": 2,
        "oldVisualDuration": OLD_DURATION, "newVisualDuration": DURATION,
        "comparisonFPS": 60, "comparisonEnergy": energy_rows, "frames": metrics,
    }, ensure_ascii=False, indent=2) + "\n")
    print("Exported sword-line-v1; impact phase preserved and visual tail extended .25 -> .33s.")


if __name__ == "__main__":
    main()

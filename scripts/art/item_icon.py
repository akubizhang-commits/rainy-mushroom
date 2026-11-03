"""Shared HD item-icon contract: centered, aspect-preserving, 98% visible fit."""
from PIL import Image

ITEM_ICON_FILL = 0.98


def fit_item_icon(image, size=128):
    image = image.convert("RGBA")
    bounds = image.getchannel("A").getbbox()
    if not bounds:
        raise ValueError("Item icon has no visible artwork")
    subject = image.crop(bounds)
    edge = min(size - 2, round(size * ITEM_ICON_FILL))
    scale = edge / max(subject.size)
    dimensions = tuple(max(1, round(value * scale)) for value in subject.size)
    subject = subject.resize(dimensions, Image.Resampling.LANCZOS)
    result = Image.new("RGBA", (size, size))
    result.alpha_composite(subject, tuple((size - value) // 2 for value in dimensions))
    return result


def check_item_icon(path, size=128):
    image = Image.open(path)
    assert image.mode == "RGBA" and image.size == (size, size), str(path)
    bounds = image.getchannel("A").getbbox()
    assert bounds and all(0 < value < size for value in bounds), str(path)
    longest = max(bounds[2] - bounds[0], bounds[3] - bounds[1])
    assert abs(longest - round(size * ITEM_ICON_FILL)) <= 1, (str(path), bounds)
    assert abs(bounds[0] - (size - bounds[2])) <= 2, (str(path), bounds)
    assert abs(bounds[1] - (size - bounds[3])) <= 2, (str(path), bounds)


if __name__ == "__main__":
    import argparse
    from pathlib import Path

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--size", type=int, choices=(128, 512), default=128)
    args = parser.parse_args()
    if args.check:
        root = Path(__file__).resolve().parents[2] / "cocos-pilot/assets/resources"
        paths = sorted((root / "tower-equipment").glob("*.png"))
        paths += sorted(p for p in (root / "tower-stones").glob("*.png")
                        if not p.name.startswith("ui_"))
        assert paths, "No item icons found"
        for path in paths:
            check_item_icon(path)
        print(f"Verified {len(paths)} item icons: 98% fit, RGBA, centered padding.")
        portraits = sorted((root / "tower-library-items").glob("*.png"))
        for path in portraits:
            check_item_icon(path, 512)
        print(f"Verified {len(portraits)} reading illustrations at 512px.")
    else:
        if not args.source or not args.output:
            parser.error("Use --source and --output, or --check")
        if args.source.resolve() == args.output.resolve():
            parser.error("Preserve the source; choose a separate output file")
        args.output.parent.mkdir(parents=True, exist_ok=True)
        fit_item_icon(Image.open(args.source), args.size).save(args.output)
        check_item_icon(args.output, args.size)

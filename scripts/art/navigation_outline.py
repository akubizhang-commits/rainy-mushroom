"""Subtle silhouette outlines for the bag and skill-book navigation artwork."""
from PIL import Image, ImageFilter


def outline_navigation_icon(image):
    image = image.convert("RGBA")
    alpha = image.getchannel("A")
    # Two source pixels of muted jade, edged with one pixel of warm paper.
    # At the existing 70px display size these remain fine contours.
    outer = Image.new("RGBA", image.size, "#F8F3DF")
    outer.putalpha(alpha.filter(ImageFilter.MaxFilter(7))
                   .filter(ImageFilter.GaussianBlur(0.35)).point(lambda a: round(a * 0.80)))
    inner = Image.new("RGBA", image.size, "#36594E")
    inner.putalpha(alpha.filter(ImageFilter.MaxFilter(5))
                   .filter(ImageFilter.GaussianBlur(0.25)).point(lambda a: round(a * 0.86)))
    return Image.alpha_composite(Image.alpha_composite(outer, inner), image)

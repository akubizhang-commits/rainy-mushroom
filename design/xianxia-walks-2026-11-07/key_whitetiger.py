# White-tiger green key: strong pure green -> transparent (including enclosed gaps); soft ramp only beside it;
# the model tinted the silver hair yellow-green through the reference's alpha gaps, so yellow-green pixels
# (g >= r > b) are turned to their luminance gray. Skin and leather (r > g) are untouched.
from PIL import Image, ImageFilter
import numpy as np
def key_white_tiger(p):
    a = np.array(Image.open(p).convert('RGB')).astype(float); r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    ex = g - np.maximum(r, b); bg = (ex > 60) & (g > 150)
    near = np.asarray(Image.fromarray((bg * 255).astype('uint8')).filter(ImageFilter.MaxFilter(5))) > 0
    al = np.where(bg, 0, np.where(near, np.clip((55 - ex) / 35, 0, 1) * 255, 255))
    yg = (g >= r) & (r > b) & ~bg
    lum = .299 * r + .587 * np.minimum(g, r) + .114 * b
    for c in range(3): a[:, :, c] = np.where(yg, lum, a[:, :, c])
    a[:, :, 1] = np.minimum(a[:, :, 1], np.maximum(a[:, :, 0], a[:, :, 2]))
    im = Image.fromarray(np.clip(a, 0, 255).astype('uint8')).convert('RGBA')
    im.putalpha(Image.fromarray(al.astype('uint8')).filter(ImageFilter.MinFilter(3))); return im

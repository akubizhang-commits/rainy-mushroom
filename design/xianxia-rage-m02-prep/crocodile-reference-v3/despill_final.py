# 第二道去绿：缩放时背景绿会渗入牙齿和鳞片边缘（LANCZOS），在最终图上把偏绿的非背景像素压回到 max(R,B)。
# 纯背景 #00FF00 保持不变，画布和余量不改动。
from pathlib import Path
import numpy as np
from PIL import Image

PATH = Path(__file__).resolve().parent / 'crocodile-reference-v3.png'
a = np.asarray(Image.open(PATH).convert('RGB')).astype(np.float32)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
background = (r < 30) & (g > 240) & (b < 30)
tint = (g - np.maximum(r, b) > 12) & ~background
before = int(tint.sum())
g2 = np.where(tint, np.maximum(r, b), g)
out = np.stack([r, g2, b], -1).clip(0, 255).astype(np.uint8)
Image.fromarray(out, 'RGB').save(PATH, optimize=True)
print('despilled pixels:', before)

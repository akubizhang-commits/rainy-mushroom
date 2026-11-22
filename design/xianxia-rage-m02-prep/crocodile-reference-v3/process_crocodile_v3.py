# 鳄王参考图 v3 后处理（本地，无生成费用）：
# 1) 绿幕去色：把角色边缘和牙齿上的绿色溢出压回到 max(R,B)，避免绿边。
# 2) 按绿色占优程度做软抠图，得到 alpha。
# 3) 以 alpha 包围盒等比缩放，重新排版到 1024x1024，满足余量：上 220、左右各 160、下 120。
# 4) 背景输出纯 #00FF00。原图只读，不改动。
from pathlib import Path
import json, hashlib
import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
SRC = Path('/Users/zhangnu/Downloads/鳄龙勇士角色立绘.png')
SRC_COPY = HERE / 'source-1254.png'
OUT = HERE / 'crocodile-reference-v3.png'
CANVAS = 1024
MARGIN = dict(top=220, left=160, right=160, bottom=120)

src = Image.open(SRC).convert('RGB')
SRC_COPY.write_bytes(SRC.read_bytes())
a = np.asarray(src).astype(np.float32)
r, g, b = a[..., 0], a[..., 1], a[..., 2]

# 绿色占优度：绿色超过红蓝较大值的部分。背景约 >150，角色鳞片接近 0。
green_excess = g - np.maximum(r, b)
alpha = np.clip(1.0 - (green_excess - 25.0) / 110.0, 0.0, 1.0)
# 纯背景直接设为 0，减少噪点。
alpha[(g > 200) & (r < 110) & (b < 110)] = 0.0

# 绿色溢出去色：只压低 G，且只作用于确实偏绿的像素。
despilled = a.copy()
spill = green_excess > 8
despilled[..., 1] = np.where(spill, np.minimum(g, np.maximum(r, b) + 4), g)

rgba = np.dstack([np.clip(despilled, 0, 255), alpha * 255]).astype(np.uint8)
fig = Image.fromarray(rgba, 'RGBA')
bbox = fig.getchannel('A').point(lambda v: 255 if v > 13 else 0).getbbox()
crop = fig.crop(bbox)
cw, ch = crop.size

avail_w = CANVAS - MARGIN['left'] - MARGIN['right']
avail_h = CANVAS - MARGIN['top'] - MARGIN['bottom']
scale = min(avail_w / cw, avail_h / ch)
nw, nh = round(cw * scale), round(ch * scale)
fitted = crop.resize((nw, nh), Image.LANCZOS)

bg = Image.new('RGBA', (CANVAS, CANVAS), (0, 255, 0, 255))
x = MARGIN['left'] + (avail_w - nw) // 2
y = CANVAS - MARGIN['bottom'] - nh  # 脚底贴住下边余量线
bg.alpha_composite(fitted, (x, y))
final = bg.convert('RGB')
final.save(OUT, optimize=True)

# 验收：重新测量绿色占优像素的包围盒，检查余量。
arr = np.asarray(final).astype(np.float32)
fg = (arr[..., 1] - np.maximum(arr[..., 0], arr[..., 2])) < 60
ys, xs = np.where(fg)
measured = dict(top=int(ys.min()), left=int(xs.min()), right=int(CANVAS - 1 - xs.max()), bottom=int(CANVAS - 1 - ys.max()))
report = dict(source=str(SRC.name), source_sha256=hashlib.sha256(SRC.read_bytes()).hexdigest(), output=OUT.name,
              scale_vs_source_crop=round(scale, 4), content_px=[nw, nh], margin_required=MARGIN, margin_measured=measured,
              background='#00FF00', paidGeneration=False)
(HERE / 'manifest-crocodile-reference-v3.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(report, ensure_ascii=False, indent=2))

# 惊鸿剑技能图标：用户出图（非付费生成）。整幅保留，斜置35°让剑在64px圆形图标里更易辨认；
# 纸底用镜像拼接延展后再旋转，避免露出原图边缘；底色校正到其他技能图标共用的宣纸色。
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps
import json, hashlib
folder = Path(__file__).resolve().parent
root = folder.parents[1]
src = Image.open(folder/'source'/'icon-accepted-1254.png').convert('RGB')
paper = Image.open(root/'cocos-pilot/assets/resources/tower-skill-icons/sj_shadow.png').convert('RGB').getpixel((2, 2))
own = src.getpixel((20, 20)); gain = [p / o for p, o in zip(paper, own)]
ANGLE, SCALE = -35, .98
W = src.width
# 纸底只取原图左上角的纯纸区域镜像铺满，避免剑的镜像出现在角落。
patch = src.crop((0, 0, 260, 260))
cell = Image.new('RGB', (520, 520))
for (dx, dy), im in {(0, 0): patch, (260, 0): ImageOps.mirror(patch), (0, 260): ImageOps.flip(patch), (260, 260): ImageOps.flip(ImageOps.mirror(patch))}.items():
    cell.paste(im, (dx, dy))
big = Image.new('RGB', (W * 3, W * 3))
for x in range(0, W * 3, 520):
    for y in range(0, W * 3, 520):
        big.paste(cell, (x, y))
big.paste(src, (W, W))
rot = big.rotate(ANGLE, resample=Image.Resampling.BICUBIC, center=(W * 1.5, W * 1.5))
half = round(W / 2 / SCALE); c = round(W * 1.5)
icon = rot.crop((c - half, c - half, c + half, c + half)).resize((256, 256), Image.Resampling.LANCZOS)
icon = Image.merge('RGB', [ch.point(lambda v, g=g: min(255, round(v * g))) for ch, g in zip(icon.split(), gain)])
icon.save(folder/'sj_jinghong.png')
font = ImageFont.truetype('/System/Library/Fonts/STHeiti Medium.ttc', 18)
board = Image.new('RGB', (900, 340), (34, 43, 46)); draw = ImageDraw.Draw(board)
board.paste(icon, (20, 46)); draw.text((20, 16), '256px 运行图', font=font, fill='white')
ref = lambda n: Image.open(root/f'cocos-pilot/assets/resources/tower-skill-icons/{n}.png').convert('RGB')
for x, size, img, label in [(320, 88, icon, '88px'), (440, 64, icon, '64px'), (560, 64, ref('sj_shadow'), '分光64'), (680, 64, ref('sj_qinglian'), '青莲64')]:
    small = img.resize((size, size), Image.Resampling.LANCZOS)
    m = Image.new('L', (size, size)); ImageDraw.Draw(m).ellipse((0, 0, size - 1, size - 1), fill=255)
    board.paste(small, (x, 108), m); draw.text((x - 4, 218), label, font=font, fill='white')
board.save(folder/'review.png')
(folder/'manifest.json').write_text(json.dumps({'source': 'source/icon-accepted-1254.png', 'sourceSize': list(src.size),
  'runtimeSize': [256, 256], 'rotation': ANGLE, 'scale': SCALE, 'paperFrom': list(own), 'paperTo': list(paper), 'paidGeneration': False,
  'rejected': {'source/icon-rejected-dark-bg-1254.png': '深色底与其他技能图标的宣纸底不一致'},
  'originalSha256': hashlib.sha256((folder/'source'/'icon-accepted-1254.png').read_bytes()).hexdigest(),
  'runtimeSha256': hashlib.sha256((folder/'sj_jinghong.png').read_bytes()).hexdigest()}, ensure_ascii=False, indent=2) + '\n')

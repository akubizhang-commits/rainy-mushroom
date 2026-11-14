# 三才剑阵阵盘调色：原图 sancai-triad-v1 保留不动，派生 v2。
# 用户反馈颜色太深、不够国风：饱和度降到约 62%，色相各自靠向国画矿物色（石青、石绿、朱砂），
# 整体提亮并略带暖白，像宣纸上的淡彩。只做后期，无生成费用。
from pathlib import Path
from PIL import Image
import colorsys, json, hashlib
import numpy as np
root = Path(__file__).resolve().parents[2]
src = root/'cocos-pilot/assets/resources/tower-skill-fx/sancai-triad-v1.png'
out = root/'cocos-pilot/assets/resources/tower-skill-fx/sancai-triad-v2.png'
a = np.asarray(Image.open(src).convert('RGBA')).astype(float)/255
rgb, alpha = a[..., :3], a[..., 3:]
mx, mn = rgb.max(-1), rgb.min(-1); v = mx; s = np.where(mx > 0, (mx-mn)/np.maximum(mx, 1e-6), 0)
d = np.maximum(mx-mn, 1e-6); r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
h = np.where(mx == r, ((g-b)/d) % 6, np.where(mx == g, (b-r)/d+2, (r-g)/d+4))/6
h = np.where(mx-mn < 1e-6, 0, h)
# 色相轻推：蓝→石青（偏青 0.53）、绿→石绿（0.36）、红→朱砂（0.03）
targets = np.array([.53, .36, .03, 1.03])
dist = np.abs(h[..., None]-targets[None, None, :]); k = dist.argmin(-1)
h = h + (targets[k] % 1 - h) * .35 * (dist.min(-1) < .12)
s = s * .62
v = np.clip(v * .94 + .06, 0, 1)
i = np.floor(h*6).astype(int) % 6; f = h*6-np.floor(h*6)
p, q, t = v*(1-s), v*(1-s*f), v*(1-s*(1-f))
choices = [np.stack(x, -1) for x in [(v,t,p),(q,v,p),(p,v,t),(p,q,v),(t,p,v),(v,p,q)]]
res = np.zeros_like(rgb)
for n in range(6): res = np.where((i == n)[..., None], choices[n], res)
paper = np.array([245, 238, 221])/255
res = res*.93 + paper*.07
Image.fromarray((np.concatenate([res, alpha], -1)*255).round().astype('uint8'), 'RGBA').save(out)
(Path(__file__).parent/'manifest.json').write_text(json.dumps({'source': 'tower-skill-fx/sancai-triad-v1.png（保留）',
  'output': 'tower-skill-fx/sancai-triad-v2.png', 'saturation': .62, 'hueNudge': .35, 'lift': .06, 'paperTint': .07,
  'paidGeneration': False, 'sha256': hashlib.sha256(out.read_bytes()).hexdigest()}, ensure_ascii=False, indent=2)+'\n')

# 惊鸿剑技能特效剑体：复用已验收的断流剑手持图（tower-held-weapons-v2/eq_sword_duanliu.png），
# 裁到可见主体并留透明边，剑尖朝右（+X）。不改原图，无生成费用。
from pathlib import Path
from PIL import Image
import json, hashlib
folder = Path(__file__).resolve().parent
root = folder.parents[1]
src = Image.open(folder/'source'/'eq_sword_duanliu-held-v2.png').convert('RGBA')
l, t, r, b = src.getbbox()
pad = 6
crop = src.crop((l - pad, t - pad, r + pad, b + pad))
out = root/'cocos-pilot/assets/resources/tower-skill-fx/jinghong-sword-v1.png'
crop.save(out)
# 剑尖在最右侧；护手中心约在 x=170（原图坐标）——运行时以剑身中点为锚点。
(folder/'manifest.json').write_text(json.dumps({
  'source': 'source/eq_sword_duanliu-held-v2.png', 'sourceOf': 'cocos-pilot/assets/resources/tower-held-weapons-v2/eq_sword_duanliu.png',
  'crop': [l - pad, t - pad, r + pad, b + pad], 'runtime': 'cocos-pilot/assets/resources/tower-skill-fx/jinghong-sword-v1.png',
  'runtimeSize': list(crop.size), 'paidGeneration': False,
  'runtimeSha256': hashlib.sha256(out.read_bytes()).hexdigest()}, ensure_ascii=False, indent=2) + '\n')
print(crop.size)

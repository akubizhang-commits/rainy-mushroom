"""Import user-approved equipment icons; preserve source artwork and soft alpha."""
from pathlib import Path
import hashlib, json, shutil, uuid
from PIL import Image, ImageDraw
from item_icon import fit_item_icon
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'design/equipment-swords-intake'
RUNTIME = ROOT / 'cocos-pilot/assets/resources/tower-equipment'
SOURCES = {'eq_sword_iron': '古韵斜置双刃长剑.png', 'eq_sword_suwen': '冰玉金饰长剑插画.png',
           'eq_sword_songfeng': '青金叶纹华丽长剑.png', 'eq_ring_basic': '银色极简戒指插画.png',
           'eq_armor_basic': '灰绿层叠汉服服装渲染图.png', 'eq_armor_qingma': '无头汉服袍服立绘.png',
           'eq_sword_shoushan': '青铜纹饰的斜刃长剑.png', 'eq_sword_guiyan': '翡翠翼饰冰银长剑.png',
           'eq_sword_caiyun': '翡翠云纹长剑.png', 'eq_sword_panxi': '翡翠云纹古剑.png',
           'eq_sword_liuquan': '冰蓝海纹幻剑.png', 'eq_sword_ningshuang': '冰晶星芒长剑.png',
           'eq_sword_xingluo': '落云宗_玉青直剑图标.png',
           'eq_ring_anxi': '落云宗_深褐木戒图标.png'}
OUT.mkdir(exist_ok=True, parents=True)
RUNTIME.mkdir(exist_ok=True, parents=True)
report = []
preview = Image.new('RGB', (400 * len(SOURCES), 480), '#FBF9F1')
draw = ImageDraw.Draw(preview)
for i, (key, filename) in enumerate(SOURCES.items()):
    source = OUT / (key + '-source.png')
    if not source.exists():
        shutil.copyfile(Path.home() / 'Downloads' / filename, source)
    original = Image.open(source).convert('RGBA')
    # Discard only barely visible background haze. Preserve smooth contour alpha.
    cutoff = 30 if key == 'eq_ring_basic' else 12
    original.putalpha(original.getchannel('A').point(lambda a: 0 if a < cutoff else a))
    bounds = original.getchannel('A').getbbox()
    cropped = original.crop(bounds)
    def export(size):
        return fit_item_icon(cropped, size)
    export(512).save(OUT / (key + '-master.png'))
    icon = export(128)
    target = RUNTIME / (key + '.png')
    icon.save(target)
    template = json.loads((ROOT/'cocos-pilot/assets/resources/tower-stones/stone_low.png.meta').read_text())
    old = template['uuid']; new = str(uuid.uuid5(uuid.NAMESPACE_URL, 'rainy-mushroom/tower-equipment/'+key))
    text = json.dumps(template, ensure_ascii=False, indent=2).replace(old,new).replace('stone_low',key)
    target.with_suffix('.png.meta').write_text(text+'\n')
    alpha = icon.getchannel('A')
    assert alpha.getextrema() == (0, 255) or alpha.getextrema()[0] == 0
    assert all(0 < v < 128 for v in alpha.getbbox())
    report.append({'id':key,'source':str(source.relative_to(ROOT)), 'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'originalSize':Image.open(source).size,'sourceBoundsAfterHazeCleanup':bounds,'runtimeSize':icon.size,'runtimeAlphaBounds':alpha.getbbox(),'runtimeSha256':hashlib.sha256(target.read_bytes()).hexdigest()})
    x=i*400
    draw.text((x+16, 8),key,fill='#263F39')
    for j,bg in enumerate(['#FBF9F1','#213833']):
        y=35+j*220
        draw.rectangle((x,y,x+399,y+210),fill=bg)
        for size,offset in [(40,16),(64,90),(128,205)]:
            v=icon.resize((size,size),Image.Resampling.LANCZOS)
            preview.paste(v,(x+offset,y+35),v)
preview.save(OUT/'size-review.png')
(OUT/'intake.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False,indent=2))

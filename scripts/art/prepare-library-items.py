"""Export library-only HD portraits from accepted masters; retain every source."""
from pathlib import Path
import subprocess, sys, json, hashlib, uuid
ROOT=Path(__file__).resolve().parents[2]
resources=ROOT/'cocos-pilot/assets/resources'
out=resources/'tower-library-items'
out.mkdir(exist_ok=True)
rows=[]
icons=sorted((resources/'tower-equipment').glob('*.png'))+sorted((resources/'tower-stones').glob('pill_*.png'))
for icon in icons:
    key=icon.stem
    candidates=sorted((ROOT/'design/equipment-swords-intake').glob(key+'-master.png'))
    candidates+=sorted((ROOT/'design/equipment-ring-batch').glob('*/'+key+'-master.png'))
    candidates+=sorted((ROOT/'design/equipment-huyuan-intake').glob(key+'-master.png'))
    candidates+=sorted((ROOT/'design/spirit-stones-2026-10-30/source-512').glob(key+'.png'))
    if len(candidates)!=1: raise ValueError(f'{key}: expected one accepted master, got {candidates}')
    source=candidates[0];target=out/icon.name
    subprocess.run([sys.executable,str(ROOT/'scripts/art/item_icon.py'),'--source',str(source),'--output',str(target),'--size','512'],check=True)
    meta=Path(str(target)+'.meta')
    if not meta.exists():
        template=json.loads(Path(str(icon)+'.meta').read_text())
        meta.write_text(json.dumps(template,indent=2).replace(template['uuid'],str(uuid.uuid5(uuid.NAMESPACE_URL,'rainy-mushroom/tower-library-items/'+key)))+'\n')
    rows.append({'id':key,'source':str(source.relative_to(ROOT)),'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'output':str(target.relative_to(ROOT)),'outputSha256':hashlib.sha256(target.read_bytes()).hexdigest(),'size':512})
(ROOT/'design/library-reading-art/manifest.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
print(f'Exported {len(rows)} library portraits; sources and inventory icons unchanged.')

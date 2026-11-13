# Reads asset IDs from jobs.json, and download URLs from urls.json (written from asset_download output), then
# downloads each video and dumps its frames. Usage: download.py
import json, subprocess
from pathlib import Path
HERE = Path(__file__).resolve().parent
jobs = json.loads((HERE / 'jobs.json').read_text())['jobs']; urls = json.loads((HERE / 'urls.json').read_text())
for name, j in jobs.items():
    url = urls[j['asset']]; assert j['asset'] in url, name
    d = HERE / name; (d / 'raw-frames').mkdir(parents=True, exist_ok=True); mp4 = d / 'original-v1.mp4'
    if not mp4.exists(): subprocess.run(['curl', '-fsSL', '-o', str(mp4), url], check=True)
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', str(mp4), str(d / 'raw-frames' / '%03d.png')], check=True)
    print(name, mp4.stat().st_size, len(list((d / 'raw-frames').glob('*.png'))))

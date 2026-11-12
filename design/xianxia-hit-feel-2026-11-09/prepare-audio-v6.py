# 2026-11-09 剑类音效第六版：改用真实录音。
# 来源：Freesound 770035 "Sword - Unsheathe" by Vrymaa（CC0，可商用，无需署名），原文件保留在 reference/。
# 剑鸣：截取拔剑摩擦起点到金属余音结束（0.18–1.10s）。破空：截取摩擦段并加速压短，做出带金属感的"唰"，三档音高变体。
import wave, json, hashlib
import numpy as np
from pathlib import Path
here = Path(__file__).resolve().parent; root = here.parents[1]
out = root/'cocos-pilot/assets/resources/tower-skill-fx'
SRC = here/'reference'/'770035__vrymaa__sword-unsheathe.wav'
w = wave.open(str(SRC)); sr = w.getframerate(); ch = w.getnchannels()
x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).reshape(-1, ch).mean(1).astype(float)/32768
def seg(a, b): return x[int(a*sr):int(b*sr)].copy()
def fade(y, fin, fout):
    n = len(y); i = int(fin*sr); o = int(fout*sr)
    if i: y[:i] *= np.linspace(0, 1, i)**2
    if o: y[n-o:] *= np.linspace(1, 0, o)**2
    return y
def speed(y, k):  # 变速（同时升调），k>1 更快更高
    t = np.arange(0, len(y)-1, k); return np.interp(t, np.arange(len(y)), y)
def norm(y, peak): return y/np.abs(y).max()*peak
def save(name, y):
    p = out/f'{name}.wav'
    with wave.open(str(p), 'wb') as f:
        f.setnchannels(1); f.setsampwidth(2); f.setframerate(sr)
        f.writeframes((np.clip(y, -1, 1)*32767).astype('<i2').tobytes())
    return p
files = {}
# 剑鸣：完整的"嚓—铮——"
ring = norm(fade(seg(.18, 1.12), .02, .25), .7); files['jinghong-ring-rec'] = save('jinghong-ring-rec', ring)
# 破空："唰"——摩擦段 0.27–0.52s，加速后约 0.12–0.16s；渐强进入、接触后快速收尾
for name, k in [('sword-swish-a', 1.6), ('sword-swish-b', 1.75), ('sword-swish-c', 1.5)]:
    y = speed(seg(.27, .52), k)
    n = len(y); y *= np.minimum(1, np.linspace(0, 1.6, n))**1.5      # 前段渐强，最响点落在约 60% 处
    files[name] = save(name, norm(fade(y, .004, .03), .65))
y = speed(seg(.25, .58), 1.3); y *= np.minimum(1, np.linspace(0, 1.5, len(y)))**1.3
files['sword-swish-long'] = save('sword-swish-long', norm(fade(y, .004, .06), .7))
(here/'audio-manifest-v6.json').write_text(json.dumps({
  'source': {'file': 'reference/770035__vrymaa__sword-unsheathe.wav', 'url': 'https://freesound.org/people/Vrymaa/sounds/770035/',
             'title': 'Sword - Unsheathe', 'author': 'Vrymaa', 'license': 'CC0 1.0（Freesound 页面：可复制、修改、分发与商用，无需征得许可）',
             'sha256': hashlib.sha256(SRC.read_bytes()).hexdigest()},
  'paidGeneration': False,
  'files': {p.name: {'sha256': hashlib.sha256(p.read_bytes()).hexdigest(), 'seconds': round(wave.open(str(p)).getnframes()/sr, 3)} for p in files.values()}},
  ensure_ascii=False, indent=2)+'\n')
# 试听：单独剑鸣、破空变体、按惊鸿剑节奏的完整出招（开头一声剑鸣，每一刺一声破空，峰值对准穿身瞬间）
def load(p):
    ww = wave.open(str(p)); return np.frombuffer(ww.readframes(ww.getnframes()), dtype=np.int16).astype(float)/32768
def mix(events, length):
    buf = np.zeros(int(sr*length))
    for t, p, v in events:
        y = load(p)*v; i = int(t*sr); buf[i:i+len(y)] += y[:len(buf)-i]
    return buf/np.abs(buf).max()*.85
def preview(name, buf):
    with wave.open(str(here/name), 'wb') as f:
        f.setnchannels(1); f.setsampwidth(2); f.setframerate(sr); f.writeframes((buf*32767).astype('<i2').tobytes())
preview('preview-ring-v6.wav', mix([(0, files['jinghong-ring-rec'], .8)], 1.1))
preview('preview-swish-v6.wav', mix([(0, files['sword-swish-a'], .7), (.45, files['sword-swish-b'], .7), (.9, files['sword-swish-c'], .7), (1.35, files['sword-swish-long'], .7)], 2.0))
hits = [.43+.22*i for i in range(6)]
ev = [(0, files['jinghong-ring-rec'], .55)] + [(t-.09, files['sword-swish-'+'abc'[i % 3]], .7) for i, t in enumerate(hits)]
preview('preview-jinghong-v6.wav', mix(ev, 2.6))
print({k: round(wave.open(str(v)).getnframes()/sr, 3) for k, v in files.items()})

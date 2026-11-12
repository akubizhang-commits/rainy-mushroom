# 2026-11-09 第七版：剑鸣只保留 Vrymaa 录音（Freesound 770035，CC0）后段的金属余音，去掉开头摩擦；
# 破空不再用录音摩擦段（用户：像金属摩擦），改回第四版合成的平滑"唰"（sword-whoosh-a/b/c/long）。
import wave, json, hashlib
import numpy as np
from pathlib import Path
here = Path(__file__).resolve().parent; root = here.parents[1]
out = root/'cocos-pilot/assets/resources/tower-skill-fx'
SRC = here/'reference'/'770035__vrymaa__sword-unsheathe.wav'
w = wave.open(str(SRC)); sr = w.getframerate(); ch = w.getnchannels()
x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).reshape(-1, ch).mean(1).astype(float)/32768
# 0.48s 起摩擦噪声已过、单一金属泛音成为主体（频谱尖峰度从约50升到100以上）
a, b = int(.48*sr), int(1.12*sr); y = x[a:b].copy()
fi, fo = int(.03*sr), int(.25*sr)
y[:fi] *= np.linspace(0, 1, fi)**1.5; y[-fo:] *= np.linspace(1, 0, fo)**2
y = y/np.abs(y).max()*.7
p = out/'jinghong-ring-tail.wav'
with wave.open(str(p), 'wb') as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(sr); f.writeframes((y*32767).astype('<i2').tobytes())
def load(n):
    ww = wave.open(str(out/f'{n}.wav')); r = ww.getframerate()
    z = np.frombuffer(ww.readframes(ww.getnframes()), dtype=np.int16).astype(float)/32768
    return z if r == sr else np.interp(np.arange(0, len(z), r/sr), np.arange(len(z)), z)
def mix(events, length):
    buf = np.zeros(int(sr*length))
    for t, n, v in events:
        z = load(n)*v; i = int(t*sr); buf[i:i+len(z)] += z[:len(buf)-i]
    return buf/np.abs(buf).max()*.85
def preview(name, buf):
    with wave.open(str(here/name), 'wb') as f:
        f.setnchannels(1); f.setsampwidth(2); f.setframerate(sr); f.writeframes((buf*32767).astype('<i2').tobytes())
preview('preview-ring-v7.wav', mix([(0, 'jinghong-ring-tail', .8)], .8))
hits = [.43+.22*i for i in range(6)]
preview('preview-jinghong-v7.wav', mix([(0, 'jinghong-ring-tail', .5)] + [(t-.08, 'sword-whoosh-'+'abc'[i % 3], .55) for i, t in enumerate(hits)], 2.6))
(here/'audio-manifest-v7.json').write_text(json.dumps({
  'ring': {'file': p.name, 'from': 'reference/770035__vrymaa__sword-unsheathe.wav', 'cut': [.48, 1.12],
           'license': 'CC0 1.0（Freesound 770035，Vrymaa）', 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()},
  'whoosh': '沿用第四版合成 sword-whoosh-a/b/c/long（无付费生成）',
  'rejected': {'sword-swish-*': '用户：像金属摩擦', 'jinghong-ring-rec': '用户：去掉开头摩擦'}}, ensure_ascii=False, indent=2)+'\n')
print(round(len(y)/sr, 2))

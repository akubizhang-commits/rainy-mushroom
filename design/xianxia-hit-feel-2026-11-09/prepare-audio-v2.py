# 2026-11-09 剑类音效第二版（本地合成，无付费生成）。替换"穿刺"一类的金属铃音（叮）：
# 剑穿身体以破空 + 低频闷击 + 撕裂噪声为主体，不再有持续的金属正弦音。
import math, random, struct, wave, json, hashlib
from pathlib import Path
root = Path(__file__).resolve().parents[2]
out = root/'cocos-pilot/assets/resources/tower-skill-fx'
rate = 44100
def env(t, attack, decay): return min(1, t/attack) * math.exp(-t*decay) if t >= 0 else 0
class Band:
    """Band-limited noise: difference of two one-pole low-passes (coefficients may move)."""
    def __init__(self): self.a = 0; self.b = 0
    def __call__(self, hi, lo):
        n = random.uniform(-1, 1); self.a += hi*(n-self.a); self.b += lo*(n-self.b); return self.a-self.b
def write(name, duration, fn, peak, seed):
    random.seed(seed); samples = [fn(i/rate) for i in range(int(rate*duration))]
    # 5ms fade-out so no file ends with a click
    for i in range(min(len(samples), int(rate*.005))): samples[-1-i] *= i/(rate*.005)
    m = max(abs(v) for v in samples) or 1
    p = out/f'{name}.wav'
    with wave.open(str(p), 'wb') as f:
        f.setnchannels(1); f.setsampwidth(2); f.setframerate(rate)
        f.writeframes(b''.join(struct.pack('<h', round(v/m*peak*32767)) for v in samples))
    return p
def pierce(thud, tear_hi, tear_lo, seed):
    band = Band(); phase = [0.0]
    def fn(t):
        f = thud*(1-.35*min(1, t/.06)); phase[0] += 2*math.pi*f/rate
        body = math.sin(phase[0])*env(t, .001, 32)                # 低频闷击（噗）
        tear = band(tear_hi, tear_lo)*env(t-.004, .002, 38)       # 皮肉/布料撕裂（嗤）
        click = random.uniform(-1, 1)*env(t, .0003, 900)          # 接触瞬间的起音
        return .7*body + .5*tear + .14*click
    return fn
def pierce_heavy(seed):
    band = Band(); phase = [0.0]; sub = [0.0]
    def fn(t):
        f = 85*(1-.45*min(1, t/.12)); phase[0] += 2*math.pi*f/rate; sub[0] += 2*math.pi*48/rate
        body = math.sin(phase[0])*env(t, .001, 15) + .5*math.sin(sub[0])*env(t, .004, 10)
        tear = band(.2, .035)*env(t-.004, .002, 22)
        ring = math.sin(2*math.pi*620*t)*env(t-.01, .002, 40)     # 很短的一声"铮"，约25ms，不是铃音
        click = random.uniform(-1, 1)*env(t, .0003, 700)
        return .7*body + .45*tear + .1*ring + .14*click
    return fn
def dash(seed):
    band = Band()
    def fn(t):
        u = min(1, t/.085)                                       # 破空：高频起、快速下滑，在接触瞬间收住
        hi = .55 - .4*u; lo = .12 - .09*u
        swell = (u**1.6) * (1 if t < .085 else math.exp(-(t-.085)*160))
        return band(hi, lo)*swell
    return fn
def appear(seed):
    band = Band()
    def fn(t):                                                   # 显形：低沉的"呼—铮"，0.2秒内收住
        air = band(.08, .015)*env(t, .03, 10)
        hum = (math.sin(2*math.pi*262*t) + .6*math.sin(2*math.pi*411*t) + .25*math.sin(2*math.pi*655*t))*env(t, .018, 13)
        return .55*air + .32*hum
    return fn
specs = {
    'sword-pierce-a': (.17, pierce(105, .2, .035, 21), .62, 21),
    'sword-pierce-b': (.17, pierce(118, .24, .045, 22), .6, 22),
    'sword-pierce-c': (.17, pierce(94, .17, .03, 23), .62, 23),
    'sword-pierce-heavy': (.34, pierce_heavy(24), .82, 24),
    'jinghong-dash': (.11, dash(25), .45, 25),
    'jinghong-appear': (.28, appear(26), .38, 26),
}
manifest = {}
for name, (duration, fn, peak, seed) in specs.items():
    p = write(name, duration, fn, peak, seed)
    manifest[p.name] = {'duration': duration, 'peak': peak, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()}
(Path(__file__).parent/'audio-manifest-v2.json').write_text(json.dumps({'paidGeneration': False,
  'replaces': {'hit-stab.wav': '穿刺类金属铃音（叮），保留原文件不删除'}, 'files': manifest}, ensure_ascii=False, indent=2)+'\n')
print(list(manifest))

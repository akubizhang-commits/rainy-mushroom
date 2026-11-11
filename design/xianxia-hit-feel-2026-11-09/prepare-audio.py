# 2026-11-09 打击感：本地合成6类命中音效（无付费生成）。与 design/xianxia-sword-burst-2026-10-31 同法。
# 全部短促（≤0.32秒）、无持续底噪；峰值按档位归一，避免轻档盖过重档。
import math, random, struct, wave, json, hashlib
from pathlib import Path
root = Path(__file__).resolve().parents[2]
out = root/'cocos-pilot/assets/resources/tower-skill-fx'
rate = 44100
def env(t, attack, decay): return min(1, t/attack) * math.exp(-t*decay)
def render(name, duration, voice, peak, seed):
    random.seed(seed); lp = 0; samples = []
    for i in range(int(rate*duration)):
        t = i/rate; v, lp = voice(t, lp); samples.append(v)
    m = max(abs(v) for v in samples) or 1
    p = out/f'hit-{name}.wav'
    with wave.open(str(p), 'wb') as f:
        f.setnchannels(1); f.setsampwidth(2); f.setframerate(rate)
        f.writeframes(b''.join(struct.pack('<h', round(v/m*peak*32767)) for v in samples))
    return p
def noise(lp, k):  # one-pole low-pass noise; k in (0,1], lower = darker
    lp += k*(random.uniform(-1, 1)-lp); return lp
voices = {
 # 轻斩：明亮短促的风切 + 细金属擦响
 'slash': (.16, lambda t, lp: (lambda n: (.55*n*env(t,.004,30) + .25*math.sin(2*math.pi*(2600-4000*t)*t)*env(t,.002,40), n))(noise(lp,.55)), .55, 11),
 # 月牙：稍长的呼啸，频率下滑，尾部一声清脆咔
 'crescent': (.24, lambda t, lp: (lambda n: (.5*n*env(t,.012,14) + .3*math.sin(2*math.pi*(1800-2600*t)*t)*env(t,.006,18) + (.35*random.uniform(-1,1)*math.exp(-(t-.05)*80) if t>.05 else 0), n))(noise(lp,.35)), .62, 12),
 # 穿刺：高频金属叮 + 极短的刺入噪声
 'stab': (.18, lambda t, lp: (lambda n: (.4*(math.sin(2*math.pi*2950*t)+.5*math.sin(2*math.pi*4420*t))*env(t,.001,28) + .35*n*env(t,.001,90), n))(noise(lp,.8)), .5, 13),
 # 擦斩：很轻的沙沙声，适合常驻剑阵
 'graze': (.1, lambda t, lp: (lambda n: (.6*n*env(t,.006,45) + .12*math.sin(2*math.pi*3300*t)*env(t,.002,60), n))(noise(lp,.6)), .32, 14),
 # 落剑：低沉闷击 + 清亮剑鸣
 'drop': (.26, lambda t, lp: (lambda n: (.5*math.sin(2*math.pi*(150*t-90*t*t))*env(t,.002,20) + .22*(math.sin(2*math.pi*1560*t)+.4*math.sin(2*math.pi*2340*t))*env(t,.003,16) + .2*n*env(t,.001,70), n))(noise(lp,.5)), .6, 15),
 # 重击：低频冲击 + 金属裂响 + 碎裂噪声
 'heavy': (.32, lambda t, lp: (lambda n: (.55*math.sin(2*math.pi*(95*t-60*t*t))*env(t,.002,13) + .2*(math.sin(2*math.pi*1240*t)+.5*math.sin(2*math.pi*2010*t))*env(t,.002,20) + .3*n*env(t,.001,45), n))(noise(lp,.7)), .8, 16),
}
manifest = {}
for name, (duration, voice, peak, seed) in voices.items():
    p = render(name, duration, voice, peak, seed)
    manifest[p.name] = {'duration': duration, 'peak': peak, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()}
(Path(__file__).parent/'audio-manifest.json').write_text(json.dumps({'paidGeneration': False, 'files': manifest}, ensure_ascii=False, indent=2)+'\n')
print(list(manifest))

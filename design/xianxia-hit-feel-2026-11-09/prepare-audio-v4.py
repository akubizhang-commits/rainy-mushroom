# 2026-11-09 剑类音效第四版（本地合成，无付费生成）。用户反馈第三版：剑鸣像"叮"、破空像割草。
# 剑鸣：柔和起音 + 出鞘刮擦上扬 + 谐波持续长音（约1.4秒）+ 缓慢颤音，每次出招只响一次。
# 破空：先把噪声源平滑再过一个低Q带通，中心频率做明显的多普勒式升降，叠一层很轻的哨音；几乎去掉高频嘶声。
import math, random, struct, wave, json, hashlib
from pathlib import Path
root = Path(__file__).resolve().parents[2]
out = root/'cocos-pilot/assets/resources/tower-skill-fx'
rate = 44100
class Biquad:
    def __init__(self): self.x1=self.x2=self.y1=self.y2=0.0
    def __call__(self, x, f, q):
        w=2*math.pi*f/rate; a=math.sin(w)/(2*q); c=math.cos(w)
        y=(a*x-a*self.x2+2*c*self.y1-(1-a)*self.y2)/(1+a)
        self.x2,self.x1,self.y2,self.y1=self.x1,x,self.y1,y; return y
class Lowpass:
    def __init__(self, f): self.k=1-math.exp(-2*math.pi*f/rate); self.y=0.0
    def __call__(self, x): self.y+=self.k*(x-self.y); return self.y
class Highpass:
    def __init__(self, f): self.lp=Lowpass(f)
    def __call__(self, x): return x-self.lp(x)
def write(name, duration, fn, peak, seed):
    random.seed(seed); s=[fn(i/rate) for i in range(int(rate*duration))]
    fade=int(rate*.02)
    for i in range(min(len(s),fade)): s[-1-i]*=i/fade
    m=max(abs(v) for v in s) or 1; p=out/f'{name}.wav'
    with wave.open(str(p),'wb') as f:
        f.setnchannels(1);f.setsampwidth(2);f.setframerate(rate)
        f.writeframes(b''.join(struct.pack('<h',round(v/m*peak*32767)) for v in s))
    return p
def whoosh(peak_at, f_start, f_peak, f_end, tail, whistle=.12):
    """咻：平滑噪声经低Q带通，频率 f_start→f_peak（接触瞬间）→f_end；包络平滑无颗粒。"""
    src=Lowpass(6000); bp=Biquad(); hp=Highpass(400); ph=[0.0]
    def fn(t):
        if t<peak_at:
            u=t/peak_at; f=f_start+(f_peak-f_start)*u*u; amp=math.sin(u*math.pi/2)**2.5
        else:
            u=min(1,(t-peak_at)/tail); f=f_peak+(f_end-f_peak)*u; amp=(1-u)**2.4
        n=src(random.uniform(-1,1))*2.2
        body=bp(n,f,1.1)
        ph[0]+=2*math.pi*f*.98/rate
        tone=math.sin(ph[0])*whistle*amp                       # 很轻的哨音，让风声有"划过"的锐度
        return hp(body*amp+tone)
    return fn
def zheng():
    """铮——：出鞘刮擦（音高上扬）渐入，接谐波长音，柔和起音、慢衰减、带颤音与拍频。"""
    bp=Biquad(); hp=Highpass(600); f0=1046.5                    # C6，清亮
    parts=[(1,1.0),(2,.42),(3,.18),(4,.08)]; detune=1.0035
    def fn(t):
        scrape=bp(random.uniform(-1,1),2200+3400*min(1,t/.18),4.0)*min(1,t/.02)*math.exp(-max(0,t-.12)*14)
        att=min(1,t/.07)**1.5                                   # 约70ms柔和渐入，不是敲击
        dec=math.exp(-t*1.9)                                    # 余音约1.4秒
        vib=1+.004*math.sin(2*math.pi*5.2*t)*min(1,t/.25)      # 渐起的轻微颤音
        glide=1+.012*(1-math.exp(-t*9))                        # 起音后音高略微上扬
        v=0
        for k,a in parts:
            f=f0*k*vib*glide
            v+=a*(math.sin(2*math.pi*f*t)+.6*math.sin(2*math.pi*f*detune*t))*math.exp(-t*(k-1)*1.4)
        return .35*hp(scrape)+.42*v*att*dec
    return fn
specs={
 'sword-whoosh-a':(.28,whoosh(.08,700,2300,900,.16),.6,41),
 'sword-whoosh-b':(.28,whoosh(.075,800,2600,1000,.15),.6,42),
 'sword-whoosh-c':(.28,whoosh(.085,650,2100,850,.17),.6,43),
 'sword-whoosh-long':(.5,whoosh(.12,550,2400,700,.3),.62,44),
 'jinghong-zheng':(1.45,zheng(),.48,45),
}
manifest={}
for name,(duration,fn,peak,seed) in specs.items():
    p=write(name,duration,fn,peak,seed)
    manifest[p.name]={'duration':duration,'peak':peak,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
(Path(__file__).parent/'audio-manifest-v4.json').write_text(json.dumps({'paidGeneration':False,
 'note':'第三版（sword-aircut-*、jinghong-ring）用户评价：剑鸣像叮、破空像割草；文件保留不接入。','files':manifest},ensure_ascii=False,indent=2)+'\n')
print(list(manifest))

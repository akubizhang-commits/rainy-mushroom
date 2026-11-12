# 2026-11-09 剑类音效第三版（本地合成，无付费生成）。用户反馈第二版"像打鼓"：
# 去掉全部低频闷击与末刺重击。出剑只表达"划破空气"；剑鸣改为清亮的"铮——"。
import math, random, struct, wave, json, hashlib
from pathlib import Path
root = Path(__file__).resolve().parents[2]
out = root/'cocos-pilot/assets/resources/tower-skill-fx'
rate = 44100
class Biquad:
    """RBJ band-pass whose centre frequency can move every sample."""
    def __init__(self): self.x1=self.x2=self.y1=self.y2=0.0
    def __call__(self, x, f, q):
        w=2*math.pi*f/rate; a=math.sin(w)/(2*q); c=math.cos(w)
        b0,b2,a0,a1,a2=a,-a,1+a,-2*c,1-a
        y=(b0*x+b2*self.x2-a1*self.y1-a2*self.y2)/a0
        self.x2,self.x1,self.y2,self.y1=self.x1,x,self.y1,y; return y
class Highpass:
    def __init__(self, f): self.k=math.exp(-2*math.pi*f/rate); self.lp=0.0
    def __call__(self, x): self.lp=(1-self.k)*x+self.k*self.lp; return x-self.lp
def write(name, duration, fn, peak, seed):
    random.seed(seed); s=[fn(i/rate) for i in range(int(rate*duration))]
    fade=int(rate*.008)
    for i in range(min(len(s),fade)): s[-1-i]*=i/fade
    m=max(abs(v) for v in s) or 1; p=out/f'{name}.wav'
    with wave.open(str(p),'wb') as f:
        f.setnchannels(1);f.setsampwidth(2);f.setframerate(rate)
        f.writeframes(b''.join(struct.pack('<h',round(v/m*peak*32767)) for v in s))
    return p
def aircut(peak_at, f_lo, f_hi, tail, seed_shift=0):
    """嗖/咻：带通噪声，中心频率在接触前上扬、接触后回落；起音快，接触瞬间最响，尾部只剩细碎高频嘶声。"""
    bp=Biquad(); bp2=Biquad(); hiss=Highpass(5500); hp=Highpass(700)
    def fn(t):
        n=random.uniform(-1,1)
        if t<peak_at: u=t/peak_at; f=f_lo+(f_hi-f_lo)*u**1.5; amp=u**2.2
        else: u=(t-peak_at)/tail; f=f_hi-(f_hi-f_lo)*.55*min(1,u); amp=math.exp(-u*3.2)
        body=bp(n,f,2.2)+.6*bp2(n,f*1.9,3.0)                     # 主体：移动的风切
        air=hiss(n)*(.35*amp if t>=peak_at*.7 else 0)            # 锋利的细碎嘶声
        return hp(body*amp+air)
    return fn
def ring(seed):
    """铮——：开头一下极短的刮擦，随后是钢片的非谐泛音（含两组拍频产生颤动），约0.8秒衰减。"""
    hp=Highpass(1800); bp=Biquad()
    f0=1320; partials=[(1,1.0,4.2),(1.0045,.7,4.6),(2.756,.55,6.5),(2.761,.35,7.0),(5.404,.22,10.0),(8.93,.08,16.0)]
    ph=[random.random()*6.28 for _ in partials]
    def fn(t):
        scrape=bp(random.uniform(-1,1),3800+2600*min(1,t/.035),1.6)*math.exp(-t*55)*min(1,t/.002)
        att=min(1,t/.006); v=0
        for i,(r,a,d) in enumerate(partials):
            v+=a*math.sin(2*math.pi*f0*r*t+ph[i])*math.exp(-t*d)
        shimmer=1+.18*math.sin(2*math.pi*6.5*t)                   # 轻微的颤音
        return .55*hp(scrape)+.5*v*att*shimmer
    return fn
specs={
 'sword-aircut-a':(.24,aircut(.075,1900,4600,.13),.55,31),
 'sword-aircut-b':(.24,aircut(.07,2200,5200,.12),.55,32),
 'sword-aircut-c':(.24,aircut(.08,1700,4200,.14),.55,33),
 'sword-aircut-long':(.42,aircut(.11,1500,5000,.26),.6,34),
 'jinghong-ring':(.9,ring(35),.5,35),
}
manifest={}
for name,(duration,fn,peak,seed) in specs.items():
    p=write(name,duration,fn,peak,seed)
    manifest[p.name]={'duration':duration,'peak':peak,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
(Path(__file__).parent/'audio-manifest-v3.json').write_text(json.dumps({'paidGeneration':False,
 'note':'第二版（sword-pierce-*、jinghong-dash、jinghong-appear）用户评价像打鼓，文件保留不接入。','files':manifest},ensure_ascii=False,indent=2)+'\n')
print(list(manifest))

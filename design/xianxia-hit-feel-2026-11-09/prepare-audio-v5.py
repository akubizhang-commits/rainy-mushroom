# 2026-11-09 剑鸣第五版（本地合成，无付费生成）。用户反馈第四版"跟弹棉花似的"：
# 第四版用整数倍谐波 + 音高上滑 + 颤音 = 琴弦拨响。剑鸣应是金属片：非谐泛音、无滑音，
# 由出鞘刮擦渐入（无打击起音），多层微失谐叠出金属闪烁的长余音。
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
def write(name, duration, fn, peak, seed):
    random.seed(seed); s=[fn(i/rate) for i in range(int(rate*duration))]
    fade=int(rate*.05)
    for i in range(min(len(s),fade)): s[-1-i]*=i/fade
    m=max(abs(v) for v in s) or 1; p=out/f'{name}.wav'
    with wave.open(str(p),'wb') as f:
        f.setnchannels(1);f.setsampwidth(2);f.setframerate(rate)
        f.writeframes(b''.join(struct.pack('<h',round(v/m*peak*32767)) for v in s))
    return p
def zheng(seed):
    random.seed(seed)
    base=1210.0
    # 自由金属条模态比 1 : 2.756 : 5.404 : 8.933；第二模态（约3.3kHz）最亮，是"铮"的主体
    modes=[(1.0,.45,1.6),(2.756,1.0,1.25),(5.404,.42,1.9),(8.933,.16,3.0)]
    voices=[]
    for r,a,d in modes:
        for k in range(3):   # 每个模态三层微失谐，产生缓慢的金属闪烁，而不是单一纯音
            voices.append((base*r*(1+(k-1)*.0016+random.uniform(-.0004,.0004)),a/3,d,random.random()*6.28,random.uniform(.3,.9)))
    scrape=Biquad(); air=Lowpass(9000); shimmer_lp=Lowpass(4)
    def fn(t):
        # 出鞘刮擦：中心频率 2.6k→6.5k 上扬，0.12秒内淡出
        u=min(1,t/.11); sc=scrape(air(random.uniform(-1,1)),2600+3900*u,3.5)*min(1,t/.008)*math.exp(-max(0,t-.06)*22)
        # 长音由刮擦交接渐入（约60ms），无打击起音
        att=min(1,max(0,t-.015)/.06)**2
        sh=1+.12*shimmer_lp(random.uniform(-1,1))*8   # 极慢的随机幅度起伏
        v=0
        for f,a,d,ph,drift in voices:
            v+=a*math.sin(2*math.pi*f*t+ph+.4*math.sin(2*math.pi*drift*t))*math.exp(-t*d)
        return .5*sc+.5*v*att*sh
    return fn
p=write('jinghong-zheng-v5',1.8,zheng(51),.5,51)
(Path(__file__).parent/'audio-manifest-v5.json').write_text(json.dumps({'paidGeneration':False,
 'note':'第四版 jinghong-zheng（谐波+滑音）用户评价像弹棉花，保留不接入。',
 'files':{p.name:{'duration':1.8,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}}},ensure_ascii=False,indent=2)+'\n')

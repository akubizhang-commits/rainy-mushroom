// P4 · S2 程序化占位音效生成器（08 K5 / 03 §6.4 / 02 §8.7）。
// 程序化自制、无第三方素材：全部波形由本脚本用正弦/三角波 + 固定种子噪声合成，无采样、无外部音源，
// 因此没有第三方许可问题；本文件即“来源记录”。可随时被正式音效替换（文件名不变即可）。
//
// 风格：雨后森林、治愈系——软起音、指数衰减、低通，避免方波/锯齿的刺耳感。
// 格式：WAV PCM 16-bit 单声道 22.05 kHz（Cocos 3.8 AudioClip 可导入，微信 InnerAudioContext 支持 wav）。
// 输出确定（不使用 Math.random / Date），重复运行字节一致。
// 产物：cocos-pilot/assets/survivor/audio/<id>.wav（survivor 分包内）
import {mkdirSync, writeFileSync} from 'node:fs'
import {resolve} from 'node:path'

const root = resolve(import.meta.dirname, '../..')
const outDir = resolve(root, 'cocos-pilot/assets/survivor/audio')
const RATE = 22050
const TAU = Math.PI * 2

// 固定种子噪声（LCG），每个音效独立重置，保证确定性
let seed = 1
const reseed = (s) => { seed = s >>> 0 || 1 }
const noise = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2147483648 - 1 }

const tri = (p) => { const x = (p / TAU) % 1; return 4 * Math.abs(x - 0.5) - 1 }
// 包络：attack 线性起音，之后指数衰减；末尾 8ms 线性收尾防止爆音
const env = (t, dur, attack, decay) => {
  const a = t < attack ? t / attack : Math.exp(-(t - attack) / decay)
  const tail = Math.min(1, (dur - t) / 0.008)
  return a * Math.max(0, tail)
}

// 一个“音”：频率可从 f0 滑到 f1；wave: sine | tri；harm: 叠加泛音 [倍数, 振幅]
function voice(buf, {start = 0, dur, f0, f1 = f0, amp = 0.5, attack = 0.005, decay = 0.1, wave = 'sine', harm = [], trem = 0, tremHz = 0}) {
  const n0 = Math.floor(start * RATE), n = Math.floor(dur * RATE)
  let phase = 0
  for (let i = 0; i < n && n0 + i < buf.length; i++) {
    const t = i / RATE, k = t / dur
    const f = f0 * Math.pow(f1 / f0, k) // 指数滑音，听感更自然
    phase += (TAU * f) / RATE
    let s = wave === 'tri' ? tri(phase) : Math.sin(phase)
    for (const [m, a] of harm) s += a * Math.sin(phase * m)
    const tr = trem ? 1 - trem * (0.5 + 0.5 * Math.sin(TAU * tremHz * t)) : 1
    buf[n0 + i] += s * amp * tr * env(t, dur, attack, decay)
  }
}
// 低通噪声“气声/雨声”
function breath(buf, {start = 0, dur, amp = 0.1, attack = 0.01, decay = 0.1, cutoff = 0.1}) {
  const n0 = Math.floor(start * RATE), n = Math.floor(dur * RATE)
  let lp = 0
  for (let i = 0; i < n && n0 + i < buf.length; i++) {
    const t = i / RATE
    lp += cutoff * (noise() - lp)
    buf[n0 + i] += lp * amp * env(t, dur, attack, decay)
  }
}

// 每个音效：总时长（秒）+ 合成函数。音量统一在 encode 时归一到峰值 peak。
const SFX = {
  // 拾取孢子：短促上滑的水滴声（高频事件，尽量短）
  pickup: {dur: 0.09, peak: 0.45, make(b) {
    voice(b, {dur: 0.09, f0: 1180, f1: 1760, amp: 0.6, attack: 0.003, decay: 0.03})
  }},
  // 敌人净化：轻柔的风铃 + 一点雾散的气声
  purify: {dur: 0.16, peak: 0.42, make(b) {
    voice(b, {dur: 0.16, f0: 880, f1: 990, amp: 0.45, attack: 0.004, decay: 0.05, harm: [[1.5, 0.35], [3, 0.12]]})
    breath(b, {dur: 0.12, amp: 0.5, attack: 0.004, decay: 0.03, cutoff: 0.18})
  }},
  // 命中：闷闷的软木轻敲（只做节流后的点缀）
  hit: {dur: 0.05, peak: 0.32, make(b) {
    voice(b, {dur: 0.05, f0: 260, f1: 170, amp: 0.7, attack: 0.002, decay: 0.014, wave: 'tri'})
    breath(b, {dur: 0.03, amp: 0.6, attack: 0.001, decay: 0.008, cutoff: 0.3})
  }},
  // 角色受击：下滑的低沉“噗”，不尖锐
  hurt: {dur: 0.2, peak: 0.6, make(b) {
    voice(b, {dur: 0.2, f0: 330, f1: 160, amp: 0.7, attack: 0.004, decay: 0.07, wave: 'tri'})
    breath(b, {dur: 0.12, amp: 0.7, attack: 0.002, decay: 0.035, cutoff: 0.08})
  }},
  // 升级：C 大调上行琶音（C5 E5 G5 C6），钟琴音色
  levelup: {dur: 0.5, peak: 0.6, make(b) {
    ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => voice(b, {start: i * 0.07, dur: 0.5 - i * 0.07, f0: f, amp: 0.35, attack: 0.004, decay: 0.12, harm: [[2, 0.2], [3, 0.06]]}))
  }},
  // Boss 预警：两声低沉柔和的号角（带轻微颤音）
  boss_warn: {dur: 0.7, peak: 0.6, make(b) {
    for (const s of [0, 0.35]) voice(b, {start: s, dur: 0.34, f0: 147, amp: 0.5, attack: 0.04, decay: 0.15, wave: 'tri', harm: [[1.5, 0.3]], trem: 0.25, tremHz: 9})
  }},
  // Boss 出现：深沉渐强的雾涌 + 低音（A1/E2 五度）
  boss_appear: {dur: 0.9, peak: 0.65, make(b) {
    voice(b, {dur: 0.9, f0: 55, f1: 52, amp: 0.55, attack: 0.25, decay: 0.3, harm: [[1.5, 0.45], [2, 0.25]]})
    breath(b, {dur: 0.9, amp: 0.9, attack: 0.3, decay: 0.25, cutoff: 0.04})
  }},
  // Boss 冲撞预警：0.4 秒上升的三角波 + 颤音（配合 0.8 秒蓄力箭头）
  boss_charge: {dur: 0.4, peak: 0.5, make(b) {
    voice(b, {dur: 0.4, f0: 196, f1: 392, amp: 0.55, attack: 0.05, decay: 0.4, wave: 'tri', trem: 0.4, tremHz: 14})
  }},
  // 撤离成功：G 大调温暖和弦分解 + 余音
  win: {dur: 1.0, peak: 0.6, make(b) {
    ;[392, 493.88, 587.33, 783.99].forEach((f, i) => voice(b, {start: i * 0.09, dur: 1.0 - i * 0.09, f0: f, amp: 0.3, attack: 0.01, decay: 0.3, harm: [[2, 0.15]]}))
    breath(b, {dur: 0.6, amp: 0.25, attack: 0.2, decay: 0.2, cutoff: 0.12})
  }},
  // 按钮点击：短促的木质“嗒”
  click: {dur: 0.04, peak: 0.35, make(b) {
    voice(b, {dur: 0.04, f0: 880, f1: 660, amp: 0.7, attack: 0.001, decay: 0.01, harm: [[2.01, 0.2]]})
  }},
}

function encode(samples, peak) {
  let max = 0
  for (const s of samples) max = Math.max(max, Math.abs(s))
  const gain = max > 0 ? peak / max : 0
  const data = Buffer.alloc(samples.length * 2)
  for (let i = 0; i < samples.length; i++) data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i] * gain)) * 32767), i * 2)
  const h = Buffer.alloc(44)
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8)
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22)
  h.writeUInt32LE(RATE, 24); h.writeUInt32LE(RATE * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34)
  h.write('data', 36); h.writeUInt32LE(data.length, 40)
  return Buffer.concat([h, data])
}

mkdirSync(outDir, {recursive: true})
let total = 0, idx = 0
for (const [id, def] of Object.entries(SFX)) {
  reseed(0x5eed + idx++)
  const buf = new Float64Array(Math.round(def.dur * RATE))
  def.make(buf)
  const wav = encode(buf, def.peak)
  writeFileSync(resolve(outDir, `${id}.wav`), wav)
  total += wav.length
  console.log(`${id}.wav  ${(wav.length / 1024).toFixed(1)} KB`)
}
console.log(`total ${(total / 1024).toFixed(1)} KB (${Object.keys(SFX).length} files) → ${outDir}`)
if (total > 300 * 1024) { console.error('超出 03 §6.4 音效预算 300 KB'); process.exit(1) }

# 低阶熊、虎、鳄撕咬普攻核查 · 2026-11-06（0 额度，无代码改动）

纠正此前的盘点：低阶熊（bear）的熊掌抓、低阶虎（tiger）的虎爪，以及低阶鳄（crocodile）的全部普攻，早已在 `TowerMonsterArt.ts` 里复用各自已有的拍地（slam）或横扫（sweep）动作，并按真实攻击节奏播放。代码注释注明了这项依据：83 号文档，普通熊掌抓、虎爪是普通攻击 bite，复用各自的挥击动作。上一轮缺口表把它们写成“撕咬缺失”是我的错误，这里不重复制作。

本轮只做实机核查。`verify.cjs` 在真实构建中强制只让某一种招式就绪，用真实模拟推进时间，并检查前摇、生效、收招每一帧都落在对应阶段的图集帧上。核查对象：bear_normal_r3 的 bite 与 slam、tiger_normal_r3 的 bite 与 sweep、crocodile_normal_r2 的 bite 与 sweep、crocodile_elite_f4_w5_n1 的 sweep（精英鳄的普攻本来就是 sweep，没有 bite），各自 × 左右 × 双横屏，全部通过。验收还覆盖暂停冻结、击杀清理和存档不变。第一轮把精英鳄的招式写错了，记录保留在 `browser-run1-elite-kind.json`。

// R1 站桩（04 §2.2）：全程摇杆 (0,0)，每次升级都选第 0 张。
export default Object.freeze({
  name: 'idle',
  seed: 'replay-idle',
  maxSteps: 10 * 60 * 60, // 10 分钟上限（站桩远早于此被浊雾笼罩）
  moves: [],
  picks: [],
  defaultPick: 0,
})

// S1 player-facing Chinese UI copy (01-gdd §2 合规口径 / 05 §3 口径). Only a frozen
// JSON literal: no functions, no imports. Scanned by the compliance test (04 §7.1):
// MUST NOT contain {吃,食用,采食,美味}×{蘑菇,菌} combinations, and MUST NOT contain
// {击杀,消灭,屠杀,死亡,血,尸}. Uses 净化/驱散/撤离 terminology throughout.
// @placeholder S1 初稿文案，正式口径随 T12 由运营复核。
export const STRINGS = Object.freeze({
  // HUD
  hudTime: '时间',
  hudPurified: '净化数',
  hudLevel: '等级',
  pauseButton: '暂停',

  // 升级三选一
  levelUpTitle: '选一个能力',
  levelUpHintFirst: '选一个能力，组合越多越强',
  cardNewWeapon: '新武器',
  cardUpgrade: '升级',
  cardHealDew: '一捧露水',
  cardHealDewDesc: '立即回复 30 生命',
  cardShinySpore: '闪亮孢子',
  cardShinySporeDesc: '本局结算露晶 +5',

  // 结算
  resultWin: '守住了雨后森林',
  resultLose: '被浊雾笼罩',
  resultSurvivalTime: '存活时间',
  resultPurified: '净化数',
  resultLevel: '最终等级',
  resultCrystals: '获得露晶',
  resultBestTime: '刷新最佳时间',
  btnPlayAgain: '再来一局',
  btnBackToCamp: '森林营地',

  // 新手首条提示
  tutorialMove: '按住屏幕下方拖动来移动，攻击是自动的',

  // 暂停菜单
  pauseResume: '继续',
  pauseQuit: '返回森林入口',

  // 数据异常兜底（03 §4）
  dataError: '游戏数据异常，请更新到最新版本',
})

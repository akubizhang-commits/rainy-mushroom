import { VoxelGame } from './js/voxel/VoxelGame.js'

const windowInfo = typeof wx.getWindowInfo === 'function'
  ? wx.getWindowInfo()
  : wx.getSystemInfoSync()

const canvas = wx.createCanvas()
canvas.width = windowInfo.windowWidth
canvas.height = windowInfo.windowHeight

let safeTop = (windowInfo.safeArea && windowInfo.safeArea.top) || 24
try {
  const menuButton = wx.getMenuButtonBoundingClientRect()
  safeTop = Math.max(safeTop, menuButton.bottom + 6)
} catch (error) {
  // 基础库或开发者工具不提供胶囊信息时使用安全区顶部。
}

try {
  new VoxelGame(canvas, safeTop, wx)
} catch (error) {
  console.error('3D 游戏启动失败', error)
  wx.showModal?.({ title: '游戏未能启动', content: error.message || '请重新编译项目后重试', showCancel: false })
}

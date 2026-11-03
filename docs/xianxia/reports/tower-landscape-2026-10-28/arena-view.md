# 六边形战场渲染交接

2026-10-28 · 功能 Alpha 灰盒 · 独立 renderer，待父进程接入

## 文件与接口

仅新增：

- `cocos-pilot/assets/scripts/TowerArenaView.ts`
- `tests/xianxia-tower-arena-view.test.mjs`
- 本报告

未改 TowerMenu、TowerView、pure/shared 模块、sourceRoot 或同步脚本。未生成 `.meta`，由后续统一构建处理；未 sync、build、运行浏览器。

```ts
import {drawTowerArena,drawTowerArenaMap} from './TowerArenaView';

// TowerView.draw：替换原背景/网格/矩形边界段，仍早于光环、攻击和角色。
g.clear();
drawTowerArena(g,this.camera,W,H,s.arenaVersion);

// HUD 绘制后。x/y 是小图中心；top 沿用当前 HUD 高度。
drawTowerArenaMap(u,s,W/2-61,H/2-top-67);
```

两个函数均只向已有 Graphics 追加图形，**不调用 clear**。父进程保持原世界层和 HUD 层清理顺序。无节点 selector、Label、Button、事件监听或输入阻挡组件。

## 绘制合同

`drawTowerArena(g,camera,width,height,arenaVersion?)`：

- 仅 `arenaVersion===1` 使用六边形；缺省、0 或未知版本继续旧矩形边界 `[-912,978] × [-1140,1020]`。
- 从共享 `TowerArena` 导入 `HEX_VERTICES`、`HEX_CENTER`，不复制六边形坐标。当前真实 pure 模块已核对为中心 `(33,-60)` 及约定六点。
- 暗背景 `#101e1d`、石地 `#172e2b`、地砖缝 `#26443e`、墙 `#7a8765`，沿用原墨绿/石色。
- 石地完整填充；墙为 8 单位宽、显式首尾相接的完整六段路径。地砖缝按世界坐标每 180 单位生成并裁到多边形内，不随相机改变网格相位。
- 六边形有 94% 内沿和六处 84% 顶点位置的简洁柱脚。柱脚为平面装饰，不创建障碍、碰撞或新事件。
- 所有地面、墙、接缝、柱脚只做 `world-camera`；只有铺满屏幕的暗底使用 width/height。调整窗口尺寸不会重排世界几何。
- `HEX_VERTICES` 在 helper 边界声明为只读 Point 数组，解决生成 TS 对 `.map(Object.freeze)` 推断为 `Readonly<unknown>[]` 的问题；没有改共享数据。

`drawTowerArenaMap(g,state,x,y)`：

- 90×110 逻辑单位，中心 `(x,y)`，背景有 8 单位圆角。
- 地图统一比例 `min(76/1890,96/2160)`，不拉伸；约 76×86.86。世界正 Y 仍朝上，相对共享中心投影，不依赖相机。
- 新版本显示完整六边形，旧版本显示矩形；玩家为半径 3 的浅金点与暗描边。不画敌人、数字、任意文本或新按钮。
- 缺失/非有限玩家坐标不画点，不改 state。玩家正常位置由 pure/core 的战场边界保证。
- 上述接入示例距右边缘 16、距 HUD 下缘 12 单位；844×390/逻辑1280×591.47 时中心约 `(579,120.73)`，包围框 `[534,624] × [65.73,175.73]`。父进程可按 HUD 实际位置调整中心，不需要改 helper。

## 验证

- `node --test tests/xianxia-tower-arena-view.test.mjs`：6/6 通过，读取真实 `js/xianxia/TowerArena.js`，转换生产 renderer TS，仅替换 Cocos Graphics/Color 边界。
- 覆盖完整六条墙边及闭合段、每个世界图元的相机平移、窗口大小只改变暗底、接缝/柱脚不越界、legacy 矩形、小图比例/中心/玩家定位/尺寸、无效玩家和已有 HUD 不被清除。
- 直接 Cocos project `tsc --noEmit` 暂因尚未生成的 `shared/js/xianxia/TowerArena.ts` 报 TS2307。以编译器内存文件提供当前 pure JS 加 `// @ts-nocheck`，模拟现有同步规则完成完整项目类型检查：**0 diagnostics**，不向 repo 写生成文件。正式直接 tsc 仍待父进程同步后重跑。
- Graphics 记录测试不证明 GPU 像素效果或触屏遮挡；父进程统一同步和接入后复核实际六边形轮廓、小图 HUD 位置即可。

CODEX_HANDOFF / DEBUG_HANDOFF 未修改：本轮限定新增 helper、测试和专属报告。下一步由父进程接入两个调用、同步共享模块并统一构建。

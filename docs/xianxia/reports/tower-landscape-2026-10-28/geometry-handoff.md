# 锁妖塔六边形几何交接

2026-10-28：独立模块和数学测试已就绪，可供 Run 接入。本次仅新增 `js/xianxia/TowerArena.js`、`tests/xianxia-tower-arena.test.mjs` 和本文件；未修改 Run、Campaign、View、同步脚本、构建或经济数据。

## 导出 API

| 导出 | 约定 |
| --- | --- |
| `HEX_VERTICES` | 深冻结的六个 `{x,y}`，依次为 `(33,1020),(978,480),(978,-600),(33,-1140),(-912,-600),(-912,480)`。 |
| `HEX_CENTER` | 冻结的 `{x:33,y:-60}`。bbox 仍为 `x=[-912,978], y=[-1140,1020]`，宽 1890、高 2160。 |
| `insideHex(point, radius=0)` | 圆形整体在六个内半平面内时返回 `true`；墙面接触合法。 |
| `boundHexActor(actor)` | 将 `actor.x/y` **原地**投影至半径内缩区域的欧氏最近点，返回同一 actor；其他字段不变，缺省 `actor.radius` 为 0。 |
| `clipHexRay(origin, dirX, dirY, range, radius=0)` | 返回标量 `t∈[0,range]`，终点为 `origin+t*(dirX,dirY)`。单位方向下 `t` 是世界距离；不自动归一化方向、不移动 origin。 |

所有数字参数须为有限 number；NaN、Infinity、字符串、负半径、负 range、不能容纳的半径抛 `RangeError`，不静默纠正或产生 NaN。最大圆半径约 `937.7025934944159`，支持退化至中心的最大内切圆；浮点容差为世界单位 `1e-9`。无依赖、RNG、可增长缓存或全局可变状态。

投影直接比较合法面内垂足与墙线交点，选择最近点，不采用反复按墙纠偏；包括大半径下非相邻墙线交点。圆的约束为每面单位外法线 `n·(p-center) <= offset-radius`，使用给定顶点的实际边长，未把它近似成正六边形。

接入例：

```js
import { insideHex, boundHexActor, clipHexRay } from './TowerArena.js'

boundHexActor(actor) // 移动、推挤、恢复后统一约束
const candidates = portal.candidates.filter(p => insideHex(p, enemy.radius))
const length = clipHexRay(actor, dirX, dirY, range, projectileRadius)
const end = { x: actor.x + dirX * length, y: actor.y + dirY * length }
```

射线原点必须已对**本次射线半径**合法。零方向、零 range、原点位于内缩区域外时返回 0；外部原点不会被此函数移动进场，调用方须先投影。切线可沿墙移动，朝墙外的射线长度为 0。

## 当前 PORTALS：半径 42

直接读取 `FLOOR01.arena.portals`，每组原有 9 个候选；以下索引从 0 开始，保留 authored 顺序。

| 入口 | 合法数 | 合法候选索引 | 原入口中心合法 |
| --- | ---: | --- | --- |
| N | 7 | 0,1,2,3,4,5,8 | 是 |
| NE | 2 | 3,5 | 否 |
| E | 9 | 0,1,2,3,4,5,6,7,8 | 是 |
| SE | 2 | 4,7 | 否 |
| S | 7 | 0,1,2,3,4,6,7 | 是 |
| SW | 2 | 4,6 | 否 |
| W | 9 | 0,1,2,3,4,5,6,7,8 | 是 |
| NW | 2 | 3,8 | 否 |

**八组均满足至少一个 Boss 半径 42 的合法候选，无需修改 authored 坐标。** 斜向入口的两个合法点分别为 NE `(695,568),(603,568)`，SE `(695,-688),(603,-688)`，SW `(-629,-688),(-537,-688)`，NW `(-629,568),(-537,568)`。

Run 应先按实际半径过滤，再执行现有占位选择；不能直接使用斜向入口中心或未过滤的第 0 个候选。这里仅验证墙体容纳，不保证候选当时未被其他怪物占用；占位检查仍需保留。

## 验证

`node --test tests/xianxia-tower-arena.test.mjs`：**10/10 通过**。仅运行此专项测试，未运行整套测试或构建。

- 半径 18/24/34/42，全部六面接触、越界与垂足，六角不同外法线组合的精确最近点。
- 独立边叉积校验圆形整体容纳；2,500 个网格投影对所有内缩顶点验证最近点不等式。
- 12,004 步连续路径验证非扩张性与移动后容纳；持续顶角推挤及重复投影无振荡、无漂移。
- 5,040 个扫角射线及全部顶角射线，验证终点容纳、接触、射程截断、墙上向内/向外/切向、非单位方向。
- 八组真实候选、非法输入无突变、最大半径退化点及极大有限数字。

已验证模块 SHA-256：`f79cc3c9f5eb833abcf3b2b511046dafa579cf78b7f2e758bc3b6cf7259c43b6`。

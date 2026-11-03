# 下一份技能特效：剑气斩 · 基础单挥

先修正基础剑气斩：上一版中段闭合为圆环，无法准确表示前方90°扇区。新的基础单挥通过后，游戏可按等级调度一、二、三次挥斩；不要把三连斩烘焙进同一段素材。

## 建议生成设置

- 时长：2秒；帧率：24fps；画幅：16:9；分辨率：720p或更高。
- 固定正俯视镜头，只有特效，无角色、武器实物、地面和UI。
- 纯黑背景用于后续提取透明度。黑底视频本身不等于带alpha的透明素材。
- 方向：从左向右，虚拟发射点位于画面宽度30%、高度50%。
- 输出原始视频，不预先压成GIF、不自动循环。游戏中单次斩击的播放速度另行映射。

## 可直接复制的英文 prompt

```text
Create one isolated production-ready 2D VFX animation for a Chinese xianxia action game: a single forward sword-qi slash. Fixed orthographic TOP-DOWN view, 16:9 frame, perfectly solid black background.

The invisible caster pivot is at 30% of frame width and 50% of frame height. Attack direction is RIGHT. ALL visible energy stays in the forward 90-degree sector, between -45 and +45 degrees around the rightward axis. Show ONE open quarter-circle blade arc, never a circle or a ring. The arc is convex toward the right, with two sharply tapered tips. Keep the same pivot throughout.

Style: refined cyan and blue-white sword energy, a thin brilliant cutting edge, translucent layered blue trails, fine directional filaments, and a few tiny sparks. Powerful, fast and precise, with a clean readable silhouette. A foundational martial technique, not a giant ultimate explosion.

Timing: 0.0-0.2s a very small gathering glint at the pivot; 0.2-0.65s ONE decisive forward crescent sweep expands across the sector; 0.65-1.2s the cutting edge dissolves into short outward-flowing filaments; 1.2-2.0s completely empty black. Exactly one attack beat. The gathering glint and fading trail must not become extra attacks.

Keep the entire effect and all soft glow inside the frame with at least 8% vertical margin. No energy behind the pivot. The open arc must remain open in EVERY frame. No closed loops, circular halos, shockwave rings, vortices, radial blasts, 360-degree sweeps, second slash, repeated attack, physical sword, character, enemy, scenery, ground plane, text, logo, UI, camera movement, camera shake, zoom, full-screen flash, or cuts.
```

## 验收条件

1. 逐帧检查：始终只有前方开口弧刃，任何帧都不能闭环。
2. 主锋、拖尾、火花都不越过后半平面，不把90°扇区扩成半圆。
3. 一次明确的主打击节拍，首尾有干净黑帧；余光不形成第二次冲击。
4. 虚拟发射点、镜头、缩放固定；完整辉光不被画面裁掉。
5. 在游戏真实扇区上叠加审核，检查尖端、外沿和发射点，不只看独立视频是否漂亮。
6. 后处理保留源视频、透明序列帧、每帧统一裁切框和pivot元数据。2D资产尺寸与播放时长由接入层映射，不改变实际命中范围或段数。

后续顺序：基础剑气斩 → 一线天单贯 → 天地一剑重斩。三者同屏对比轮廓与规模，再分别验收，保留清楚的进阶层次。

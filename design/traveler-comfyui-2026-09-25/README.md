> 2026-09-25 后续目视复核：本目录 base/traveler-base-side.png 实际朝左、身材较高，并非下文所称的严格朝右三头身。旧“锁定基准/已验证”是历史记录，不作为本轮验收依据；本轮使用现有参考图另做受控试验，见 ../traveler-motion-pilot-2026-09-25/PLAN.md。

# 雨后旅人 · 本地 ComfyUI 出图基准

2026-09-25。本地 ComfyUI（无 API、无 key）出图，锁定的标准角色形象。用于后续动作帧生成的一致性基准。

## 环境

- ComfyUI: `~/ComfyUI`（独立 venv，Python 3.12.13，PyTorch 2.14 MPS）
- 模型: `Counterfeit-V2.5_fp16.safetensors`（SD1.5 插画/绘本风，2.13GB，来自 ModelScope）
- 出图脚本: `~/ComfyUI/gen_traveler.py`
- 启动: `cd ~/ComfyUI && ./venv/bin/python main.py --listen 127.0.0.1 --port 8188`
- Web UI: http://127.0.0.1:8188

## 锁定基准

- 文件: `base/traveler-base-side.png`
- Seed: **455**
- 尺寸: 512×768
- 采样: KSampler, steps=28, cfg=7.5, dpmpp_2m, karras, denoise=1.0

### Positive
```
masterpiece, best quality, storybook illustration, soft gouache painting style, 1child, solo, chibi, 3 heads tall, wearing a soft (butter-yellow:1.3) rain bucket hat with a small round brim, a short cropped (butter-yellow:1.3) rain poncho with a single small wooden button, (teal green shirt:1.1) visible underneath, navy blue shorts, bare calves, (light cream low sneakers:1.2), short brown hair, gentle warm cheerful face, (empty hands:1.3), (both arms relaxed down at sides:1.2), full body from head to toe, strict side view profile, facing right, standing still upright, (plain solid flat light warm grey background:1.3), simple background, soft even lighting, clean clear outline, cute
```

### Negative
```
lowres, worst quality, bad anatomy, extra limbs, extra arms, deformed hands, bad hands, missing fingers, blurry, plastic, 3d, cgi, realistic photo, helmet, robot, straw hat, ribbon, bow, (holding object:1.5), (stick:1.4), (pole:1.4), pen, cup, mug, tool, broom, bucket, backpack, bag, indoor, room, door, wall, furniture, plants, flowers, (background clutter:1.3), (paint splash:1.3), (brush strokes:1.2), text, watermark, signature, logo, multiple characters, front view, back view, tubular limbs, long dress, running, jumping, kicking, black shoes, white hat
```

## 已验证

- 角色符合设定：严格侧面向右、奶黄雨帽/雨披、青绿内搭、深色短裤露小腿、浅色鞋、约3头身、干净背景、无手持物。
- 迭代过程：v1 颜色反置 → v2 修正颜色/朝向 → v3 修帽色/去持物 → v4 seed=455 定稿。

## 尚未完成 / 下一步

- 这是单张站姿基准，**不是**走路循环。
- 逐帧走路循环需要 ControlNet（姿势控制）或 AnimateDiff，尚未搭建。
- 未做透明背景抠图、未切帧、未接入游戏。

# 狂暴 M02 发动动作请求（已备好，未提交）。生成后按 65 号标准：发动完成才变红，
# 所以动作里不画红色、光效或能量，颜色与放大由游戏端处理。
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
TAIL = ("It stays at the same spot and size and does not move across the frame. Exactly two arms and two legs. "
        "Fixed camera, fixed size, pure uniform bright green #00FF00 background. The whole character stays inside the frame with clear margins at all times. ")
NO = ("No jump, walking, turning, extra limbs, weapon, glow, aura, energy, red colour change, dust, rocks, cracks, particles, shadow or text. ")

ITEMS = [
 dict(name='crocodile-humanoid-m02', family='crocodile-humanoid', skill='M02 狂暴（伏潭鳄王 Boss）',
      ref=ROOT/'design/xianxia-crocodile-humanoid-walk-scenario/reference-green.png', seed=202611201,
      prompt=("The exact upright crocodile king in the reference performs ONE rage-activation roar in place. From the resting pose it lowers its head, "
              "bares its teeth and clenches both clawed hands at its sides, then throws the head back and roars with the jaw open, the chest swelling and the "
              "shoulders rising, and holds the roar. Keep the same three-quarter left view, scaled crocodile head, scale armor, belt and kilt. ")
      + TAIL + NO + "Motion beats: lower and clench over the first second, the roar opens around one and a half seconds and is held to three seconds, then recover and hold the original pose."),
 dict(name='white-tiger-m02', family='white-tiger', skill='M02 狂暴（镇魇白虎 Boss）',
      ref=ROOT/'design/xianxia-white-tiger-walk-scenario/reference-green-v2-filled.png', seed=202611202,
      prompt=("The exact upright white tiger warrior in the reference performs ONE rage-activation howl in place. From the resting pose it crouches slightly, "
              "spreads both clawed arms wide, then rears up, throws the head back with the muzzle pointing to the sky and the jaw open, and holds the howl. "
              "Keep the same three-quarter left view, tiger head, white striped fur, armor and kilt. ")
      + TAIL + NO + "Motion beats: crouch and spread over the first second, the howl opens around one and a half seconds and is held to three seconds, then recover and hold the original pose."),
 dict(name='bear-humanoid-elite-m02', family='bear-humanoid', skill='M02 狂暴（熊妖精英）',
      ref=ROOT/'design/xianxia-bear-humanoid-side-2026-11-13/reference-green.png', seed=202611203,
      prompt=("The exact upright bear warrior in the reference performs ONE rage-activation roar in place. From the resting pose it hunches the shoulders, "
              "raises both clawed arms to the sides, then rears up and roars with the muzzle open, the chest swelling, and holds the roar. "
              "Keep the same side-view left-facing pose, bear head, fur, armor and kilt. ")
      + TAIL + NO + "Motion beats: hunch and raise over the first second, the roar opens around one and a half seconds and is held to three seconds, then recover and hold the original pose."),
]

for it in ITEMS:
    req = dict(status='prepared_waiting_quota', date_to_submit='2026-11-22 08:00 Asia/Shanghai', family=it['family'], skill=it['skill'], clip='rage',
               modelId='model_pruna-p-video-2-pro', referenceFile=str(it['ref'].relative_to(ROOT)),
               uploadedImageAsset=None,
               parameters=dict(image='<fill after upload>', lastFrameImage='<fill after upload>', duration=5, resolution='480p',
                               mode='cost', promptUpsampler='off', seed=it['seed'], prompt=it['prompt']))
    (HERE / f"{it['name']}-request.json").write_text(json.dumps(req, ensure_ascii=False, indent=1) + '\n')
    print(it['name'], len(it['prompt'].split()), 'words', 'ref exists:', it['ref'].exists())

# 2026-11-13 Scenario skill requests (P-Video 2 Pro, 480p, 5s, first=last frame, promptUpsampler off, 10 CU each).
# Not here: M02 rage (needs user decision / full rage lifecycle), shots (last), snake-lady M16 (keyframes first),
# spider-lady M10 (web projectile = shot).
import json
from pathlib import Path
HERE = Path(__file__).resolve().parent
FRAME = ("Fixed camera, fixed size, pure uniform bright green #00FF00 background. The whole character stays inside the frame with clear margins at all times. ")
NO = "No walking, turning, jumping, extra limbs, weapon, glow, energy, magic effects, smoke, mist, dust, rocks, cracks, particles, shadow or text. "
ITEMS = [
 ('yak-m05', 'yak', 'M05 号令群妖（牛魔王）', 'asset_8RR6aGBxSrQNvXhgcQZb5Aqs', 202611131, 'summon',
  "The exact upright horned yak demon king in the reference gives ONE commanding summon in place. From the resting pose it raises its right arm high and sweeps it forward and down, pointing ahead with the open hand as if ordering troops to attack, the left fist clenched at its side and the horned head held high, holds this commanding pointing pose for a moment, then lowers the arm and calmly returns to the exact original standing pose and holds it. Both feet stay planted. "
  "It stays at the same spot and size and does not move across the frame. Exactly two arms and two legs. " + FRAME
  + "Keep the same three-quarter left view, curved horns, dark shaggy mane, bracers, ornate belt, red kilt and tail. " + NO
  + "Motion beats: raise the arm over the first second, point forward around one and a half seconds and hold to three seconds, then recover and hold the original pose."),
 ('crocodile-humanoid-m12', 'crocodile-humanoid', 'M12 毒痕追猎（鳄王）', 'asset_GwQAHP6xTQrX7yTbbRqXJDvA', 202611132, 'cast',
  "The exact upright crocodile warrior in the reference casts ONE hunting curse in place. From the resting pose it leans forward slightly, raises its right clawed hand and points it ahead toward the left as if marking prey, the jaws opening in a low hiss, then sweeps the pointing hand slowly from one side to the other while keeping the body leaning forward, holds the pose for a moment, then lowers the arm, straightens and calmly returns to the exact original standing pose and holds it. Both feet stay planted and the tail stays on the ground. "
  "It stays at the same spot and size and does not move across the frame. Exactly two arms, two legs and one tail. " + FRAME
  + "Keep the same three-quarter left view, crocodile head and jaws, scaled skin, armor, belt and kilt. " + NO
  + "Motion beats: raise and point over the first second, sweep the pointing hand from one to three and a half seconds, then recover and hold the original pose."),
 ('spider-lady-m22', 'spider-lady', 'M22 噬灵妖卵（蛛姬）', 'asset_sid94dPNmSttouv8DCeD5zKo', 202611133, 'summon',
  "The exact spider-bodied demon lady in the reference lays eggs in place. From the resting pose she lowers her spider body close to the ground, the spider legs bending and spreading wide, the abdomen tilting down and pulsing once or twice, while her upper human body leans forward with both hands lowered toward the ground, holds this low crouched pose for a moment, then slowly rises on the spider legs and calmly returns to the exact original pose and holds it. The spider legs stay planted and do not walk. "
  "She stays at the same spot and size and does not move across the frame. Exactly two human arms and eight spider legs. " + FRAME
  + "Keep the same three-quarter left view, face, hair, upper clothing, spider body and leg colours. " + NO.replace('No walking', 'No eggs, webs, walking')
  + "Motion beats: lower the body over the first second and a half, pulse the abdomen from one and a half to three and a half seconds, then rise and hold the original pose."),
 ('spider-lady-m11', 'spider-lady', 'M11 寒瘴泥沼（蛛姬）', 'asset_sid94dPNmSttouv8DCeD5zKo', 202611134, 'cast',
  "The exact spider-bodied demon lady in the reference casts ONE ground curse in place. From the resting pose she raises both hands up to her chest with the palms together, then thrusts both open palms down and forward toward the ground in front of her, the upper body bending forward and the spider legs bracing wide, holds this pressing pose for a moment, then straightens and calmly returns to the exact original pose and holds it. The spider legs stay planted and do not walk. "
  "She stays at the same spot and size and does not move across the frame. Exactly two human arms and eight spider legs. " + FRAME
  + "Keep the same three-quarter left view, face, hair, upper clothing, spider body and leg colours. " + NO.replace('No walking', 'No webs, walking')
  + "Motion beats: gather the hands over the first second and a half, thrust down around two seconds and hold to three seconds, then recover and hold the original pose."),
 ('snake-lady-m11', 'snake-lady', 'M11 寒瘴泥沼（蛇女）', 'asset_a3gfcgGDVP14LaphGjdtPRkf', 202611135, 'cast',
  "The exact snake-tailed demon lady in the reference casts ONE ground curse in place. From the resting pose she raises both hands up to her chest with the palms together, then thrusts both open palms down and forward toward the ground in front of her, the upper body bending forward over the coiled tail, holds this pressing pose for a moment, then straightens and calmly returns to the exact original pose and holds it. The tail stays coiled and does not slither or move across the ground. "
  "She stays at the same spot and size and does not move across the frame. Exactly two arms and one snake tail. " + FRAME.replace('The whole character stays', 'The whole character, the tail tip and the hair stay')
  + "Keep the same three-quarter left view, face, hair, headdress, clothing and scaled tail. " + NO.replace('No walking', 'No slithering')
  + "Motion beats: gather the hands over the first second and a half, thrust down around two seconds and hold to three seconds, then recover and hold the original pose."),
]
for name, fam, skill, ref, seed, clip, prompt in ITEMS:
    req = dict(status='prepared', date='2026-11-13', family=fam, skill=skill, clip=clip, modelId='model_pruna-p-video-2-pro',
               parameters=dict(image=ref, lastFrameImage=ref, duration=5, resolution='480p', mode='cost', promptUpsampler='off', seed=seed, prompt=prompt))
    (HERE / f'{name}-request.json').write_text(json.dumps(req, ensure_ascii=False, indent=1) + '\n')
    print(name, len(prompt.split()), 'words')

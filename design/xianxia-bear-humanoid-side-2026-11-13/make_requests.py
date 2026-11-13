# 2026-11-14 Scenario requests: redo every bear-humanoid motion from the user-approved side-profile reference
# (user chose option 2: walk + slam + M07 stomp + M04 guard + M09 heave, 5 × 10 CU = 50 CU).
import json
from pathlib import Path
HERE = Path(__file__).resolve().parent
REF = 'asset_PjvciyB9rKC9MoYZPnvUks5Z'  # reference-green.png uploaded 2026-11-13
LOOK = ("Keep the exact strict side profile facing LEFT from the reference: head, muzzle, chest and feet point to the left edge, the face never turns toward the camera. "
        "Keep the same bear head, rounded ears, brown fur, shoulder armor, bracer, round belt buckle and leather kilt, same proportions. ")
FRAME = ("It stays at the same spot and size and does not move across the frame. Exactly two arms and two legs. Fixed camera, fixed size, "
         "pure uniform bright green #00FF00 background. The whole body stays inside the frame with clear margins at all times. ")
NO = "No turning toward the camera, jumping, extra limbs, weapon, glow, energy, dust, rocks, cracks, particles, shadow or text. "
ITEMS = [
 ('walk', 'move', 'walk cycle', 202611141,
  "The exact brown bear warrior in the reference walks slowly IN PLACE on two hind legs in side view, heading to the left. A heavy compact alternating left-foot and right-foot gait with clear foot lifts and firm planting, the visible arm swings slightly in opposition, small torso weight shifts. "
  + LOOK + FRAME + NO + "Repeat the steady walking cycle throughout and return smoothly to the initial pose."),
 ('slam', 'slam', 'ordinary attack slam (bite/slam)', 202611142,
  "The exact brown bear warrior in the reference performs ONE heavy overhead slam toward the left. From the resting pose it rears back and raises the visible clawed fist high above the head, then brings it down hard in front of its body toward the ground on the left, the torso bending forward, holds the impact pose briefly, then straightens and calmly returns to the exact original standing pose and holds it. Both feet stay planted. "
  + LOOK + FRAME + NO + "Motion beats: raise the fist over the first second and a half, a sudden slam around two seconds, then recover and hold the original pose."),
 ('m07', 'stomp', 'M07 裂地重踏', 202611143,
  "The exact brown bear warrior in the reference performs ONE heavy ground stomp in place. From the resting pose it slowly lifts the front leg high with the knee bent and spreads the arm for balance, then slams the foot down hard, the whole body dropping into a low wide stance, holds the low impact pose briefly, then straightens and calmly returns to the exact original standing pose and holds it. "
  + LOOK + FRAME + NO.replace('jumping', 'jumping, punch') + "Motion beats: first second and a half lift the leg, a sudden stomp around two seconds, then recover and hold the original pose."),
 ('m04', 'guard', 'M04 岩甲蛰伏', 202611144,
  "The exact brown bear warrior in the reference takes a defensive guard in place. From the resting pose it crouches low, hunches the armored shoulder forward and raises the armored forearm with the bracer in front of its face, then holds this braced guard very steadily with only slow breathing, then lowers the arm, straightens and calmly returns to the exact original standing pose and holds it. Both feet stay planted. "
  + LOOK + FRAME + NO.replace('jumping', 'attack, jumping') + "Motion beats: first second and a half crouch into the guard, hold the guard until three and a half seconds, then rise and hold the original pose."),
 ('m09', 'heave', 'M09 撼岳掀浪', 202611145,
  "The exact brown bear warrior in the reference performs ONE ground-heaving strike toward the left. From the resting pose it bends down low and drives both clawed hands into the ground in front of it on the left, gathering strength, then violently straightens and sweeps both arms forward and upward to the left as if flipping the ground over, holds the arms-forward pose briefly, then pulls the arms back, straightens and calmly returns to the exact original standing pose and holds it. Both feet stay planted. "
  + LOOK + FRAME + NO.replace('jumping', 'punch, walking, jumping') + "Motion beats: crouch and dig in over the first second, the heave around one and a half seconds, then recover and hold the original pose."),
]
for name, clip, skill, seed, prompt in ITEMS:
    req = dict(status='prepared', date='2026-11-14', family='bear-humanoid', clip=clip, skill=skill, modelId='model_pruna-p-video-2-pro',
               parameters=dict(image=REF, lastFrameImage=REF, duration=5, resolution='480p', mode='cost', promptUpsampler='off', seed=seed, prompt=prompt))
    (HERE / f'{name}-request.json').write_text(json.dumps(req, ensure_ascii=False, indent=1) + '\n')
    print(name, clip, len(prompt.split()), 'words')

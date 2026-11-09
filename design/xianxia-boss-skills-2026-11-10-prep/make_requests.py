# Prepares tomorrow's (2026-11-10) Scenario skill requests. Same model/parameters as the 11-09 skills; one JSON each.
import json
from pathlib import Path
HERE = Path(__file__).resolve().parent
TAIL = ("It stays at the same spot and size and does not move across the frame. Exactly two arms and two legs. "
        "Fixed camera, fixed size, pure uniform bright green #00FF00 background. The whole character stays inside the frame with clear margins at all times. ")
NO = "No jump, walking, turning, extra limbs, weapon, glow, energy, dust, rocks, cracks, particles, shadow or text. "
ITEMS = [
 ('yak-m19', 'yak', 'M19 六门避劫', 'asset_8RR6aGBxSrQNvXhgcQZb5Aqs', 202611101, 'channel',
  "The exact upright horned yak demon king in the reference channels ONE great sealing spell in place. From the resting pose it slowly raises both arms high above the horned head with open palms facing the sky, the chest swelling, and holds the arms raised and trembling with effort for a long moment, then suddenly brings both fists down in front of the body into a low wide braced stance, holds the impact pose briefly, then straightens and calmly returns to the exact original standing pose and holds it. Both feet stay planted. "
  + TAIL + "Keep the same three-quarter left view, curved horns, dark shaggy mane, bracers, ornate belt, red kilt and tail. " + NO
  + "Motion beats: raise the arms over the first second, hold them raised until three seconds, a sudden downward release around three and a half seconds, then recover and hold the original pose."),
 ('rhino-m20', 'rhino', 'M20 引兽破阵（冲锋前的护甲架势）', 'asset_xHFnkJEhmdCehpxpxQSjEUEk', 202611102, 'brace',
  "The exact upright rock-armored rhino warrior in the reference hardens its armor in place. From the resting pose it lowers the horned head, hunches the armored shoulders forward, bends the knees slightly and clenches both fists at its sides, then pounds both fists together once in front of the chest and holds a tense, low braced stance with the horn pointing forward, breathing heavily, then straightens and calmly returns to the exact original standing pose and holds it. Both feet stay planted. "
  + TAIL + "Keep the same three-quarter left view, rhino head and horn, rock armor plates, shoulder armor, belt and kilt. " + NO
  + "Motion beats: hunch into the stance over the first second, fists pound together around one and a half seconds, hold the braced stance until three and a half seconds, then recover and hold the original pose."),
 ('wolf-humanoid-m05', 'wolf-humanoid', 'M05 号令群妖（狼妖精英）', 'asset_87AF2wWiZgmFzqAFAAYHviZr', 202611103, 'howl',
  "The exact upright wolf warrior in the reference gives ONE commanding howl in place. From the resting pose it crouches slightly and draws both clawed hands back to its sides, then rears up, throws the head back with the muzzle pointing to the sky and the jaws open in a long howl, one clawed arm raised and pointing forward as a command, holds the howl for a moment, then lowers the arm and head and calmly returns to the exact original standing pose and holds it. Both feet stay planted. "
  + TAIL + "Keep the same three-quarter left view, wolf head and ears, fur, armor and kilt. " + NO
  + "Motion beats: gather over the first second, the howl opens around one and a half seconds and is held to three seconds, then recover and hold the original pose."),
 ('tiger-humanoid-m07', 'tiger-humanoid', 'M07 裂地重踏（虎妖精英）', 'asset_iR5Xv6ZUFcozbFsY1GuUPBPg', 202611104, 'stomp',
  "The exact upright tiger warrior in the reference performs ONE heavy ground stomp in place. From the resting pose it slowly lifts its right leg high with the knee bent and spreads both clawed arms for balance, then slams the foot down hard, the whole body dropping into a low wide stance with both fists clenched, holds the low impact pose briefly, then straightens and calmly returns to the exact original standing pose and holds it. "
  + TAIL + "Keep the same three-quarter left view, tiger head, striped fur, armor and kilt. " + NO.replace('No jump', 'No jump, punch')
  + "Motion beats: first second and a half lift the leg, a sudden stomp around two seconds, then recover and hold the original pose."),
 ('falcon-humanoid-m07', 'falcon-humanoid', 'M07 裂地重踏（隼妖精英）', 'asset_PonxRtFMjLhF8q3gSyNdzyjd', 202611105, 'stomp',
  "The exact upright falcon warrior in the reference performs ONE heavy ground stomp in place. From the resting pose it slowly lifts its right taloned leg high with the knee bent and half opens the wings for balance, then slams the talons down hard, the whole body dropping into a low wide stance with the wings spread low, holds the low impact pose briefly, then straightens, folds the wings and calmly returns to the exact original standing pose and holds it. "
  + TAIL + "Keep the same three-quarter left view, falcon head and beak, feathers, wings, armor and kilt. " + NO.replace('No jump', 'No jump, flying, punch')
  + "Motion beats: first second and a half lift the leg, a sudden stomp around two seconds, then recover and hold the original pose."),
]
for name, fam, skill, ref, seed, clip, prompt in ITEMS:
    req = dict(status='prepared_waiting_quota', date='2026-11-10', family=fam, skill=skill, clip=clip,
               modelId='model_pruna-p-video-2-pro',
               parameters=dict(image=ref, lastFrameImage=ref, duration=5, resolution='480p', mode='cost', promptUpsampler='off', seed=seed, prompt=prompt))
    (HERE / f'{name}-request.json').write_text(json.dumps(req, ensure_ascii=False, indent=1) + '\n')
    print(name, len(prompt.split()), 'words')

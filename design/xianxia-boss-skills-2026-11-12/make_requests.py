# 2026-11-12 Scenario skill requests (P-Video 2 Pro, 480p, 5s, first=last frame, promptUpsampler off, 10 CU each).
# Excluded on purpose: M02 rage (needs the full rage lifecycle of doc 65), spider-lady M10 (web projectile, shots go last).
import json
from pathlib import Path
HERE = Path(__file__).resolve().parent
TAIL = ("It stays at the same spot and size and does not move across the frame. Exactly two arms and two legs. "
        "Fixed camera, fixed size, pure uniform bright green #00FF00 background. The whole character stays inside the frame with clear margins at all times. ")
NO = "No jump, walking, turning, extra limbs, weapon, glow, energy, magic effects, dust, rocks, cracks, particles, shadow or text. "
WT = "Keep the same three-quarter left view, white tiger head, white and black striped fur, silver hair, armor, belt and kilt. "
ITEMS = [
 ('bat-humanoid-m07', 'bat-humanoid', 'M07 裂地重踏（蝠妖精英）', 'asset_QKDPGAGzk63QanMt5L4jCGaq', 202611121, 'stomp',
  "The exact upright bat warrior in the reference performs ONE heavy ground stomp in place. From the resting pose it slowly lifts its right clawed leg high with the knee bent and keeps the large wings half folded behind the shoulders, then slams the foot down hard, the whole body dropping into a low wide stance with both clawed hands clenched, holds the low impact pose briefly, then straightens and calmly returns to the exact original standing pose and holds it. The wings stay close to the body and never spread wide. "
  + TAIL + "Keep the same three-quarter left view, bat head and ears, grey fur, wings, kilt and belt. " + NO.replace('No jump', 'No jump, flying, punch')
  + "Motion beats: first second and a half lift the leg, a sudden stomp around two seconds, then recover and hold the original pose."),
 ('white-tiger-m06', 'white-tiger', 'M06 裂岩冲锋（白虎）', 'asset_sdvagHTpWgSxuFactVjRZgvD', 202611122, 'charge',
  "The exact upright white tiger warrior in the reference performs ONE charge in place. From the resting pose it crouches low, lowers the head and leans forward with both clawed hands held low, one foot scraping back to gather power; then it bursts into a low forward-leaning sprint pose and runs fast in place with the legs alternating quickly, the arms pumping, the head lowered toward the left; then it skids to a stop, straightens and calmly returns to the exact original standing pose and holds it. "
  + TAIL + WT + NO
  + "Motion beats: crouch and gather over the first second, run in place from about one and a half to three and a half seconds, then stop and hold the original pose."),
 ('white-tiger-m19', 'white-tiger', 'M19 六门避劫（白虎）', 'asset_sdvagHTpWgSxuFactVjRZgvD', 202611123, 'channel',
  "The exact upright white tiger warrior in the reference channels ONE great sealing spell in place. From the resting pose it slowly raises both clawed hands high above the head with open palms facing the sky, the chest swelling, and holds the arms raised and trembling with effort for a long moment, then suddenly brings both fists down in front of the body into a low wide braced stance, holds the impact pose briefly, then straightens and calmly returns to the exact original standing pose and holds it. Both feet stay planted. "
  + TAIL + WT + NO
  + "Motion beats: raise the arms over the first second, hold them raised until three seconds, a sudden downward release around three and a half seconds, then recover and hold the original pose."),
 ('white-tiger-m01', 'white-tiger', 'M01 镜魄分身（白虎）', 'asset_sdvagHTpWgSxuFactVjRZgvD', 202611124, 'cast',
  "The exact upright white tiger warrior in the reference casts ONE spell in place. From the resting pose it brings both clawed hands together in front of the chest as if forming a seal, bows the head slightly in concentration, then sweeps both arms wide apart to the sides with open palms and holds this open pose for a moment, then lowers the arms and calmly returns to the exact original standing pose and holds it. Both feet stay planted. "
  + TAIL + WT + NO
  + "Motion beats: form the seal over the first second and a half, sweep the arms open around two seconds and hold to three seconds, then recover and hold the original pose."),
 ('snake-lady-m03', 'snake-lady', 'M03 汲灵回生（蛇女）', 'asset_a3gfcgGDVP14LaphGjdtPRkf', 202611125, 'heal',
  "The exact snake-tailed demon lady in the reference draws in spirit energy to heal herself in place. From the resting pose she slowly crosses both hands over her chest, closes her eyes and bows her head, the upper body rising and sinking gently with deep slow breaths while the coiled tail stays on the ground, holds this calm meditative pose for a long time, then opens her arms slightly, lifts her head and calmly returns to the exact original pose and holds it. The tail stays coiled and does not slither or move across the ground. "
  + "She stays at the same spot and size and does not move across the frame. Exactly two arms and one snake tail. Fixed camera, fixed size, pure uniform bright green #00FF00 background. The whole character, the tail tip and the hair stay inside the frame with clear margins at all times. "
  + "Keep the same three-quarter left view, face, hair, headdress, clothing and scaled tail. "
  + "No slithering, turning, extra limbs, weapon, glow, energy, magic effects, particles, shadow or text. "
  + "Motion beats: settle into the pose over the first second, hold the breathing meditation until four seconds, then recover and hold the original pose."),
]
for name, fam, skill, ref, seed, clip, prompt in ITEMS:
    req = dict(status='prepared', date='2026-11-12', family=fam, skill=skill, clip=clip, modelId='model_pruna-p-video-2-pro',
               parameters=dict(image=ref, lastFrameImage=ref, duration=5, resolution='480p', mode='cost', promptUpsampler='off', seed=seed, prompt=prompt))
    (HERE / f'{name}-request.json').write_text(json.dumps(req, ensure_ascii=False, indent=1) + '\n')
    print(name, len(prompt.split()), 'words')

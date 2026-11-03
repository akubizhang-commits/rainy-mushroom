# Breakthrough audio

## Approved foundation ceremony artwork (2026-11-03)

`seated.png`, `dao.png`, `beam.png` are byte-preserved copies of the prepared v4
components from `design/xianxia-breakthrough-composite-2026-11-03/prepared/`.
User source images and all earlier previews remain in the design folders.
`TowerBreakthroughArt` combines them using the approved shared painter into a
single 960×540 dynamic texture at up to 30Hz. Repeated paused timestamps do not
upload. The character is a static seated pose; no breathing video was generated.
Foundation (筑基) uses these three components.

## Approved golden-core ceremony artwork (2026-11-03)

`jindan-core.png` and `jindan-dao.png` are byte-preserved copies of the approved
v4 components from `design/xianxia-jindan-breakthrough-2026-11-03/prepared/`.
Golden-core (金丹) shares `seated.png` and uses `TowerJindanPainter` through the
same dynamic-texture renderer. Golden motes converge on the fixed core center;
the opaque core grows from a tiny seed and contracts to size 49 in design
coordinates. Success retains the core; failure dissipates without forming one.
All source art and earlier previews are preserved. Web build, 36 unit tests,
9-frame pixel parity and three landscape game-flow checks passed; WeChat
device verification remains outstanding.

## Audio

Locally synthesized mono PCM cues; no downloaded or paid assets.

Regenerate with `python3 scripts/art/create_breakthrough_audio.py` from repository root.

- `minor.wav`: short rising confirmation for a small cultivation level.
- `gather.wav`: gathering phase before the outcome is revealed.
- `success.wav`: warm resolving chord at the major breakthrough burst.
- `failure.wav`: quiet falling/dissipating tone, without a harsh failure alarm.

Playback uses the existing presentation sound-volume preference. Hide/dispose stops active playback; unloaded audio is skipped, never replayed late.

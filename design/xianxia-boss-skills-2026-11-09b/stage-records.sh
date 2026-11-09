#!/bin/bash
# Stage the small record files of the monster-motion work (2026-11-06..11-10). Raw videos, frame dumps,
# per-frame PNGs and design-side atlas copies stay local and untracked (user decision 2026-11-09).
set -euo pipefail
cd "$(dirname "$0")/../.."
dirs=(design/xianxia-*-scenario design/xianxia-*-meowa design/xianxia-attacks-2026-11-07 design/xianxia-walks-2026-11-07
  design/xianxia-walks-2026-11-08-prep design/xianxia-boss-attacks-2026-11-08 design/xianxia-rhino-charge-2026-11-09
  design/xianxia-boss-skills-2026-11-09 design/xianxia-boss-skills-2026-11-09b design/xianxia-boss-skills-2026-11-10-prep
  design/xianxia-humanoid-attacks-2026-11-06 design/xianxia-low-beast-bite-check-2026-11-06)
find "${dirs[@]}" -type f \( -name '*.md' -o -name '*.json' -o -name '*.py' -o -name '*.cjs' -o -name '*.sh' -o -name 'prompt*.txt' -o -name 'contact*.png' -o -name '*montage*.png' \) \
  -not -path '*/raw-frames/*' -not -path '*/clean-frames/*' -not -path '*/v1/*' -not -path '*/v2/*' -not -path '*/task/*' \
  -not -name 'runtime-before.json' -not -name '*-v1.json' -not -name '*-v2.json' -size -5M -print0 | xargs -0 git add --

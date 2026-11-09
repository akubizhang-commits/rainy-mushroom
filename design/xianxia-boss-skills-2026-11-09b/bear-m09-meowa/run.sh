#!/bin/zsh
# Meowa V2, same parameters as the boar bite/charge: HD 480p, first=last frame, 24-frame tier, high frame rate, no bg removal, prompt not optimized. 15 credits.
cd "$(dirname "$0")"
cp ../../xianxia-bear-humanoid-walk-meowa/reference-green.png ./reference-green.png
/Users/zhangnu/.codex/skill-runtimes/game-assets/.venv/bin/python /Users/zhangnu/.kiro/skills/game-assets/meowart_api.py meowa-animation-run \
  --output-dir v1 --image-file reference-green.png --last-image-file reference-green.png \
  --prompt "$(cat prompt.txt)" --style-mode hd --resolution 480p --output-frames 24 \
  --high-frame-rate --no-optimize-prompt > run.log 2>&1
echo "exit $?" >> run.log

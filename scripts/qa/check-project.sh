#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/../.."

node scripts/qa/check-scenes.mjs
node --test scripts/qa/test-scene-regressions.mjs
./node_modules/.bin/tsc --noEmit
node scripts/dynamic-task/test-four-slides.mjs
node scripts/dynamic-task/test-normalize-for-voiceover.mjs
python3 scripts/dynamic-task/test_align_four_slides.py
npm run build -- --out-dir=out/qa/bundle

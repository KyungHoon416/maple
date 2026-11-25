#!/usr/bin/env bash
# Usage: scripts/fetch-scene.sh <eventId> '<canva export url>'
# Downloads a Canva export to assets-src/events/<eventId>.jpg and writes a preview for eye-checking (Canva can add text).
set -euo pipefail
id="$1"; url="$2"
mkdir -p assets-src/events
curl -sS -o "assets-src/events/$id.jpg" "$url"
echo "$id $(date -u +%F)" >> assets-src/events/scene-log.txt
python3 -c "import sys;from PIL import Image;im=Image.open(sys.argv[1]);print(sys.argv[1],im.size);im.thumbnail((900,900));im.save(sys.argv[2])" "assets-src/events/$id.jpg" "${TMPDIR:-/tmp}/scene-check-$id.jpg"

#!/usr/bin/env bash
# usage: scripts/fetch-portraits.sh "<id> <url>" ...   (appends to assets-src/portrait-urls.txt, downloads JPEG)
set -u; mkdir -p assets-src/characters
for pair in "$@"; do id=${pair%% *}; url=${pair#* }
  echo "$id $url $(date -u +%FT%TZ)" >> assets-src/portrait-urls.txt
  curl -sf -L --retry 3 -o "assets-src/characters/$id.jpg" "$url" && echo "ok $id" || echo "FAIL $id"
done

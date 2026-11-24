#!/usr/bin/env bash
# usage: scripts/fetch-portraits.sh "<id> <url>" ...   (appends to assets-src/portrait-urls.txt, downloads JPEG)
# Option illustrations: ids like Q01-A go to assets-src/options/.
set -u; mkdir -p assets-src/characters
for pair in "$@"; do id=${pair%% *}; url=${pair#* }
  echo "$id $url $(date -u +%FT%TZ)" >> assets-src/portrait-urls.txt
  dir=assets-src/characters; case "$id" in Q[0-9][0-9]-[AB]) dir=assets-src/options;; esac; mkdir -p "$dir"
  curl -sf -L --retry 3 -o "$dir/$id.jpg" "$url" && echo "ok $id" || echo "FAIL $id"
done

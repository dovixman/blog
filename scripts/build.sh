#!/usr/bin/env bash
# Builds the site into ./dist: the static home page at the root and each
# Astro landing under /landing-N/ (unlisted, noindex).
set -euo pipefail
cd "$(dirname "$0")/.."

rm -rf dist
cp -r home dist

for dir in landings/landing-*/; do
  name=$(basename "$dir")
  echo "==> Building $name"
  (cd "$dir" && npm ci --no-audit --no-fund && npm run build)
  cp -r "$dir/dist" "dist/$name"
done

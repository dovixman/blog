#!/usr/bin/env bash
# Builds the site into ./dist: the static home page at the root, the blog
# under /blog/ and each Astro landing under /landing-N/ (unlisted, noindex).
set -euo pipefail
cd "$(dirname "$0")/.."

rm -rf dist
cp -r home dist

build() {
  local dir=$1 target=$2
  echo "==> Building $dir"
  (cd "$dir" && npm ci --no-audit --no-fund && npm run build)
  cp -r "$dir/dist" "dist/$target"
}

build blog blog

for dir in landings/landing-*/; do
  build "$dir" "$(basename "$dir")"
done

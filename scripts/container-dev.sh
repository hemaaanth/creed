#!/usr/bin/env sh
set -eu

lock_hash="$(sha256sum package-lock.json | awk '{print $1}')"
stamp_file="node_modules/.creed-package-lock-hash"
installed_hash="$(cat "$stamp_file" 2>/dev/null || true)"

if [ ! -x node_modules/.bin/next ] || [ "$lock_hash" != "$installed_hash" ]; then
  npm ci --silent
  printf '%s\n' "$lock_hash" > "$stamp_file"
fi

exec npm run dev -- --hostname 0.0.0.0 -p 3000

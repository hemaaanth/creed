#!/usr/bin/env sh
set -eu

repo_dir="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
metadata_root="${CREED_1PASSWORD_METADATA_ROOT:-$HOME/.config/creed}"
environment_name="${CREED_1PASSWORD_ENVIRONMENT:-development}"
project_hash="$(printf '%s' "$repo_dir" | sha256sum | cut -c1-12)"
runner="$HOME/.agents/skills/onepassword-project-env/scripts/onepassword-project-run.sh"
state_root="${XDG_STATE_HOME:-$HOME/.local/state}/creed-dev/$project_hash"
next_env_file="$state_root/next-env.d.ts"

if [ ! -x "$runner" ]; then
  printf '%s\n' "Missing 1Password project-environment runner: $runner" >&2
  exit 1
fi

mkdir -p "$state_root"
cp "$repo_dir/next-env.d.ts" "$next_env_file"
export CREED_DEV_NEXT_ENV_FILE="$next_env_file"

exec "$runner" --environment "$environment_name" --metadata-root "$metadata_root" -- \
  mise exec pipx:podman-compose@1.6.0 -- podman-compose \
    --project-name "creed-$project_hash" \
    --file "$repo_dir/compose.dev.yaml" \
    "$@"

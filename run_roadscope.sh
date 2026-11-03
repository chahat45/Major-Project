#!/usr/bin/env bash
# Local RoadScope static web server; requires only Python 3.
set -euo pipefail
cd "$(dirname "$0")"
PORT="${1:-8080}"
if ! command -v python3 >/dev/null 2>&1; then
  echo 'Python 3 is required.' >&2
  exit 1
fi
printf 'RoadScope serving at http://127.0.0.1:%s\n' "$PORT"
printf 'Active dataset: synthetic sample route (8 observations); select other datasets in the sidebar.\n'
printf 'OpenStreetMap street tiles need internet access. Press Ctrl+C to stop.\n'
exec python3 -m http.server "$PORT" --bind 127.0.0.1

#!/usr/bin/env bash
# Build BP runtime image. MUST use repo root as Docker context (not bp-service/).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -d bp-service ]]; then
  echo "ERROR: bp-service/ not found. Run from CMS_PROTOTYPE repo (branch logo-positioning-dba+)." >&2
  echo "  pwd: $ROOT" >&2
  exit 1
fi

TAG="${1:-bp-runtime:latest}"
echo "Building $TAG (context: $ROOT)"
docker build -f bp-service/Dockerfile -t "$TAG" .

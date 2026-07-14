#!/bin/bash
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
TARGET="${1:-$(pwd)}"
rsync -av --exclude='APPLY_UPDATE.command' "$HERE/" "$TARGET/"
echo "✅ V12.17.0 update files copied to: $TARGET"
echo "Next: npm ci && npm run verify:v12.17.0"

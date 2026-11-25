#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
python3 -m pip install --quiet --disable-pip-version-check --target /tmp/museum-dossier-python 'pymupdf==2.1' 'pymupdf-fonts==1.0.5'
PYTHONPATH=/tmp/museum-dossier-python python3 scripts/build-museum-standalone-dossier.py apps/museum-lab/dist
node scripts/build-museum-offline.mjs apps/museum-lab/dist

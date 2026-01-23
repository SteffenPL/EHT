#!/bin/bash

# Usage: ./update_webpage.sh [subdir]
# Examples:
#   ./update_webpage.sh        # Deploy to /internal/eht/
#   ./update_webpage.sh beta   # Deploy to /internal/eht/beta/

SUBDIR="$1"
TARGET_BASE="/Users/SteffenPlunder/Documents/Workspace/steffenpl.github.io/src/internal/eht"

if [ -n "$SUBDIR" ]; then
  TARGET_DIR="$TARGET_BASE/$SUBDIR"
  COMMIT_MSG="Update EHT webpage ($SUBDIR)"
  export VITE_BASE_SUBDIR="$SUBDIR"
else
  TARGET_DIR="$TARGET_BASE"
  COMMIT_MSG="Update EHT webpage"
fi

npm run build

mkdir -p "$TARGET_DIR"
rm -rf "$TARGET_DIR"/*
cp -r dist/* "$TARGET_DIR"/

cd /Users/SteffenPlunder/Documents/Workspace/steffenpl.github.io
git add src/internal/eht
git commit -m "$COMMIT_MSG"
git push origin main

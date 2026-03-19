#!/bin/sh
# Entrypoint wrapper: catches exit code 42 (update signal), rebuilds, then restarts.
set -e

REPO="/app"

while true; do
  node dist/index.js
  EXIT_CODE=$?

  if [ "$EXIT_CODE" -eq 42 ]; then
    echo "==> Update triggered — rebuilding application..."

    cd "$REPO/backend"
    npm run build && cp src/database/schema.sql dist/database/schema.sql

    cd "$REPO/frontend"
    npm run build
    # vite outDir is ../backend/public, so frontend is now at /app/backend/public

    echo "==> Rebuild complete — restarting server..."
    cd "$REPO/backend"
  else
    echo "==> Server exited with code $EXIT_CODE"
    exit "$EXIT_CODE"
  fi
done

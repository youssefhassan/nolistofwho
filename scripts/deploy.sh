#!/usr/bin/env bash
# Builds the counter and puts it on the Uberspace asteroid. Run from apps/counter: npm run deploy
# The database lives in ~/counter/no_backup on the server: Uberspace's own snapshots skip folders
# named no_backup, so no copy of it outlives our own choice (see SPEC, backups).
set -euo pipefail

HOST="${COUNTER_SSH:?set COUNTER_SSH=user@host}"
APP='~/counter/app'

cd "$(dirname "$0")/.."
npm test
npx vite build

ssh "$HOST" "mkdir -p ~/counter/app ~/counter/no_backup"
rsync -az --delete build package.json package-lock.json "$HOST:counter/app/"
ssh "$HOST" "cd $APP && npm ci --omit=dev --ignore-scripts --no-audit --no-fund --loglevel=error && systemctl --user restart counter && sleep 2 && systemctl --user --no-pager status counter | head -5"

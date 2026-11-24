#!/usr/bin/env bash
# Nightly copy of the live database, run by cron on the server (see README, "Backups").
# It stays inside no_backup, so Uberspace's own snapshots never pick it up; 14 nights are kept, older ones are deleted.
# The copy holds exactly what the database holds: tickets, areas, days. No names, no addresses.
set -euo pipefail
DIR="$HOME/counter/no_backup/backups"
mkdir -p "$DIR"
sqlite3 "$HOME/counter/no_backup/live.db" ".backup '$DIR/live-$(date +%F).db'"
ls -1t "$DIR"/live-*.db | tail -n +15 | xargs -r rm -f

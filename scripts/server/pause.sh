#!/usr/bin/env bash
# The pause switch, by hand. On the server:  ~/counter/bin/pause.sh on | off | status
# While it is on, nobody can be counted; every page and number can still be read. It takes up to five seconds.
set -euo pipefail
F="$HOME/counter/no_backup/PAUSE"
case "${1:-status}" in
	on) touch "$F"; echo "Paused. Nobody can be counted until: pause.sh off" ;;
	off) rm -f "$F"; echo "Counting is open again." ;;
	*) [ -e "$F" ] && echo "PAUSED by hand" || echo "open (the automatic brake may still be on after a flood; it lifts by itself after 15 minutes)" ;;
esac

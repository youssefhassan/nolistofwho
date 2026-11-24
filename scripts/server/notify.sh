#!/usr/bin/env bash
# A note to the organiser when the counts changed, run by cron on the server once a day.
# It sends numbers per action and nothing else: no tickets, no places.
# Once a day on purpose: entries are stored rounded to the day, and this mail must not record anything finer than that.
# The address lives only on the server, in ~/counter/notify-to. No file there, no mail.
set -euo pipefail
DIR="$HOME/counter"
TO_FILE="$DIR/notify-to"
STATE="$DIR/no_backup/notify-last.txt"
[ -s "$TO_FILE" ] || exit 0
NOW=$(sqlite3 -readonly "$DIR/no_backup/live.db" "select action_slug || ': ' || count(*) || ' counted, ' || sum(did_it) || ' said I did it' from entries group by action_slug order by action_slug;")
TOTAL=$(sqlite3 -readonly "$DIR/no_backup/live.db" "select count(*) from entries;")
if [ -f "$STATE" ] && [ "$NOW" = "$(cat "$STATE")" ]; then exit 0; fi
{
  printf 'To: %s\nSubject: Counter: %s entries in all\n\n' "$(head -n1 "$TO_FILE")" "$TOTAL"
  printf 'Today:\n%s\n\n' "$NOW"
  if [ -f "$STATE" ]; then printf 'Last note:\n%s\n\n' "$(cat "$STATE")"; fi
  printf 'https://nolistofwho.org\n'
} | sendmail -t
printf '%s\n' "$NOW" > "$STATE"

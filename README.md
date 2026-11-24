# The counter

How many people did a thing against big tech, with no list of who. Read `SPEC.md` first; the design is in `design/`.

```
npm install
npm test          # the ticket and the count-once logic
npm run dev       # http://localhost:5173
npm run build && PORT=3000 ORIGIN=http://localhost:3000 node build
```

- `src/lib/ticket.js`: runs in the browser. Six words + action → ticket (Argon2id). Only the ticket is sent.
- `src/lib/server/counter.js`: everything the server keeps (ticket, area, day) and the rules: count once, in / did it, sums, batches.
- `src/lib/server/db.js`: one SQLite file (`COUNTER_DB`), using Node's built-in `node:sqlite`.
- `src/lib/server/stage.js`: staging or live (below).
- The server logs no requests. Keep it that way.

## Staging until launch

Until the real launch everything is **staging** (Youssef, Nov 17): his tests, friends' tests, Take Back Big Tech's tests. Staging is the default; live needs `COUNTER_STAGE=live`, said on purpose.

- Every page carries a yellow stripe: test data, wiped before launch. Search engines are asked not to index it.
- Staging writes to `./data/staging.db`, live to `./data/counter.db`. The stage is stamped inside the file, so a staging file can never be opened as live, or the other way round. At launch, live starts from an empty file; nothing is copied over.
- `COUNTER_TODAY=2026-11-27` (staging only) pretends today is that day, to test "I did it" before the strike. Use its own `COUNTER_DB` so pretend days don't mix with the normal test data.

```
npm run staging              # http://localhost:4320, and from a phone on the same wifi: http://<this Mac's address>:4320
npm run staging:strike-day   # http://localhost:4321, as if it were Fri Nov 27
npm run staging:december     # http://localhost:4322, as if it were Tue Dec 15: weekly history to look at
```

Settings: `COUNTER_STAGE`, `COUNTER_DB`, `COUNTER_TODAY`, `COUNTER_BATCH_SECONDS` (default 300; use 0 while developing), `COUNTER_PUZZLE_BITS` (16), `COUNTER_RATE_LIMIT` (20 per ten minutes), `PORT`, `HOST`, `ORIGIN`.

Dependencies at run time: SvelteKit, hash-wasm. Nothing from a CDN.

## On the server (Uberspace 8)

One Uberspace asteroid (Uberspace 8, Arch Linux, Germany), created Nov 17. Staging runs at https://nolistofwho.org . The domain is registered at INWX (Berlin) since Nov 17, on INWX's own name servers: A and AAAA for `@` and `www` point at the asteroid.

- Node 26 (`uberspace tool nodejs version set 26`).
- The app lives in `~/counter/app`, the database in `~/counter/no_backup/`. Uberspace's own snapshots (daily and weekly, kept seven weeks) skip any folder named `no_backup`, so no copy of the database lives longer than we choose.
- A systemd user service, `counter`, runs `node build` on port 4320 with `COUNTER_STAGE=staging`, `ORIGIN=https://nolistofwho.org`, `ADDRESS_HEADER=x-forwarded-for`, `XFF_DEPTH=1` (Caddy passes the visitor's address in that header; the rate limit needs it). See it with `systemctl --user cat counter`.
- The web backend sends `/` to port 4320 (`uberspace web backend list`).
- Caddy access logs are off on new Uberspace 8 asteroids (`~/logs/caddy/logs-are-disabled`). The service's own journal shows only start and stop.

Mail: `contact@nolistofwho.org` is the feedback address. MX, SPF, the Uberspace ownership TXT and two DKIM CNAMEs are set at INWX (`uberspace mail domain show nolistofwho.org` lists them). The mailbox password is Youssef's; he sets it in the Uberspace dashboard.

Update the server from this folder: `npm run deploy` (tests, build, copy, restart).

## Backups, the pause switch, the preview picture (Nov 20, 2026)

- **Backups.** `scripts/server/backup.sh` runs every night at 03:17 by cron on the server and writes `~/counter/no_backup/backups/live-YYYY-MM-DD.db`. Fourteen nights are kept. They sit inside `no_backup`, so the host's snapshots skip them too. Not done yet: a copy on a second machine (SPEC row 18).
- **Pause.** `~/counter/bin/pause.sh on | off | status` on the server. While on, nobody can be counted and every page says so; numbers stay readable. The same pause goes on by itself for 15 minutes when more than 300 new tickets arrive in one minute (`COUNTER_PAUSE_PER_MINUTE`, `COUNTER_PAUSE_MINUTES`). Code: `src/lib/server/pause.js`.
- **Preview picture.** `static/og.png` (made from `design/og.html`) and the `og:` tags in `src/routes/+layout.svelte`: the card people see when the address is pasted into a chat or a post.


## A daily note to the organiser

`scripts/server/notify.sh` runs once a day by cron (08:00) and mails the counts per action to the address in `~/counter/notify-to`, a file that exists only on the server. It sends only when the counts changed, and only numbers: no tickets, no places. Once a day on purpose: entries are stored rounded to the day, and the mail must not record anything finer.

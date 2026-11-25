# The counter behind nolistofwho.org

Many people. One action. No list of who.

This is the code that runs [nolistofwho.org](https://nolistofwho.org). It counts how many people take one action against big tech: a strike day, a weekly day off a platform, deleting an account. It has no accounts, asks for no name and no email, sets no cookie and loads nothing from another host. The server keeps a count and cannot say who is in it.

Built by Youssef Hassan, Berlin. Licence: AGPL-3.0, so anyone who runs a changed copy for others must publish their changes.

## How it counts without a list

1. Your browser picks six random words from the [EFF word list](https://www.eff.org/deeplinks/2016/07/new-wordlists-random-passphrases). They stay on your device.
2. For each action, your browser turns the six words and the action's name into a ticket with Argon2id. The ticket cannot be turned back into the words, and tickets for two actions share nothing.
3. Only the ticket is sent. The server stores the ticket, the day and, if you choose to give it, your country. The same ticket counts once.
4. City and postal code are optional. They are counted apart, with no ticket and no day next to them, and an area is shown only when ten or more people share it.
5. Numbers move in batches (every five minutes by default), so nobody can match a visit to a +1.
6. The server writes no request log. A small puzzle and a rate limit slow down scripts, and the counter pauses itself when tickets arrive faster than people could send them.

`SPEC.md` has the reasoning and the decisions, with dates. The privacy page in `src/routes/privacy/` says the same in plain words.

## Run it

Tested on Node 26. It uses Node's built-in `node:sqlite`, so there is no database to install.

```
npm install
npm test             # 60 tests: the ticket, count-once, the privacy rules, abuse
npm run dev          # http://localhost:5173
npm run build && PORT=3000 ORIGIN=http://localhost:3000 node build
```

Most of the tests in `tests/personas.test.js` talk to the built server over HTTP on a throwaway database, so run `npm run build` first; without a build they are skipped.

## Where things are

- `src/lib/ticket.js`: runs in the browser. Six words and an action become a ticket. Only the ticket is sent.
- `src/lib/server/counter.js`: everything the server keeps, and the rules: count once, in and did it, batches, the ten-or-more rule.
- `src/lib/server/db.js`: one SQLite file.
- `src/lib/server/guard.js` and `pause.js`: the puzzle, the rate limit and the pause.
- `src/lib/server/stage.js`: staging or live. The stage is stamped inside the database file, so a test file can never be opened as the live one.
- `scripts/server/`: the nightly backup, the pause switch and a daily note of the counts to the organiser.

## Settings

| Variable | What it does | Default |
| --- | --- | --- |
| `COUNTER_STAGE` | `staging` or `live`. Live has to be said on purpose. | `staging` |
| `COUNTER_DB` | Path of the SQLite file. | `./data/staging.db` or `./data/counter.db` |
| `COUNTER_BATCH_SECONDS` | How often the public numbers move. Use 0 while developing. | 300 |
| `COUNTER_PUZZLE_BITS` | How hard the puzzle is. | 16 |
| `COUNTER_RATE_LIMIT` | Requests per ten minutes from one address. The address is scrambled in memory with a key that changes every ten minutes, and never written down. | 20 |
| `COUNTER_PAUSE_PER_HOUR` | New tickets in an hour before the counter pauses itself. | 3000 |
| `COUNTER_TODAY` | Staging only: pretend it is this day. | |
| `PORT`, `HOST`, `ORIGIN` | As in any SvelteKit node app. | |

`scripts/deploy.sh` copies a build to a server over SSH and restarts a systemd user service. Set `COUNTER_SSH=user@host` to use it.

## Run your own, or tell me what is wrong

You are welcome to run a counter for your own actions. If you find a way to learn who counted, or to make the number lie, please write to contact@nolistofwho.org or open an issue.

I depend on Claude (Anthropic) for writing, organising and coding, and I say so in public. The aim is tools that run on your own computer first.

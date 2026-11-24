# The counter: product spec

Written Mon Nov 16, 2026, at Youssef's request, from what is already decided in `HANDOVER.md` (section 2), `docs/ARCHITECTURE.md` (section 9), `docs/HOSTING.md` and `research/counter/precedents.md`. Where this file and those disagree, this file says so and marks it **[proposal]**: it needs his yes. Design: the "The Counter" canvas (Claude Design), https://claude.ai/artifact/V8Hc5rrkwDWoPVJ49qVQ17 (private; source files in `apps/counter/design/`).

## 0. Where it stands, Tue Nov 17 (read this first)

Sections 3 and 4 below are the plan of Nov 16; this is what is built, and the milestones as they stand now. Test cases: `TESTING.md`.

**Built, tested, running on staging (the MVP):**

1. **Actions, grouped by company.** Once (the strike, Nov 27), weekly (Sundays off X, Instagram-free Tuesdays), several days (a month off, ready, none yet), and steps (any day).
2. **Six words instead of an account.** Made on the device; a ticket per action and per round (Argon2id, on the device); only the ticket is sent. The ticket ends with its round.
3. **Count once; "I'm in", then "I did it".** Counting ahead for every dated action and every weekly round.
4. **Anywhere on Earth.** Your own day, wherever you live, with "I did it yesterday".
5. **Weekly rounds and their history.** One round open at a time; the past rounds with in and did it.
6. **Your words and your record on your device only.** One button on return; "Show my words"; "Forget me on this device". The server keeps no history of anyone.
7. **Where, if you want:** country, city, postal code; nothing shown under 10; the remainder rule.
8. **What Amazon lost:** addresses and payment methods, added to totals, capped, never next to a ticket.
9. **Against fakes:** the puzzle (proof of work), the rate limit (IP scrambled, in memory, ten minutes), removals counted in public.
10. **Batches:** numbers every five minutes, areas once a day.
11. **Calendar feed:** every dated and weekly action, reminder the day before, no email.
12. **Two looks:** dark, and the bright 90s one; follows the device.
13. **Privacy page in his voice; feedback line; Claude disclosure.**
14. **Staging until launch:** stamped database, yellow stripe, pretend dates; three test servers on the Mac.

**Still to do for the MVP (by Wed Nov 25):** deploy to Uberspace and nolistofwho.org (Thu Nov 19, waits on his account and domain); the registrar in the privacy page; nightly backups; tune the ticket cost on his Android phone; short guides on the Amazon and Facebook pages; the share image; the source public (Codeberg or GitHub); one person reviews the privacy design; fixes from the test week.

**Milestones after the MVP (proposal, Nov 17):**

| | Name | By | What it adds |
| --- | --- | --- | --- |
| M1 | **German, more steps, check on any device** | Sun Dec 13 (first Sunday off X) | German. Steps for X and Google. Each round publishes its list of tickets, so a device can check "was I counted?" without asking the server about one ticket. Fixes from the privacy review. |
| M2 | **The map and the neighbourhood** | Sun Jan 3 | The map, tiles served by us; goals per area ("Kreuzberg 36: 500 people"). |
| M3 | **Shops by name, and paper codes** | Wed Jan 20 (leave X together) | Shops and groups join by name: a second, checkable number. Paper one-time codes handed out in bookshops and stalls. |
| M4 | **Anyone can call an action** | February 2027 | Groups propose actions, once or weekly; he approves on a small admin page, no code. RSS feed or his own website for news. Installable page. No email, decided Nov 17. |
| M5 | **Many counters, one number** | Q2 2027 | Run your own counter; counters publish totals; a page adds them up. Arabic. |

## 1. What it is, in three sentences

A public number: how many people did a thing against big tech, together, on a date. One ticket per person per action, and **no list of who**: the site cannot hand over names because it never has them. It counts things people did, which is stronger than a signature.

**It is for every direct action, not for Amazon only (Youssef, Nov 16).** The Amazon deletion, the X shutdowns, the Attention Strike, Meta, and whatever comes next are all rows in the same list. The home screen shows every action, grouped by company: all of big tech, Amazon, X, Meta, Google. Each action has a **company** (or "all of big tech"), a **kind** (a day with a date, or a step for any day) and **who called it** (us, or another group such as Take Back Big Tech).

## 2. Who uses it, and for what (use cases)

**The person who joins**

| # | Use case | What happens |
| --- | --- | --- |
| 1 | I see the action and the number | Action page: date, the ask in one paragraph, the count as the hero, who called it (Take Back Big Tech, linked). Reads without JavaScript. |
| 2 | I join before the day: "I'm in" | Email + a secret word, hashed on my device into a ticket (about 1 to 2 seconds). Only the ticket is sent. |
| 3 | On the day I press "I did it" | Same email and word give the same ticket; the second press marks "did it". Two public numbers: in, and did it. |
| 4 | I did it yesterday | The strike stays joinable on Nov 27 and Nov 28. |
| 4b | Anywhere on Earth (Youssef, Nov 17: "it makes sense to anyone on earth") | A dated action means your own day, in your own time zone, as strikes do in practice (Take Back Big Tech's page gives only the date; Earth Hour is 8:30 pm local time). The count opens when the date begins in the first place on Earth (UTC+14) and closes when the day after has ended in the last (UTC-12): for Nov 27, Thu Nov 26 10:00 UTC to Sun Nov 29 12:00 UTC. Only the day is stored, as before. |
| 5 | I press twice, or come back on another device | "You're already counted." No error, no detail. |
| 6 | I forgot my word | I count as a new person. The page says this before I choose the word. |
| 7 | I say where I am (optional) | Country from a short list, and a postal code. An area is shown only at 10 or more people; below that it rolls up (first 3 digits, city, country, "elsewhere in the world") with the remainder rule, so nothing can be worked out by subtraction. |
| 8 | I add my numbers (Amazon action, optional) | Addresses deleted, payment methods deleted (1, 2, 3, 4+). Added to a running total, never stored with the ticket, first join only, capped. |
| 9 | I want to know what you kept | The receipt, after joining, in plain words: what stayed on my device, what was sent, what was kept, what was added to a total and forgotten, what was held for minutes, what the host's network saw. |
| 10 | I want to tell people | A share image made in my browser (story 1080×1920, square 1080×1080): "One of 4,312". No personal number. Nothing uploaded. |
| 11 | I want to know what's next | Every action ends in the next action: its date, "I'm in", and "add to my calendar". One calendar feed carries all future dates. No emails. |
| 12 | I want this device to remember | A tick box, off by default. Stores action names only, never the ticket. |
| 13 | I use Tor Browser, or a screen reader | No captcha puzzles, no scripts from other sites. The hashing shows progress. The page says "Works in Tor Browser". |

**People around it**

| # | Use case | What happens |
| --- | --- | --- |
| 14 | An organiser (Take Back Big Tech) wants a public count of their strike | Their sign-up form keeps names and emails; ours keeps none. They link the action page and quote the number. |
| 15 | A sceptic or a journalist checks the claim | The footer says what is stored and what is not, where it runs, and links the source (AGPL). "Fake entries removed: n" is public. |
| 16 | Someone floods it with fake entries | ALTCHA (self-hosted proof of work), the cost of the ticket hash, a rate limit held in memory. Youssef removes clear abuse; the removed number goes up. |
| 17 | Someone with power demands the list | There is none: tickets, areas, days. An email cannot be recovered from a ticket without guessing both the email and the word. |
| 18 | Youssef is offline on Nov 27 | The counter runs alone. States change by date (upcoming, today, past). Backups run nightly to a second provider. |
| 19 | Sat Nov 28: the count is the story | Past actions freeze and show as a result: in, did it, areas, the sums. |

## 3. The MVP: live Wed Nov 25

**In**

- Two actions on one page: `attention-strike-2026` (the main one) and `amazon-delete-2026` ("I deleted my Amazon account", with the sums).
- The home page: every action, grouped by company, with a filter (all of big tech, Amazon, X, Meta, Google), dates and counts. The X dates are listed as upcoming.
- **Steps in the MVP [proposal, moved up from M1]:** "I cancelled Prime", "I requested my data from Amazon", "I deleted Facebook", "I switched to less personalised ads". A step is one more row with no date and one number, so it costs little, and steps are what people already send screenshots of.
- The ticket: Argon2id in the browser (hash-wasm), email and word never sent.
- Two numbers: in, did it. States: upcoming, today, past.
- Place: country + postal code, optional, 10-or-more and remainder rules, shown as a list of areas.
- The sums for the Amazon action.
- The receipt. The share image (both sizes). The next action and the calendar feed.
- "Remember on this device" tick box.
- Bots: ALTCHA, rate limit (hashed IP in memory, key replaced every 10 minutes), fake entries removed: n, and a small admin command to remove entries.
- Batching: the total every five minutes, areas once a day.
- The footer: what is kept, what is not, the IP sentence, the host and where it runs, the source, the three rules, the Claude disclosure, "Works in Tor Browser".
- English. Mobile first. Text readable without JavaScript.

**Out of the MVP**

- **The map [proposal, changes the Nov 11 evening decision "a map is part of the MVP"].** Nine days, one builder, and the map needs its own tiles served by us. The MVP shows areas as a list with bars; the map is milestone 2. If he wants the map on Nov 25, something else has to leave.
- German and Arabic. Email reminders. Goals. Shops by name. Accounts, comments, leaderboards of people, payments: never.

**Stack (decided Nov 11):** Node, SvelteKit server-rendered with the Node adapter, SQLite, hash-wasm, ALTCHA. One process, one database file, portable in an afternoon. No third-party scripts, fonts or tiles.

**Data kept:** `actions(slug, title, ask, company, kind, called_by, date, state, next)`, `entries(action_slug, ticket, area, day, did_it)`, `totals(action_slug, name, sum)`, `removals(action_slug, count)`. Nothing else. No access logs with IP addresses.

**Dates to Nov 25**

| Date | What |
| --- | --- |
| Mon Nov 16 | Host chosen (Hetzner if a server was granted, else Uberspace). Spec and design agreed. Build starts. |
| Wed Nov 18 | Skeleton on the host: one action, the ticket works in Chrome, Firefox, Safari and Tor. |
| Fri Nov 20 | Join, already counted, did it, the receipt, the areas. |
| Sun Nov 22 | Public test link and public source. ALTCHA, rate limit, removals, footer, share image. Five people test on their phones; one person reviews the privacy design. |
| Tue Nov 24 | Fixes from the test. Backups. Load test for 1,000 people. |
| Wed Nov 25 | Live. |
| Thu Nov 26 | Published: article, carousel, X thread. |
| Fri Nov 27 | The strike. Youssef offline. |
| Sat Nov 28 | The count. |

## 4. After the MVP: five milestones [proposal, dates to agree]

| | Name | By | What it adds | Why then |
| --- | --- | --- | --- | --- |
| M1 | **More steps, and German** | Sun Dec 13 (first Sunday off X) | More steps, for X and Google. German. The repeating calendar reminder (an .ics file built in the browser: "remind me every week"). Fixes from the privacy review. | Steps are what people already send screenshots of. The X actions start Dec 13. |
| M2 | **The map and the neighbourhood** | Sun Jan 3 | The map of action: your area close up, the world far away, tiles served by us. Collective goals per area ("Kreuzberg 36: 500 people"). This is board tool 8, the scoreboard. | Needs enough entries to draw. The Nov 27 numbers give it its first data. |
| M3 | **Shops and organisations by name** | Wed Jan 20 (leave X together) | A second, checkable number: "4,312 people, 12 shops". Shops and groups join in public, with a name and a link. A count badge they can put on their own page, served without tracking. | The anonymous number can't be checked by an outsider; names of shops can. The first step toward the local-shop matcher. |
| M4 | **Anyone can call an action** | February 2027 | A group proposes an action (title, date, ask, link); Youssef approves; it gets its page, count and calendar entry. Installable page (PWA), no app store. Email reminders, with the word-for-word warning and a separate store, if he still wants them. | Take Back Big Tech and others get a counter without keeping a list. Feeds the directory of global actions (board 11). |
| M5 | **Many counters, one number** | Q2 2027 | The recipe: run your own counter on your own machine. Counters publish their totals in a small open file; a page adds them up. Arabic, right to left. | "Recipes, not platforms." No single server to pressure or to trust. |

## 5. Decided Nov 16 (Youssef)

- **The map waits:** areas as a list on Nov 25, the map in M2. ("We can postpone the map for sure.")
- **Host: Uberspace, for now.** Never Render. He creates the account and sets the password.
- **Address, for now:** his existing domain facesofhumanity.world. [proposal] Use `counter.facesofhumanity.world`, so the Faces of Humanity site keeps the main address and the counter can move to its own name later. To check: where the domain's DNS sits (a DNS provider on AWS or Cloudflare would undo the point).
- **Font: Barlow Condensed and Barlow** ("I think I like the fonts"), served by us, never from Google. Both are under the SIL Open Font License (check the licence file when the fonts are added).
- **Take Back Big Tech: ask first.** He sends them a message before their name goes on the page: are they happy with the counter, may we show their name and link, and how private it is. Draft: `content/queue/2026-11-16-take-back-big-tech-message.md`. If no answer by Nov 22, the page names the strike and links it, with no claim that they work with us.
- **Steps in the MVP, and every direct action in one list by company:** see section 3.

- **A second look to try: "before big tech" (Youssef, Nov 16).** "I wanted to have a 90s feel, hobbyist design… clean, but it gives pre-big tech." On the canvas as Direction B (three screens): system fonts only (Times, Courier, Verdana), so no font file at all; blue links, tables, grey buttons; the number as a hit counter. He picks A, B or a mix before the build reaches the pages.

- **Both looks, as a theme switch (Youssef, Nov 16):** "we can have it as a theme… the dark mode and the bright mode… we will have it as a selection anyway." Dark = direction A (black and green), bright = direction B (the 90s look). One set of pages, two style sheets, a switch on every page. The choice is kept on the person's device only. The share image stays A in both.
  - **Default (decided Nov 16):** it follows the phone's own dark or light setting. No random ("random is not very important, but to have the dark and the other theme").
  - **Which theme gets more people to press "I'm in" (his yes, Nov 16: "just the clicks, anonymously, very anonymously"):** two totals per theme, pages shown and joins. Plain totals, never kept with a ticket, never per person. The footer says so.

- **The privacy note, in his voice (Youssef, Nov 16):** a page, `/privacy`, linked from every footer. It says he used Render for all his deployments, found out it runs on Amazon's and Google's clouds, and moved to Uberspace for the privacy, with no logging; that nothing saying who you are is taken; and "for more privacy, use Tor Browser". "This has to be very clear." Kept exact: the ticket, the area and the day are kept, and the page says so.
- **Test week (Youssef, Nov 16):** he tests it properly and sends it to some close friends. First test actions: the Amazon steps and "I deleted Facebook", because the guides for both exist already (the Amazon five-step carousel of Nov 9, "How to leave Facebook" of Nov 15). To do: each action page links to its guide.
- **Take Back Big Tech is the big one (Youssef, Nov 16):** "if we can get them to use it and share it, this would be a huge effect."

- **The address: nolistofwho.org (Youssef, Nov 16: "I love no list of who. Let's do it.").** This replaces `counter.facesofhumanity.world`. Looked free on Nov 16 (DNS lookup; the registrar's search confirms). He buys it himself, at a registrar that passes his own test (to check: INWX in Berlin, or Njalla), not at GoDaddy. The new domain points straight to Uberspace. The site's title stays "The Counter"; the share image carries the address.

- **Confirmed: nolistofwho.org and Uberspace (Youssef, Nov 16).** "Already a good story to be after GoDaddy and Render." To do when the domain is bought: one more paragraph on `/privacy` ("My old domain was at GoDaddy; this one is at [registrar]"), and the story as a post: leaving Render and GoDaddy, with a "What you lose" part.

- **One person, one ticket: open again (Youssef, Nov 16).** His point: any email works, so it is not unique, and the same email with a new word is a second ticket. "We need to find something… how to get a voting ticket irreversible." What others do (checked Nov 16): every system that stops one person from counting twice checks who they are once, somewhere: a register at an election, a blind-signed credential after an ID check (NDSS 2019, e-petitions), Privacy Pass where an "attester" (in practice Apple, Google or Cloudflare) vouches for the device (RFC 9576, 2024), in-person "pseudonym parties". Whoever checks must remember who already got a ticket, which is a list of who. Options for his pick: (A) keep email + word, say plainly that the number counts tickets, not checked people; (B) a cloakroom ticket: a random code made on the device, no email, no word; (C) a check once at a stall or event, then an anonymous ticket (later milestone). Recommendation: A now, with honest wording; C as a milestone for actions that need it.
- **The 10-or-more rule stays and is said next to the "Where" field** (Youssef, Nov 16: "so people don't get scared to put it").

- **Decided Nov 17 (Youssef): six words, not email.** The device makes six random words (EFF list); the person keeps them on paper or in a photo; losing them is fine ("lose to be the same person"). Plus the anti-bot puzzle, the in-memory rate limit, removals and honest wording ("it counts tickets, not checked people"), and a feedback line on every page. Research: `research/counter/tickets.md`. Built and tested Nov 17.
- **Paper one-time codes, a milestone (Youssef, Nov 17: "I love the physical one-time code… it makes things local").** Bookshops and physical stalls hand out printed cards, each code usable once; nobody writes down who got one. A second number: "N people, M of them counted in person". Fits M3 (shops by name).
- **Staging until launch (Youssef, Nov 17).** Everything counted before the real launch is test data, wiped at launch. Built: `src/lib/server/stage.js`, see the README.
- **Weekly actions, to build after Thu Nov 19 (Youssef, Nov 17).** One action that repeats (for example Instagram-free Tuesdays, Sundays off X), made by the counter itself every week, with the history of past weeks on the page. Each week runs Anywhere on Earth (4b). **Counting ahead: yes** (Youssef: "very cool idea also to motivate each other to do it"): "I'm in for next Tuesday" during the week, "I did it" on the day, so each week shows two numbers, in and did it. Pledging is open for the next week only.
- **A ticket lives as long as one round of an action (Youssef, Nov 17).** Not a week by rule: one round of the action, from the moment you can say "I'm in" until the grace for "I did it" ends. The strike: one day. A weekly Tuesday: that Tuesday. "A month off Amazon": the whole month. Ticket = the six words + the action + the round's start date. The same six words serve every action and every round; only the ticket changes, so the server can't link rounds. A round has a start date, an end date (one day for most), and the Anywhere-on-Earth grace: "I'm in" before and during, "I did it" from the last day until the day after has ended everywhere.
- **Updates without a list (Youssef, Nov 17: "calendar to begin with is amazing").** No email box on the counter, and no Substack link. A calendar feed (`/calendar.ics`, page `/calendar`), built Nov 17: every dated action, all-day, with a reminder at 9:00 the day before; weekly actions join it when they exist. Later: his own website or an RSS feed.

## 6. Still open

1. **Where the source lives** by Nov 22: Codeberg, or GitHub.
2. **Who reviews the privacy design** before Nov 22. Nobody is named yet.
3. **The footer sentence on IP addresses:** confirm the wording.
4. **Node on his Mac:** his yes to install it.
5. **Weekly tickets:** one ticket per week (proposed: a leak shows one week, history kept on the device) or one ticket for all weeks (history on the server, but the record links a person's weeks). His call.
6. **Which weekly actions:** does "Sundays off X" replace the separate Dec 13 and Jan 3 actions? Instagram-free Tuesdays: from which Tuesday, and until when?

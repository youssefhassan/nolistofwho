# Three personas, tested (Nov 18, 2026)

**Nov 24: the personas run as tests every time**, in `tests/personas.test.js` (21 tests; 60 in all with `tests/counter.test.js`). Most talk to the real built server over HTTP on a throwaway database, so run `npm run build` first; without a build those are skipped. They cover:
- **Not tech savvy:** messy typed words; typos caught; the strike from Sydney to Honolulu; Tuesdays as separate rounds; "Forget me", private windows.
- **Privacy nerd:** CSP and the other headers on every page; no cookie; nothing loaded from another host; no IP in any data file; the server logs nothing but its start; no city next to a ticket; rows in ticket order; tickets across actions share nothing.
- **Hater:** junk tickets, unknown actions, path tricks; a forged, stretched, reused or skipped puzzle; inflated sums; attacker city text; rate limit and automatic pause; the PAUSE file; a staging server refusing the live database.

Before sharing nolistofwho.org on Instagram (Youssef, Nov 18). Live site for reading and the normal flow; local copies for the strike day (pretend Nov 27, port 4321), December (pretend Dec 15, port 4322) and every attack (throwaway databases). No attack ever touched the live database.

## 1. Not tech savvy: "I want to delete my Amazon and say I'm in"

| # | Test | Result |
|---|---|---|
| 1.1 | Home → Amazon chip → "I deleted my Amazon account" | Works. The chips jump down the page; they don't filter. |
| 1.2 | "I'm new: make my words", tick "I wrote them down", Germany / "berlin " / 10437, 2 addresses, "I'm in" | Counted in 0.5 s. "2 people are in, you included" at once. |
| 1.3 | Bright theme, "I cancelled Prime" (a step): one button, words remembered | "I did it" counted in 0.25 s, 000001. |
| 1.4 | "Forget me", then "I have my words", typed as `Paralegal  afterlife, obsession⏎could bootlace Goofy ` | Same ticket: "You're already counted." Capitals, commas, extra spaces and line breaks are fine. |
| 1.5 | Strike day (pretend Nov 27): the button says "I did it" | "You did it", 1 did it so far. |
| 1.6 | December: Instagram-free Tuesday on the Tuesday; Sundays off X ahead | "You did 1 Tuesday"; "in for Sun, 20 Dec 2026". |
| 1.7 | Phones: iPhone SE 375@2x, iPhone 15 393@3x, Pro Max 430@3x, Pixel 7 412@2.625x, budget Android 360@2x, tiny 320@2x; dark and bright; home, Amazon, privacy, strike "did it" | 48 renders: no sideways scroll on any. No text under 13 px. |

**What confused her:**
- **There is no "how do I delete Amazon?" link.** She came to delete Amazon, and the page only counts it. The guides are still to build.
- **"I deleted my Amazon account" is dated Fri 27 Nov.** If she deletes today, she can't say "I did it" until the 27th.
- **"1 people are in"** when the number is 1.
- **Jargon:** "ticket", "each round of a weekly one", "the count opens when the day begins anywhere on Earth", "Postal code, if yours works".
- **"Forget me on this device" wipes the words in one tap,** with no "are you sure?". If she never wrote them down, she can't press "I did it" on the 27th.
- **The area isn't remembered** between actions, so she has to pick Germany again on every action.
- **The "Where" list says 1 while the number says 2.** Areas update once a day, the number every 5 minutes.
- **The words can be odd to write on paper:** "cannabis", "zit".
- **Small:**
  - In the bright theme the "X" chip is 10 px wide to tap.
  - The checkboxes are 24 px.
  - "Your area: berlin" echoes the lowercase she typed; the server stores "Berlin".

**Test-setup note:** over plain http on the home network address (192.168.0.2:4321), the button fails with "That did not go through", because browsers turn off the crypto the ticket needs. localhost and the https site are fine. Friends testing the local copies on their phones must use a tunnel or https.

## 2. Privacy nerd: reads everything

**Impression:** "Better than most privacy-first projects. No third-party requests, no cookies, Argon2id per action on the device. But three things on the page don't match the code: the words are remembered by default, the source isn't published, and the area and postal code sit next to each ticket."

**Holds:**
- Only the ticket leaves the device.
- About 77 bits in six words.
- Every file is self-hosted.
- The day is stored, not the hour.
- No IP is stored.
- The puzzle carries nothing identifying.
- The 10+ rule and the remainder rule work.
- Sums are kept apart from tickets.
- The calendar feed keeps nothing.
- Outside links are noreferrer.
- http redirects to https.

| # | Finding | When |
|---|---|---|
| 2.1 | **"Remember my words" is ticked by default.** `remember = $state(true)`. The privacy page says "If you tick", and the SPEC says off by default. Opened from Instagram, the words sit in Meta's in-app browser. | Today: decide |
| 2.2 | **"The source code is open (AGPL-3.0)" is not true yet.** | Today: reword |
| 2.3 | **City and postal code are stored on the ticket row.** The postal code is never shown, and city isn't mentioned on the privacy page. A rare postal code + day could link one person across actions if the database were seized. | Text today; keep areas as counts by Nov 25 |
| 2.4 | **Join order can be read from the SQLite WAL file and page layout.** | By Nov 25: write once per batch, sorted; secure_delete; checkpoint |
| 2.5 | **The batch gives no cover when traffic is low:** one join moves the number by exactly 1. | By Nov 25: publish a batch only at k ≥ 5 new |
| 2.6 | **No security headers:** no CSP, HSTS, Referrer-Policy or nosniff. | By Nov 25 (small) |
| 2.7 | **"Works in Tor Browser" is only true at the Standard level.** Safer and Safest turn WebAssembly off. | Today: reword |
| 2.8 | **www.nolistofwho.org and youssefh.uber.space serve the app without redirecting.** | By Nov 25 |
| 2.9 | **Wording:** "keeps no logs of who visits" → "access logs are off"; check where ns3.inwx.eu runs; "a country and a postal code… shows" → a city is what shows. | Today |

## 3. The hater: wants to mess it up

**Plan:** "Ten requests, and the strike page says 'Youssef Is A Fraud, Germany: 10' on his own domain. Then a €4 server with IPv6 and a million fake tickets, mixed in with the real ones."

| # | Finding | Severity | When |
|---|---|---|---|
| 3.1 | **Attacker text on the page.** 10 tickets with the same city puts any words on the page ("Youssef Is A Fraud, Germany 10"). Country takes any two capitals ("FU"). City lets through null bytes, right-to-left override and zero-width characters. | High | **Before sharing** |
| 3.2 | **Removing entries doesn't clear that text until the next day,** because the area snapshot is cached in memory. | Medium | Before sharing |
| 3.3 | **The rate limit counts each IPv6 address on its own.** The site has an AAAA record, and one /64 is effectively unlimited: about 36 tickets a second per core. | High | Before launch (3 lines) |
| 3.4 | **No way to see or survive a flood.** No counts per batch, no pause switch. Removal is by day only, so it would delete real people too. | Medium | Before launch |
| 3.5 | **Signature check accepts uppercase and trailing junk.** Harmless; replay still fails. | Low | Later |
| 3.6 | **A request without X-Forwarded-For gives a 500.** Caddy always sets it, so production is fine. | Info | — |

**Held up:**
- Puzzle reuse, forgery and odd answers were all refused.
- Only lowercase 64-hex tickets are accepted.
- Past and future rounds came back closed.
- Sums are capped, with no `__proto__` pollution.
- A 10 MB body was rejected in 3 ms.
- SQL injection did nothing (prepared statements).
- Svelte escapes everything, so no XSS.
- Cross-site posts are blocked: 403, and JSON needs a preflight.
- The calendar can't be injected.
- No open redirect; unknown slugs get a plain 404.

**Live check, done:** 22 posts with a fake `X-Forwarded-For` → 17 × 400, then 429 (with 3 real counts earlier in the window, that's 20). So Caddy's real address is used, and the header can't be spoofed.

## Fixed the same day (Nov 18, deployed)
- **1:** "1 person is in"; plainer words for the ticket and the day; "Already deleted it?" note on the Amazon page; "Forget me" asks first; "(optional)" on city and postal code.
- **2.1:** "Remember my words" is off unless ticked; a note for people inside Instagram's or Facebook's browser.
- **2.2, 2.3, 2.7, 2.9:** privacy page corrected (source "will be open", city and postal code named, Tor at Standard level, logs and INWX wording).
- **2.6:** CSP, HSTS, Referrer-Policy, nosniff, no framing.
- **3.1:** countries only from our list; city and postal code strictly checked (form and server); only countries are shown, cities are stored and not shown.
- **3.2:** a removal clears the shown areas at once.
- **3.3:** IPv6 counted per /64; the table of networks is capped.
- **3.5:** signature format checked.

**Still open:** guides for each action (1); areas as counts, not on the ticket row (2.3); join order in the WAL (2.4); batch at low traffic (2.5); www and uber.space redirects (2.8); flood tools and a pause switch (3.4); Tor Browser test by Youssef; publish the source.

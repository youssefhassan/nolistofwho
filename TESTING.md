# Testing the counter (staging)

Everything here is staging: test data, wiped before the real launch. Press every button you like.

## Where

| Server | Pretends today is | On this Mac | From a phone on the same wifi |
| --- | --- | --- | --- |
| Staging | the real day | http://localhost:4320 | http://192.168.0.2:4320 |
| Strike day | Fri Nov 27 | http://localhost:4321 | http://192.168.0.2:4321 |
| December | Tue Dec 15 (a Tuesday; Sun Dec 13 is past) | http://localhost:4322 | http://192.168.0.2:4322 |
| **Online** | the real day | https://nolistofwho.org | the same, from anywhere |

Start them again after a restart: `npm run staging`, `npm run staging:strike-day`, `npm run staging:december` (in `apps/counter`).
On 4320 the numbers move every 5 minutes, as they will live. On 4321 and 4322, every 30 seconds, to test faster.
To start as a stranger again: press "Forget me on this device", or use a private window.

## Test cases

Write down what you expected and what happened. Anything that confuses you is a finding.

### A. Counting in, and counting once

| # | Where | Do | Expect |
| --- | --- | --- | --- |
| A1 | 4320, The Attention Strike | "I'm new: make my words", keep "Remember" ticked, press "I'm in" | A few seconds of work, then "You're counted." The receipt lists what stayed, what was sent, what was kept. |
| A2 | same | Reload the page | "Your words are on this device." One button. |
| A3 | same | Press "I'm in" again | "You're already counted." The number does not grow. |
| A4 | same, after 5 minutes | Reload | The big number has gone up by one. |
| A5 | 4320, any action | "I'm new", untick "Remember", don't tick "I wrote them down" | The button stays grey until you tick one of the two. |
| A6 | 4320 | "I have my words", type your six words messily: capitals, commas, two spaces | Accepted, "already counted". |
| A7 | 4320 | Type five words, or one wrong word | A clear message; nothing is sent. |

### B. The strike day, and "I'm in" turning into "I did it"

| # | Where | Do | Expect |
| --- | --- | --- | --- |
| B1 | 4321, The Attention Strike | Make words and look at the button, then press it | It says "I did it", because it is Nov 27 there. Both numbers go up after 30 seconds. |
| B2 | 4320 then 4321 | Count in on 4320 with words, then type the same words on 4321 | Different servers, different test files: it counts as new there. (Live there is one server.) |
| B3 | 4321 | Read the line under the title | "Your own Friday, wherever you live…" |
| B4 | 4321, I deleted my Amazon account | Give 2 addresses and 1 payment method | After 30 seconds: "addresses Amazon lost" and "payment methods Amazon lost" go up. Press again: the totals don't grow. |

### C. Weekly actions, counting ahead, history

| # | Where | Do | Expect |
| --- | --- | --- | --- |
| C1 | 4320, home | Look at X and Meta | "Sundays off X: Every Sunday · next: Sun, 13 Dec". "Instagram-free Tuesdays: Every Tuesday · next: Tue, 1 Dec". |
| C2 | 4320, Instagram-free Tuesdays | Press "I'm in" | "N people are in for Tue, 1 Dec". The receipt says: on Tue, 1 Dec, do it, then come back. |
| C3 | 4322, Instagram-free Tuesdays | Look | It is Tuesday there: the button says "I did it". Below: "Every Tuesday so far": Dec 8 and Dec 1, with in and did it. |
| C4 | 4322, Sundays off X | Press "I'm in" | For Sun, 20 Dec (Dec 13 is history). "Your record": "You're in for Sun, 20 Dec." |
| C5 | 4322 | Do C3 and C4, then reload both | Your record shows on each page; nothing about it was sent. |
| C6 | 4322, Sundays off X | Compare the "Next action" line | A weekday off X, Wed 13 Jan. |

### D. Your words and your record, on your device only

| # | Where | Do | Expect |
| --- | --- | --- | --- |
| D1 | any | "Show my words" | Your six words. "Hide my words" hides them. |
| D2 | any | "Forget me on this device", reload | Back to "I'm new / I have my words". Your record is gone. |
| D3 | private window | Count in | Works; nothing is remembered after you close the window. |
| D4 | phone | Count in on the Mac with words, then type them on the phone (same server) | "Already counted" on the phone. |

### E. Calendar

| # | Where | Do | Expect |
| --- | --- | --- | --- |
| E1 | phone, https://nolistofwho.org/calendar | "Add to my calendar" | The calendar app asks to subscribe to "No list of who (staging: test build)". |
| E2 | the calendar | Look at Nov 27, Dec 13, Dec 1 | The strike; Sundays off X every Sunday until Jan 17; Instagram-free Tuesdays every Tuesday. A reminder at 9:00 the day before. |
| E3 | an event | Tap its link | Opens that action's page. |

### F. Looks, and the honest parts

| # | Where | Do | Expect |
| --- | --- | --- | --- |
| F1 | any | "Bright" at the top | The 90s look, with the 000123 counter. Reload: it stays. |
| F2 | phone in dark mode, first visit | Open | Dark look. Light mode phone: bright look. |
| F3 | every page | Look at the top | The yellow staging stripe. |
| F4 | /privacy | Read it all | Does it say what you mean? Is anything untrue or unclear? |
| F5 | any | Tor Browser, if you have it | Counting works (it takes longer). |
| F6 | any | Press a button 25 times fast with new words | After 20 in ten minutes: "Too many tickets from your connection". |

## For friends

Send them https://nolistofwho.org, with:

> This is a test of a counter for actions against big tech. It keeps no list of who. Please try to count yourself in, come back, and tell me what confused you. Everything is test data and will be wiped. Feedback: contact@nolistofwho.org

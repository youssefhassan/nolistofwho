<svelte:head><title>What this page keeps · The Counter</title></svelte:head>

<section class="head">
	<div class="label">Privacy, in plain words</div>
	<h1>I take nothing that says who you are.</h1>
	<p class="ask">No name. No email. No account. No IP address saved. No list of who.</p>
</section>

<section class="prose">
	<h2>What I never get</h2>
	<ul>
		<li><b>Your six words.</b> Your device makes them and you keep them, on paper or in a photo. For each action, your device turns them into a ticket, and only the ticket is sent. Nobody can turn a ticket back into your words, and nobody without your words can link the tickets for two actions.</li>
		<li><b>Your email.</b> The page never asks for it. There is nothing to log in to.</li>
		<li><b>Your name.</b> The page never asks.</li>
		<li><b>Cookies that follow you, ads, analytics, anything from Google or Meta.</b> There are none. Every file on this page comes from this page.</li>
	</ul>

	<h2>What I keep</h2>
	<ul>
		<li><b>The ticket.</b> A long row of letters and numbers. It only proves that the same person is not counted twice.</li>
		<li><b>Your country, if you gave one.</b> It is kept next to the ticket. It is shown only when 10 or more people share it.</li>
		<li><b>Your city and postal code, if you typed them.</b> They are <b>not</b> kept next to your ticket, and not with the day: they only add one to a count, like "Berlin, 10437: 12 people". Nobody, me included, can tell which ticket gave which city. They are not shown on the page.</li>
		<li><b>The day.</b> Not the hour.</li>
		<li><b>Totals.</b> If you tell the page how many addresses you deleted, the number is added to a total and forgotten. It is never kept next to your ticket.</li>
	</ul>

	<h2>What your own device keeps</h2>
	<p>If you tick "Remember my words", your six words stay in this browser, on your device, and are never sent. So does your own record: which actions and which weeks you counted. I keep no history of anyone: every action, and every week of a weekly one, makes a new ticket from your words, and the tickets can't be linked. For a few minutes after you count in, it also keeps a note that adds your count to the number on your screen, until the public number includes it; then the note is dropped. Anyone who opens your browser can see your words and your record, and your words are proof that you took part: keep them like a key. "Forget me on this device" clears all of it.</p>

	<h2>The calendar</h2>
	<p>The calendar feed is the same list for everyone. Your calendar app fetches it now and then, and I keep no record of who fetches it. If you add it to Google Calendar, Google fetches it for you, so Google knows; a calendar app on your own device keeps that to you.</p>

	<h2>Your IP address</h2>
	<p>No IP address is ever saved. The code holds it in memory for a few minutes to slow down floods of fake entries, and never writes it down. The host's network sees it, as with any website. <b>For more privacy, use Tor Browser.</b> This page needs Tor's Standard security level, because making the ticket uses WebAssembly.</p>

	<h2>Why this page is not on Amazon's cloud</h2>
	<p>I used Render for all my deployments before. Then I found out that Render runs on Amazon's and Google's clouds. So I took the decision to move this page to Uberspace, a small host in Germany, for the privacy: visitor logs are turned off for this page. The name nolistofwho.org is registered at INWX in Berlin. Nothing here runs on Amazon or Google.</p>

	<h2>What the number is, honestly</h2>
	<p>It counts tickets, not checked people. Like a petition, one person could make more than one. Every ticket costs a few seconds of work on the device, the server slows down floods and pauses counting when far more arrive in a minute or an hour than a real crowd sends, and I remove clear abuse and show how many. Someone with many computers could still add fake tickets slowly; that is why I watch the numbers every day. To check who someone is, I would need a list of who. I won't keep one.</p>

	<h2>The words come from the EFF</h2>
	<p>The six words are picked from the <a href="https://www.eff.org/deeplinks/2016/07/new-wordlists-random-passphrases" rel="noreferrer">Electronic Frontier Foundation's word list</a> (CC BY): 7,776 words, so six random ones cannot be guessed.</p>

	<h2>If you write to me</h2>
	<p>Writing to contact@nolistofwho.org is up to you, and it is separate from counting. An email shows me your address, so it is not anonymous. The mail stays with Uberspace in Germany, and I never add anyone who writes to a list.</p>

	<h2>If someone asks me for the list</h2>
	<p>There is no list. I cannot hand over what I never had. If someone took over my server, they could start recording from that moment on; Tor Browser protects you even then.</p>

	<h2>Check it yourself</h2>
	<p>The source code is open (AGPL-3.0): <a href="https://github.com/youssefhassan/nolistofwho" rel="noreferrer">github.com/youssefhassan/nolistofwho</a>. Read it, run it, tell me what is wrong with it.</p>
	<p class="muted small">Youssef Hassan, Berlin.</p>
</section>

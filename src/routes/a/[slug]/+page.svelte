<script>
	import { onMount } from 'svelte';
	import { niceDate, n, weekday } from '#lib/format.js';
	import { COUNTRIES, COUNTRY_NAME } from '#lib/countries.js';
	import { cleanCity, cleanPostal } from '#lib/area.js';
	import { GUIDES } from '#lib/guides.js';
	import { loadWords, saveWords, forgetMe, loadMine, markMine, loadPending, addPending } from '#lib/device.js';
	let { data } = $props();

	const a = $derived(data.action);
	const howTo = $derived(GUIDES[a.slug]);
	const r = $derived(data.round);
	// One button (Youssef, Nov 21, 2026: two buttons confused people and the build). A dated action is "I'm in"; a step is a deed, "I did it".
	const isStep = $derived(a.kind === 'step');
	const verb = $derived(isStep ? 'I did it' : "I'm in");
	const isAmazonDelete = $derived(a.slug === 'amazon-delete-2026');

	// The flow: choose (new or returning) → words → where (optional) → send.
	let mode = $state(null); // 'new' | 'back'
	let words = $state([]); // the six words, kept only in this page's memory
	let wroteDown = $state(false);
	let typed = $state('');
	let typedError = $state('');
	let country = $state('');
	let city = $state('');
	let postalCode = $state('');
	let addresses = $state(0);
	let paymentMethods = $state(0);
	let busy = $state(false);
	let step = $state('');
	let result = $state(null);
	let sent = $state(null);
	let copied = $state(false);
	// Kept on this device only, never sent: the words (if the person wants) and their own record.
	let saved = $state(null); // the remembered words, or null
	// Off unless the person ticks it (SPEC): the words are the key, so keeping them is their choice.
	let remember = $state(false);
	let askForget = $state(false);
	let inApp = $state(false); // opened inside Instagram's or Facebook's own browser
	let areaError = $state('');
	let showSaved = $state(false);
	let mine = $state({});
	let pending = $state({});
	let mounted = $state(false);

	onMount(() => {
		saved = loadWords();
		mine = loadMine();
		pending = loadPending();
		mounted = true;
		if (saved) mode = 'saved';
		inApp = /Instagram|FBAN|FBAV|FB_IAB/.test(navigator.userAgent);
	});

	function forget() {
		forgetMe();
		saved = null;
		mine = {};
		pending = {};
		showSaved = false;
		askForget = false;
		mode = null;
	}

	const myKey = (round) => `${a.slug}|${round ?? ''}`;
	const myRounds = $derived(Object.entries(mine).filter(([k]) => k.startsWith(a.slug + '|')).map(([k, v]) => ({ round: k.slice(a.slug.length + 1), v })));
	// This device already did this action (this round): no button then, unless someone else wants to count here.
	const doneHere = $derived(!!mine[myKey(r?.key)]);
	let again = $state(false);
	const myCount = $derived(myRounds.length);
	// Your own count, added on your screen only, until the public number includes it at the next batch.
	const bump = $derived.by(() => {
		const p = pending[myKey(r?.key)];
		// Only while the public number does not hold it yet: it was sent after the numbers on show were read.
		return p && p.until > data.asOf && (p.at ?? 0) > data.takenAt ? p : { in: 0, did: 0 };
	});
	const shownIn = $derived(data.in + bump.in);
	const shownDid = $derived(data.did + bump.did);
	const youIncluded = $derived(bump.in > 0 || bump.did > 0);
	const clock = (ms) => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	const batchText = $derived(data.batchSeconds % 60 === 0 ? (data.batchSeconds === 300 ? 'five minutes' : `${data.batchSeconds / 60} minutes`) : `${data.batchSeconds} seconds`);

	async function newWords() {
		const [{ makeWords }, { WORDS }] = await Promise.all([import('#lib/ticket.js'), import('#lib/wordlist.js')]);
		words = makeWords(WORDS);
		wroteDown = false;
		copied = false;
		mode = 'new';
	}

	async function copyWords() {
		try {
			await navigator.clipboard.writeText(words.join(' '));
			copied = true;
		} catch {
			copied = false;
		}
	}

	async function useTyped() {
		const [{ readWords }, { WORDS }] = await Promise.all([import('#lib/ticket.js'), import('#lib/wordlist.js')]);
		const w = readWords(typed, new Set(WORDS));
		if (!w) {
			typedError = 'That is not six words from the list. Check each word, and the spaces between them.';
			return null;
		}
		typedError = '';
		return w;
	}

	async function send() {
		// Strict checks on the two free-text fields, before anything is made or sent.
		areaError = '';
		if (country && city.trim() && !cleanCity(city)) areaError = 'The city can only have letters, spaces and hyphens, 2 to 40 characters. Fix it, or leave it empty.';
		else if (country && postalCode.trim() && !cleanPostal(postalCode)) areaError = 'The postal code can only have letters and numbers, 2 to 10 characters. Fix it, or leave it empty.';
		if (areaError) return;
		const w = mode === 'new' ? words : mode === 'saved' ? saved : await useTyped();
		if (!w) return;
		busy = true;
		result = null;
		try {
			const { makeTicket, solvePuzzle } = await import('#lib/ticket.js');
			step = 'Making your ticket on your device…';
			const ticket = await makeTicket(w, a.slug, r?.key ?? '');
			step = 'Proving you are not a bot, with a little work on your device…';
			const puzzle = await (await fetch('/puzzle')).json();
			const answer = await solvePuzzle(puzzle);
			const body = { ticket, round: r?.key ?? '', puzzle: { ...puzzle, answer } };
			if (country) {
				body.country = country;
				if (city.trim()) body.city = cleanCity(city);
				if (postalCode.trim()) body.postalCode = cleanPostal(postalCode);
			}
			if (isAmazonDelete && (addresses || paymentMethods)) body.sums = { addresses, payment_methods: paymentMethods };
			step = 'Sending the ticket…';
			const res = await fetch(`/a/${a.slug}/join`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
			const out = await res.json();
			result = res.ok ? out.status : out.status === 'slow_down' ? 'slow_down' : out.status === 'paused' ? 'paused' : 'error';
			sent = { country: body.country, city: body.city, postalCode: body.postalCode, sums: body.sums };
			if (res.ok) {
				if (remember && mode !== 'saved') saved = saveWords(w) ? w : null;
				const did = data.state === 'today' || data.state === 'open';
				if (out.status !== 'closed') mine = markMine(myKey(r?.key), isStep ? 'did' : 'in');
				if ((out.status === 'counted' || out.status === 'did_it') && out.shownAt) {
					const b = out.status === 'did_it' ? { in: 0, did: 1 } : { in: 1, did: did ? 1 : 0 };
					pending = addPending(myKey(r?.key), { ...b, until: out.shownAt, at: out.at });
				}
				words = [];
				typed = '';
			}
		} catch {
			result = 'error';
		}
		step = '';
		busy = false;
	}

	const canSend = $derived(mode === 'saved' ? !!saved : mode === 'new' ? words.length === 6 && (wroteDown || remember) : mode === 'back' ? typed.trim().length > 0 : false);
	const lastDay = $derived(r?.end ?? a.date);
	const whenLabel = $derived(
		a.kind === 'step' ? 'A step · any day'
		: a.repeat === 'weekly' ? `Every ${weekday(a.date)}${r ? ' · this round: ' + niceDate(r.start) : ' · ended'}`
		: r && r.start !== r.end ? `${niceDate(r.start)} to ${niceDate(r.end)}`
		: niceDate(a.date)
	);
	const pad = (x) => String(x).padStart(6, '0');
	const people = (x, one, many) => (x === 1 ? one : many);
	const areaName = (r) => (r.country ? (r.city ? `${r.city}, ${COUNTRY_NAME[r.country] ?? r.country}` : `${COUNTRY_NAME[r.country] ?? r.country}, elsewhere`) : 'Elsewhere, or not said');
	const areaMax = $derived(Math.max(1, ...data.areas.map((r) => r.n)));
</script>

<svelte:head><title>{a.title} · The Counter</title></svelte:head>

<section class="head">
	<div class="label">{whenLabel}</div>
	<h1>{a.title}</h1>
	<p class="ask">{a.ask}</p>
	{#if a.kind === 'day' && data.state !== 'past'}<p class="muted small">Press "I'm in", then do it on your own {weekday(lastDay)}, wherever you live. One press, nothing more.{#if a.repeat === 'weekly'}{' '}Every {weekday(a.date)} is counted on its own.{/if}</p>{/if}
		{#if a.calledBy}<p class="muted">Called by <a href={a.calledByUrl} rel="noreferrer">{a.calledBy}</a>. We count it here, with no list of who.</p>{/if}
	{#if howTo}
		<details class="howto">
			<summary>How to do it</summary>
			{#if howTo.lose}<p><b>What you lose:</b> {howTo.lose}</p>{/if}
			<ol>{#each howTo.steps as s}<li>{s}</li>{/each}</ol>
			{#if howTo.guide}<p><a href={howTo.guide.url} rel="noreferrer">{howTo.guide.label}</a></p>{/if}
		</details>
	{/if}
</section>

<section class="hero">
	{#if a.kind === 'step'}
		<div class="big"><span class="dark-only">{n(shownDid)}</span><span class="bright-only">{pad(shownDid)}</span></div>
		<div class="unit">{people(shownDid, 'person did it', 'people did it')}{youIncluded ? ', you included' : ''}</div>
	{:else}
		<div class="big"><span class="dark-only">{n(shownIn)}</span><span class="bright-only">{pad(shownIn)}</span></div>
		<div class="unit">{data.state === 'past' ? people(shownIn, 'person was in', 'people were in') : people(shownIn, 'person is in', 'people are in')}{a.repeat === 'weekly' && r ? ` for ${niceDate(r.start)}` : ''}{youIncluded ? ', you included' : ''}</div>
	{/if}
	{#if youIncluded}
		<p class="muted small"><b>Your count is on your screen already.</b> Everyone else sees it at {clock(bump.until)}, together with everyone who counts in before then. That way nobody can match a jump in the number to a person.</p>
	{:else}
		<p class="muted small">The number moves every {batchText}, not the second you join{mounted && data.state !== 'past' ? `; next at ${clock(data.nextUpdate)}` : ''}. That is on purpose: nobody can match a jump to a person.</p>
	{/if}
</section>

{#if isAmazonDelete && (data.totals.addresses || data.totals.payment_methods)}
	<section class="sums">
		<div><b>{n(data.totals.addresses ?? 0)}</b> addresses Amazon lost</div>
		<div><b>{n(data.totals.payment_methods ?? 0)}</b> payment methods Amazon lost</div>
	</section>
{/if}

{#if data.state === 'past'}
	<p class="closed">This count is closed. It stays here as the result.</p>
{:else if result && !['error', 'slow_down'].includes(result)}
	<section class="receipt" aria-live="polite">
		<h2>{result === 'already' ? "You're already counted." : result === 'closed' ? 'This count just closed.' : isStep ? "You're counted." : "You're in."}</h2>
		{#if !isStep && result !== 'closed' && result !== 'already'}<p class="comeback"><b>On {niceDate(lastDay)}, do it.</b> That's all. Nothing more to press.</p>{/if}
		<dl>
			<dt>Stayed on your device</dt><dd>Your six words{saved ? ', remembered in this browser only' : ''}.</dd>
			<dt>Sent to us</dt><dd>Your ticket{sent?.country ? `. Your area: ${[sent.city, COUNTRY_NAME[sent.country]].filter(Boolean).join(', ')}${sent.postalCode ? ' ' + sent.postalCode : ''}` : ''}{sent?.sums ? '. Your two numbers' : ''}.</dd>
			<dt>Kept</dt><dd>The ticket, the area if you gave one, and the day. Not the hour.</dd>
			{#if sent?.sums}<dt>Added to a total, then forgotten</dt><dd>{sent.sums.addresses} addresses, {sent.sums.payment_methods} payment methods.</dd>{/if}
			<dt>Held for a few minutes, never written down</dt><dd>Your IP address, scrambled, to slow down floods.</dd>
			<dt>Seen by the host's network</dt><dd>Your IP address, as with any website. Tor Browser hides it.</dd>
		</dl>
		{#if a.repeat === 'weekly'}<p>Every {weekday(a.date)} is a new count. Come back next week to say you're in again.</p>{/if}
		{#if data.next}<p class="next">Next action: <a href="/a/{data.next.slug}">{data.next.date ? niceDate(data.next.date) + ': ' : ''}{data.next.title}</a></p>{/if}
	</section>
{:else if doneHere && !again}
	<section class="join">
		<h2>You're counted.</h2>
		<p>This device already counted for this{a.repeat === 'weekly' ? ' week' : ''}. Pressing again would not add you twice: one set of words counts once.</p>
		<button type="button" class="ghost small-btn" onclick={() => (again = true)}>Someone else wants to count on this device</button>
	</section>
{:else}
	<section class="join">
		<h2>Count me</h2>
		{#if data.paused}<p class="closed" role="status"><b>Counting is paused for a moment.</b> Too many tickets came in at once, or I switched it off to look at something. The numbers stay. Try again in a little while.</p>{/if}
		<p>No email. No account. Your device makes six random words. They are your key, and we never see them. From the words, your device makes a ticket: a long code that says nothing about you. Only the ticket is sent.{#if a.repeat === 'weekly'}{' '}Every week gets a new ticket.{/if}</p>
		{#if inApp}<p class="saved"><b>You opened this inside Instagram or Facebook.</b> Their built-in browser belongs to Meta. For more privacy, open nolistofwho.org in your own browser: tap the three dots, then "Open in browser".</p>{/if}
		<noscript><p class="closed">Making the ticket needs JavaScript, because it happens on your device and not on our server.</p></noscript>

		{#if mode === 'saved'}
			<p class="saved"><b>Your words are on this device.</b> Just press the button.</p>
			<div class="row2">
				<button type="button" class="ghost small-btn" onclick={() => (showSaved = !showSaved)}>{showSaved ? 'Hide my words' : 'Show my words'}</button>
				<button type="button" class="ghost small-btn" onclick={() => (mode = 'back')}>Use other words</button>
			</div>
			{#if showSaved}
				<ol class="words" aria-label="Your six words">{#each saved as w}<li>{w}</li>{/each}</ol>
				<p class="muted small">Write them down to use them on another phone or computer.</p>
			{/if}
		{/if}

		{#if !mode}
			<div class="choice">
				<button type="button" class="go" onclick={newWords}>I'm new: make my words</button>
				<button type="button" class="ghost" onclick={() => (mode = 'back')}>I have my words</button>
			</div>
		{/if}

		{#if mode === 'new'}
			<div class="label2">Your six words</div>
			<ol class="words" aria-label="Your six words">
				{#each words as w}<li>{w}</li>{/each}
			</ol>
			<p><b>Write them on paper, or take a photo.</b> They are the only way back: to join next week, or the next action. Nobody, not even us, can give them to you again. Lose them, and you simply count as someone new.</p>
			<p class="muted small">Paper is safest. A photo that your phone backs up to Google or Apple puts the words in their cloud. The words don't say who you are, but still.</p>
			<div class="row2">
				<button type="button" class="ghost small-btn" onclick={copyWords}>{copied ? 'Copied' : 'Copy the words'}</button>
				<button type="button" class="ghost small-btn" onclick={newWords}>Other words</button>
			</div>
			<div class="check">
				<input id="wrote" type="checkbox" bind:checked={wroteDown} />
				<label class="plain" for="wrote">I wrote them down, or I'm fine counting just once.</label>
			</div>
		{/if}

		{#if mode === 'new' || mode === 'back'}
			<div class="check">
				<input id="remember" type="checkbox" bind:checked={remember} />
				<label class="plain" for="remember">Remember my words on this device, so next time it's one button. They stay on this device and are never sent.</label>
			</div>
		{/if}

		{#if mode === 'back'}
			<label for="typed">Your six words</label>
			<textarea id="typed" rows="2" autocomplete="off" autocapitalize="off" spellcheck="false" bind:value={typed} placeholder="six words, in order"></textarea>
			{#if typedError}<p class="closed" role="alert">{typedError}</p>{/if}
			<button type="button" class="linkish" onclick={newWords}>I lost them: make new words</button>
		{/if}

		{#if mode}
			<div class="label2">Where, if you want</div>
			<p class="muted small"><b>Only the country is shown, and only when 10 or more people share it.</b> A city and postal code are kept but not shown for now. Leave it all empty if you prefer.</p>
			<div>
				<label class="plain" for="country">Country</label>
				<select id="country" bind:value={country}>
					<option value="">Not said</option>
					{#each COUNTRIES as [code, name]}<option value={code}>{name}</option>{/each}
				</select>
			</div>
			{#if country}
				<div class="two">
					<div>
						<label class="plain" for="city">City or town (optional)</label>
						<input id="city" type="text" autocomplete="off" maxlength="40" bind:value={city} placeholder="Berlin" />
					</div>
					<div>
						<label class="plain" for="plz">Postal code (optional)</label>
						<input id="plz" type="text" autocomplete="off" maxlength="10" bind:value={postalCode} placeholder="10997" />
					</div>
				</div>
			{/if}

			{#if isAmazonDelete}
				<div class="label2">What Amazon lost, if you want</div>
				<div class="two">
					<div>
						<label class="plain" for="addr">Addresses you deleted</label>
						<select id="addr" bind:value={addresses}><option value={0}>Not said</option><option value={1}>1</option><option value={2}>2</option><option value={3}>3</option><option value={4}>4 or more</option></select>
					</div>
					<div>
						<label class="plain" for="pay">Payment methods you deleted</label>
						<select id="pay" bind:value={paymentMethods}><option value={0}>Not said</option><option value={1}>1</option><option value={2}>2</option><option value={3}>3</option><option value={4}>4 or more</option></select>
					</div>
				</div>
				<p class="muted small">Added to a total and forgotten. Never kept next to your ticket.</p>
			{/if}

			{#if areaError}<p class="closed" role="alert">{areaError}</p>{/if}
			<button type="button" class="go" onclick={send} disabled={busy || !canSend}>{busy ? 'Working…' : verb}</button>
			{#if busy}<p class="muted small" role="status">{step} A few seconds. This small effort is what keeps bots out, so there is no puzzle for you to solve.</p>{/if}
			{#if result === 'paused'}<p class="closed" role="alert"><b>Counting is paused for a moment.</b> Nothing was sent. Your words still work: come back in a little while and press the button again.</p>{/if}
			{#if result === 'slow_down'}<p class="closed" role="alert">Too many tickets from your connection in the last few minutes. Wait ten minutes and try again. (On a shared connection, like Tor or a café, this can happen.)</p>{/if}
			{#if result === 'error'}<p class="closed" role="alert">That did not go through. Nothing was saved. Try again.</p>{/if}
		{/if}
	</section>
{/if}

{#if data.history.length}
	<section class="history">
		<h2>Every {weekday(a.date)} so far</h2>
		<table>
			<thead><tr><th scope="col">Round</th><th scope="col">In</th>{#if myRounds.length}<th scope="col"><span class="sr">You</span></th>{/if}</tr></thead>
			<tbody>
				{#each data.history as h}
					<tr>
						<td>{niceDate(h.start)}</td>
						<td>{n(h.in)}</td>
												{#if myRounds.length}<td class="g">{mine[myKey(h.start)] ? 'you were in' : ''}</td>{/if}
					</tr>
				{/each}
			</tbody>
		</table>
	</section>
{/if}

{#if myRounds.length || saved}
	<section class="mine">
		<h2>Your record, on this device only</h2>
		{#if myRounds.length}
			<p>{#if a.repeat === 'weekly'}You were in for <b>{myCount}</b> {weekday(a.date)}{myCount === 1 ? '' : 's'}{r && mine[myKey(r.key)] ? `, including ${niceDate(r.start)}` : ''}.{:else}{isStep ? 'You did it.' : "You're in."}{/if}</p>
		{/if}
		<p class="muted small">This record and your words live in this browser only. I keep no history of anyone; each round's ticket is unrelated to the last. Anyone who opens this browser can see them.</p>
		{#if askForget}
			<p class="closed" role="alert"><b>This removes your six words and your record from this device.</b> If you did not write the words down, you count as someone new next time.</p>
			<div class="row2">
				<button type="button" class="ghost small-btn" onclick={forget}>Yes, forget me</button>
				<button type="button" class="ghost small-btn" onclick={() => (askForget = false)}>Keep them</button>
			</div>
		{:else}
			<p><button type="button" class="ghost small-btn" onclick={() => (askForget = true)}>Forget me on this device</button></p>
		{/if}
	</section>
{/if}

{#if data.areas.length}
	<section class="areas">
		<h2>Where</h2>
		{#each data.areas as r}
			<div class="area">
				<div class="area-line"><span>{areaName(r)}</span><span>{n(r.n)}</span></div>
				<div class="bar" style="width: {Math.max(2, Math.round((r.n / areaMax) * 100))}%"></div>
			</div>
		{/each}
		<p class="muted small">A country shows only when 10 or more people share it. Updated once a day, so it can be behind the number above.</p>
	</section>
{/if}

<section class="honest">
	<h2>What this number is</h2>
	<p>It counts tickets, not checked people. Like a petition, one person could make more than one. We make that slow, and we remove clear abuse and say how many: {#if data.removed > 0}<b>{n(data.removed)} fake entries removed so far.</b>{:else}none removed so far.{/if} To check who someone is, we would need a list of who. We won't keep one.</p>
</section>

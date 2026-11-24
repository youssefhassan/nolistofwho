<script>
	import { page } from '$app/state';
	const https = $derived(`${page.url.origin}/calendar.ics`);
	const webcal = $derived(https.replace(/^https?:/, 'webcal:'));
	let copied = $state(false);
	async function copy() {
		try {
			await navigator.clipboard.writeText(https);
			copied = true;
		} catch {}
	}
</script>

<svelte:head><title>Calendar · The Counter</title></svelte:head>

<section class="head">
	<div class="label">Reminders without an email</div>
	<h1>The actions in your calendar</h1>
	<p class="ask">Every action with a date shows up in your own calendar, with a reminder the day before. New actions appear by themselves.</p>
</section>

<section class="steps">
	<p><a class="go" href={webcal}>Add to my calendar</a></p>
	<p class="muted small">Works on iPhone, Mac and most phones: your calendar app asks to subscribe.</p>

	<h2>Or add it by hand</h2>
	<p>Copy this address and choose "subscribe" or "add from URL" in your calendar app:</p>
	<p class="mono">{https}</p>
	<p><button type="button" class="theme" onclick={copy}>{copied ? 'Copied' : 'Copy the address'}</button></p>
	<p class="muted small">Thunderbird: New Calendar, On the Network. Android: apps like Etar or DAVx⁵ subscribe to it. Google Calendar: Other calendars, From URL.</p>
</section>

<section class="steps">
	<h2>What this tells me</h2>
	<p>Nothing about you. Your calendar app fetches the list now and then, like any page. I keep no record of who fetches it, and the feed is the same for everyone.</p>
	<p>One thing to know: if you add it to Google Calendar, Google fetches it for you and so knows you follow these actions. An app on your own phone or computer keeps that to you.</p>
</section>

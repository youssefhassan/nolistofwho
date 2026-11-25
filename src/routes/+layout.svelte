<script>
	import '@fontsource/barlow-condensed/latin-700.css';
	import '@fontsource/barlow-condensed/latin-800.css';
	import '@fontsource/barlow/latin-400.css';
	import '@fontsource/barlow/latin-600.css';
	import '../app.css';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { key, initKey } from '#lib/words.svelte.js';
	onMount(initKey);
	let { children, data } = $props();

	function switchTheme() {
		const next = document.documentElement.dataset.theme === 'bright' ? 'dark' : 'bright';
		document.documentElement.dataset.theme = next;
		try {
			localStorage.setItem('theme', next);
		} catch {}
	}
</script>

<svelte:head>
	<!-- The card shown when the address is pasted into a chat or a post. One picture for every page, served from here. -->
	<meta property="og:site_name" content="The Counter" />
	<meta property="og:type" content="website" />
	<meta property="og:title" content="Count yourself. No list of who." />
	<meta property="og:description" content="Direct actions against big tech, counted in public. No account, no email, no list of who." />
	<meta property="og:image" content="https://nolistofwho.org/og.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="description" content="Direct actions against big tech, counted in public. No account, no email, no list of who." />
	{#if data.stage === 'staging'}<meta name="robots" content="noindex, nofollow" />{/if}
</svelte:head>

{#if data.stage === 'staging'}
	<p class="stage" role="status">
		<b>Staging: a test build.</b> Every number here is test data, and all of it is wiped before the real launch. Press every button you like.
		<br /><b>I want your feedback.</b> What confused you? What feels wrong? Write to <a href="mailto:contact@nolistofwho.org">contact@nolistofwho.org</a>.
		{#if data.pretending}<br /><b>Pretend date: {data.pretending}.</b> The counter acts as if today were that day.{/if}
	</p>
{/if}

<header class="top">
	<a class="brand" href="/">The Counter</a>
	<span class="toplinks">
		<a href="/">All actions</a>
		<a href="/calendar">Calendar</a>
		<a href="/privacy">Privacy</a>
		<button type="button" class="theme" onclick={switchTheme}><span class="to-bright">Bright</span><span class="to-dark">Dark</span></button>
	</span>
</header>

<!-- On every page: do you have your words or not. Read from this device only; nothing is asked of the server. -->
{#if key.ready}
	<p class="keybar" role="status">
		{#if key.words}<b>Your six words are ready</b> ({key.remembered ? 'remembered on this device' : 'in this tab only'}). Every action is one button. <a href="/#words">See them</a>
		{:else}<b>No words yet.</b> <a href="/#words">Make your six words</a> once, then every action is one button.{/if}
	</p>
{/if}

<!-- A new page for every address. Without this, going from one action to the next kept the first action's
     receipt on screen ("You're counted") for an action the person had not joined (Youssef found it, Nov 20, 2026). -->
{#key page.url.pathname}
	<main>{@render children()}</main>
{/key}



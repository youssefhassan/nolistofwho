<script>
	// The one place where six words are made, typed in, shown and forgotten.
	// On the front page it sits at the top; on an action page it only appears when there are no words yet.
	import { onMount } from 'svelte';
	import { key, initKey, setKey, clearKey } from '#lib/words.svelte.js';
	let { onforget = () => {} } = $props();

	let mode = $state(null); // null | 'new' | 'back'
	let fresh = $state([]);
	let wroteDown = $state(false);
	let remember = $state(false); // off unless ticked (SPEC): the words are a key
	let typed = $state('');
	let typedError = $state('');
	let copied = $state(false);
	let show = $state(false);
	let askForget = $state(false);

	onMount(initKey);

	async function make() {
		const [{ makeWords }, { WORDS }] = await Promise.all([import('#lib/ticket.js'), import('#lib/wordlist.js')]);
		fresh = makeWords(WORDS);
		wroteDown = false;
		copied = false;
		mode = 'new';
	}

	async function copy() {
		try {
			await navigator.clipboard.writeText(fresh.join(' '));
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
			return;
		}
		typedError = '';
		done(w);
	}

	function done(w) {
		setKey(w, remember);
		fresh = [];
		typed = '';
		mode = null;
		show = false;
	}

	function other() {
		key.words = null;
		key.remembered = false;
		mode = 'back';
	}

	function forget() {
		clearKey();
		askForget = false;
		mode = null;
		onforget();
	}
</script>

{#if !key.ready}
	<noscript><p class="closed">Making the words needs JavaScript, because it happens on your device and not on our server.</p></noscript>
{:else if key.words && !mode}
	<p class="saved"><b>Your words are ready.</b> {key.remembered ? 'Remembered in this browser, on this device only.' : 'Held in this tab only. Close it and they are gone, so keep your paper.'} Every action is now one button.</p>
	<div class="row2">
		<button type="button" class="ghost small-btn" onclick={() => (show = !show)}>{show ? 'Hide my words' : 'Show my words'}</button>
		<button type="button" class="ghost small-btn" onclick={other}>Use other words</button>
	</div>
	{#if show}
		<ol class="words" aria-label="Your six words">{#each key.words as w}<li>{w}</li>{/each}</ol>
		<p class="muted small">Write them down to use them on another phone or computer.</p>
	{/if}
	{#if askForget}
		<p class="closed" role="alert"><b>This removes your six words and your record from this device.</b> If you did not write the words down, you count as someone new next time.</p>
		<div class="row2">
			<button type="button" class="ghost small-btn" onclick={forget}>Yes, forget me</button>
			<button type="button" class="ghost small-btn" onclick={() => (askForget = false)}>Keep them</button>
		</div>
	{:else}
		<button type="button" class="linkish" onclick={() => (askForget = true)}>Forget me on this device</button>
	{/if}
{:else if !mode}
	<div class="choice">
		<button type="button" class="go" onclick={make}>I'm new: make my words</button>
		<button type="button" class="ghost" onclick={() => (mode = 'back')}>I have my words</button>
	</div>
{:else if mode === 'new'}
	<ol class="words" aria-label="Your six words">{#each fresh as w}<li>{w}</li>{/each}</ol>
	<p><b>Write them on paper, or take a photo.</b> They are the only way back: to join next week, or the next action. Nobody, not even us, can give them to you again. Lose them, and you simply count as someone new.</p>
	<p class="muted small">Paper is safest. A photo that your phone backs up to Google or Apple puts the words in their cloud. The words don't say who you are, but still.</p>
	<div class="row2">
		<button type="button" class="ghost small-btn" onclick={copy}>{copied ? 'Copied' : 'Copy the words'}</button>
		<button type="button" class="ghost small-btn" onclick={make}>Other words</button>
	</div>
	<div class="check">
		<input id="wrote" type="checkbox" bind:checked={wroteDown} />
		<label class="plain" for="wrote">I wrote them down, or I'm fine counting just once.</label>
	</div>
{:else}
	<label for="typed">Your six words</label>
	<textarea id="typed" rows="2" autocomplete="off" autocapitalize="off" spellcheck="false" bind:value={typed} placeholder="six words, in order"></textarea>
	{#if typedError}<p class="closed" role="alert">{typedError}</p>{/if}
	<button type="button" class="linkish" onclick={make}>I lost them: make new words</button>
{/if}

{#if mode}
	<div class="check">
		<input id="remember" type="checkbox" bind:checked={remember} />
		<label class="plain" for="remember">Remember my words on this device, so next time it's one button. They stay on this device and are never sent. Your words are proof you took part: anyone who opens this browser can see them. Keep them like a key.</label>
	</div>
	{#if mode === 'new'}
		<button type="button" class="go" onclick={() => done(fresh)} disabled={!(wroteDown || remember)}>Use these words</button>
	{:else}
		<button type="button" class="go" onclick={useTyped} disabled={!typed.trim()}>Use these words</button>
	{/if}
{/if}

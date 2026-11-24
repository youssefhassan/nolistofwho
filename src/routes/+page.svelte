<script>
	import { niceDate, n, weekday } from '#lib/format.js';
	let { data } = $props();
</script>

<svelte:head><title>The Counter</title></svelte:head>

<section class="intro">
	<h1>Many people.<br />One action.<br /><span class="g">No list of who.</span></h1>
	<p class="maker">There are many sporadic efforts to put pressure on social media and the tech oligarchs: shutdowns, strikes, the exodus. So I built a counter that takes no data from you. We can measure the force we have, and encourage more people to use it.</p>
	<p class="maker-by">Youssef Hassan, Berlin. <a href="https://substack.com/@youssefhassan13" rel="noreferrer">Why I'm doing this</a>.</p>
	<p class="small"><a href="/calendar">Get a reminder before each action, in your own calendar.</a> No email.</p>
</section>

<nav class="chips" aria-label="Jump to a company">
	{#each data.groups as g}<a href="#{g.id}">{g.name}</a>{/each}
</nav>

{#each data.groups as g}
	<section id={g.id} class="group">
		<h2>{g.name}</h2>
		{#if g.actions.length === 0}
			<p class="muted">No action yet. Its turn comes.</p>
		{/if}
		{#each g.actions as a}
			<a class="row" href="/a/{a.slug}">
				<span>
					<span class="when" class:dated={a.kind === 'day'}>
						{#if a.kind === 'step'}A step · any day{:else if a.repeat === 'weekly'}Every {weekday(a.date)}{#if a.state === 'past'}{' '}· ended{:else}{' '}· {a.state === 'today' ? 'today' : 'next'}: {niceDate(a.date)}{/if}{:else}{niceDate(a.date)}{#if a.state === 'past'}{' '}· closed{/if}{/if}
					</span>
					<span class="title">{a.title}</span>
					{#if a.calledBy}<span class="muted small">Called by {a.calledBy}</span>{/if}
				</span>
				<span class="num">{n(a.kind === 'step' ? a.did : a.in)}</span>
			</a>
		{/each}
	</section>
{/each}

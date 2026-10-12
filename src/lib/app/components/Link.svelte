<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		href,
		variant = 'muted',
		target,
		rel,
		class: className = '',
		children
	}: {
		href: string;
		variant?: 'muted' | 'accent';
		target?: string;
		rel?: string;
		class?: string;
		children: Snippet;
	} = $props();

	const variants = {
		muted: 'text-text-dim hover:text-accent',
		accent: 'text-accent hover:text-text'
	};
</script>

<a
	class="underline {variants[variant]} {className}"
	{href}
	{target}
	{rel}
>
	{@render children()}
</a>

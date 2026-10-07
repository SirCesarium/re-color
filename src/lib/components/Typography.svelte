<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		as = 'p',
		variant = 'body',
		class: className = '',
		children
	}: {
		as?: 'h1' | 'h2' | 'h3' | 'p' | 'span' | 'strong' | 'label';
		variant?:
			| 'body'
			| 'muted'
			| 'section-label'
			| 'tagline'
			| 'page-title'
			| 'wordmark'
			| 'control-label'
			| 'control-hint';
		class?: string;
		children: Snippet;
	} = $props();

	const variants = {
		body: 'm-0 text-base leading-6 text-text',
		muted: 'm-0 text-base leading-6 text-text-dim',
		'section-label': 'text-base text-ok',
		tagline: 'mt-4 text-base leading-6 text-text-dim',
		'page-title': 'm-0 text-[32px] font-normal leading-none text-text [text-shadow:4px_4px_0_var(--shadow)]',
		wordmark:
			'm-0 text-[40px] font-normal leading-none tracking-normal text-text [text-shadow:4px_4px_0_var(--shadow)] transition-[text-shadow] duration-[120ms] ease-linear hover:[text-shadow:6px_6px_0_var(--shadow)] min-[900px]:text-[48px]',
		'control-label': 'text-base',
		'control-hint': 'text-base leading-6 text-text-dim'
	};
</script>

<svelte:element this={as} class="{variants[variant]} {className}">
	{@render children()}
</svelte:element>

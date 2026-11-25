<script lang="ts">
	import Typography from '#app/components/Typography.svelte';
	import { t } from '#app/text/index.ts';

	const sections = [
		{ id: 'how', labelKey: 'sections.how.label', titleKey: 'sections.how.title' },
		{ id: 'examples', labelKey: 'sections.examples.label', titleKey: 'sections.examples.title' },
		{ id: 'limits', labelKey: 'sections.limits.label', titleKey: 'sections.limits.title' }
	];

	// Placeholder copy lives here instead of messages.json so the real strings
	// do not inherit a translation key that will be deleted.
	const lorem = [
		'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
		'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
		'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.'
	];
</script>

{#each sections as section, index (section.id)}
	<section
		id={section.id}
		class="w-full scroll-mt-16 border-t border-border {index % 2 === 1
			? 'bg-panel-sunken'
			: 'bg-bg'}"
	>
		<div class="mx-auto w-full max-w-260 px-4 py-16 min-[900px]:py-24">
			<Typography as="span" variant="section-label">{t(section.labelKey)}</Typography>
			<Typography as="h2" variant="page-title" class="mt-3">{t(section.titleKey)}</Typography>

			<div class="mt-6 flex max-w-[65ch] flex-col gap-5">
				{#each [lorem[index % lorem.length], lorem[(index + 1) % lorem.length]] as paragraph, paragraphIndex (paragraphIndex)}
					<Typography variant="muted">{paragraph}</Typography>
				{/each}
			</div>
		</div>
	</section>
{/each}

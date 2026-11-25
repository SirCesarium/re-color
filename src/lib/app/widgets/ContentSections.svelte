<script lang="ts">
	import Typography from '#app/components/Typography.svelte';
	import { t } from '#app/text/index.ts';

	const sections = [
		{
			id: 'how',
			labelKey: 'sections.how.label',
			titleKey: 'sections.how.title',
			summaryKey: 'sections.how.summary',
			imageSrc: '/img/workflow-preview.png',
			mobileSrc: '/img/workflow-preview-mobile.png',
			imageAltKey: 'sections.how.imageAlt',
			width: 1520,
			height: 720
		},
		{
			id: 'examples',
			labelKey: 'sections.examples.label',
			titleKey: 'sections.examples.title',
			summaryKey: 'sections.examples.summary',
			imageSrc: '/img/examples-preview.png',
			mobileSrc: '/img/examples-preview-mobile.png',
			imageAltKey: 'sections.examples.imageAlt',
			width: 1520,
			height: 720
		},
		{
			id: 'limits',
			labelKey: 'sections.limits.label',
			titleKey: 'sections.limits.title',
			summaryKey: 'sections.limits.summary',
			imageSrc: '/img/limits-preview.png',
			mobileSrc: '/img/limits-preview-mobile.png',
			imageAltKey: 'sections.limits.imageAlt',
			width: 1280,
			height: 600
		}
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
			<Typography variant="muted" class="mt-5 max-w-[65ch]">{t(section.summaryKey)}</Typography>

			<picture class="mt-8 block w-full max-w-240">
				<source media="(max-width: 639px)" srcset={section.mobileSrc} />
				<img
					src={section.imageSrc}
					alt={t(section.imageAltKey)}
					width={section.width}
					height={section.height}
					loading="lazy"
					class="block h-auto w-full border border-border"
				/>
			</picture>
		</div>
	</section>
{/each}

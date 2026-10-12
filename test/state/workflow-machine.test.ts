import { describe, expect, test } from 'bun:test';
import {
	buttonHint,
	exclusionSignature,
	isErrorHint,
	mappingSignature,
	shouldAutoRecolor,
	shouldRecomposeExclusions,
	shouldRunInitialRecolor,
	type WorkflowSnapshot
} from '../../src/lib/state/workflow/machine.ts';

/** A neutral baseline; each test overrides only what it cares about. */
function snapshot(overrides: Partial<WorkflowSnapshot> = {}): WorkflowSnapshot {
	return {
		ready: false,
		busy: false,
		noActiveColors: false,
		autoRecolor: true,
		hasResult: false,
		resultMappingSignature: null,
		resultExclusionSignature: null,
		paletteColorsLoaded: false,
		workspaceLoaded: false,
		...overrides
	};
}

describe('mappingSignature', () => {
	test('fingerprints the mapping mode and each color', () => {
		const colors = [
			{ r: 10, g: 20, b: 30, active: true },
			{ r: 240, g: 200, b: 96, active: false }
		];

		expect(mappingSignature('luminance', colors)).toBe(
			'luminance:10,20,30,1;240,200,96,0'
		);
	});

	test('marks an inactive color apart from the same active one', () => {
		const active = mappingSignature('nearest', [
			{ r: 1, g: 2, b: 3, active: true }
		]);
		const inactive = mappingSignature('nearest', [
			{ r: 1, g: 2, b: 3, active: false }
		]);

		expect(active).not.toBe(inactive);
	});

	test('an empty palette yields just the mode', () => {
		expect(mappingSignature('dominant', [])).toBe('dominant:');
	});
});

describe('exclusionSignature', () => {
	test('is independent of the order the pixels were excluded in', () => {
		expect(exclusionSignature([8, 3, 5])).toBe('3,5,8');
		expect(exclusionSignature([3, 5, 8])).toBe('3,5,8');
	});

	test('no exclusions yield an empty string', () => {
		expect(exclusionSignature([])).toBe('');
	});
});

describe('isErrorHint', () => {
	test('treats a failure hint as an error', () => {
		expect(isErrorHint('workflow.recolorFailed')).toBe(true);
	});

	test('treats an ordinary hint as a non-error', () => {
		expect(isErrorHint('workflow.noColors')).toBe(false);
	});

	test('treats a missing hint as a non-error', () => {
		expect(isErrorHint(null)).toBe(false);
	});
});

describe('buttonHint', () => {
	test('reports no colors once ready with nothing active', () => {
		const hint = buttonHint(
			snapshot({ ready: true, noActiveColors: true }),
			'luminance:',
			null
		);

		expect(hint).toBe('workflow.noColors');
	});

	test('reports pending changes when the mapping drifted and auto is off', () => {
		const hint = buttonHint(
			snapshot({
				ready: true,
				hasResult: true,
				autoRecolor: false,
				resultMappingSignature: 'luminance:'
			}),
			'nearest:',
			null
		);

		expect(hint).toBe('workflow.applyChanges');
	});

	test('falls through to the current hint when nothing is pending', () => {
		const hint = buttonHint(
			snapshot({ ready: true, hasResult: true }),
			'luminance:',
			'workflow.saveDataFailed'
		);

		expect(hint).toBe('workflow.saveDataFailed');
	});
});

describe('shouldAutoRecolor', () => {
	test('fires when the mapping drifted, a result exists, and auto is on', () => {
		const fires = shouldAutoRecolor(
			snapshot({
				hasResult: true,
				autoRecolor: true,
				resultMappingSignature: 'luminance:'
			}),
			'nearest:'
		);

		expect(fires).toBe(true);
	});

	test('stays quiet when auto recolor is off', () => {
		const fires = shouldAutoRecolor(
			snapshot({
				hasResult: true,
				autoRecolor: false,
				resultMappingSignature: 'luminance:'
			}),
			'nearest:'
		);

		expect(fires).toBe(false);
	});

	test('stays quiet before any result exists', () => {
		const fires = shouldAutoRecolor(snapshot({ hasResult: false }), 'nearest:');

		expect(fires).toBe(false);
	});
});

describe('shouldRunInitialRecolor', () => {
	test('fires once ready, loaded, and idle with colors to use', () => {
		const fires = shouldRunInitialRecolor(
			snapshot({
				ready: true,
				paletteColorsLoaded: true,
				workspaceLoaded: true
			})
		);

		expect(fires).toBe(true);
	});

	test('stays quiet while a recolor is already running', () => {
		const fires = shouldRunInitialRecolor(
			snapshot({
				ready: true,
				paletteColorsLoaded: true,
				workspaceLoaded: true,
				busy: true
			})
		);

		expect(fires).toBe(false);
	});

	test('stays quiet once a result already exists', () => {
		const fires = shouldRunInitialRecolor(
			snapshot({
				ready: true,
				paletteColorsLoaded: true,
				workspaceLoaded: true,
				hasResult: true
			})
		);

		expect(fires).toBe(false);
	});

	test('stays quiet when no colors are active', () => {
		const fires = shouldRunInitialRecolor(
			snapshot({
				ready: true,
				paletteColorsLoaded: true,
				workspaceLoaded: true,
				noActiveColors: true
			})
		);

		expect(fires).toBe(false);
	});
});

describe('shouldRecomposeExclusions', () => {
	test('fires when the excluded pixels changed', () => {
		const fires = shouldRecomposeExclusions(
			snapshot({ hasResult: true, resultExclusionSignature: '1,2' }),
			'1,3'
		);

		expect(fires).toBe(true);
	});

	test('stays quiet when there is no result', () => {
		const fires = shouldRecomposeExclusions(
			snapshot({ hasResult: false }),
			'1,2'
		);

		expect(fires).toBe(false);
	});

	test('stays quiet when the exclusions are unchanged', () => {
		const fires = shouldRecomposeExclusions(
			snapshot({ hasResult: true, resultExclusionSignature: '1,2' }),
			'1,2'
		);

		expect(fires).toBe(false);
	});
});

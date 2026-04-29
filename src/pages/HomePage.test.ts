import { describe, expect, it } from 'vitest';
import { normalizePackingOptions as normalizeNestingOptions } from '@/lib/nesting/orchestration/options';
import {
  shouldApplyNestingWorkerResult,
  shouldShowNestingStatus,
} from '@/lib/nesting/controller/use-nesting-controller';
import { resolveDisplayedSvg } from '@/pages/HomePage';

describe('shouldApplyNestingWorkerResult', () => {
  it('returns false when a newer model revision exists', () => {
    expect(
      shouldApplyNestingWorkerResult({
        runToken: 'run-1',
        activeRunToken: 'run-1',
        modelRevisionAtRunStart: 3,
        currentModelRevision: 4,
      })
    ).toBe(false);
  });

  it('returns true when token and model revision still match', () => {
    expect(
      shouldApplyNestingWorkerResult({
        runToken: 'run-1',
        activeRunToken: 'run-1',
        modelRevisionAtRunStart: 3,
        currentModelRevision: 3,
      })
    ).toBe(true);
  });

  it('returns false when run token was cleared by cancellation', () => {
    expect(
      shouldApplyNestingWorkerResult({
        runToken: 'run-1',
        activeRunToken: null,
        modelRevisionAtRunStart: 3,
        currentModelRevision: 3,
      })
    ).toBe(false);
  });
});

describe('shouldShowNestingStatus', () => {
  it('stays visible during active runs even if previously dismissed', () => {
    expect(
      shouldShowNestingStatus({
        isRunning: true,
        isDismissed: true,
        stats: null,
        error: null,
      })
    ).toBe(true);
  });

  it('hides completed status when dismissed by the user', () => {
    expect(
      shouldShowNestingStatus({
        isRunning: false,
        isDismissed: true,
        stats: {
          algorithm: 'deterministic',
          placedCount: 1,
          notFitCount: 0,
          durationMs: 4,
          fitness: {
            unplacedCount: 0,
            invalidCount: 0,
            binsUsed: 1,
            compactness: 10,
            usedArea: 10,
            materialArea: 10,
            utilization: 1,
            width: 2,
            height: 5,
            lowerLeftScore: 0,
            placementKey: '',
          },
        },
        error: null,
      })
    ).toBe(false);
  });

  it('shows a completed result when it is not dismissed', () => {
    expect(
      shouldShowNestingStatus({
        isRunning: false,
        isDismissed: false,
        stats: null,
        error: 'Nesting failed unexpectedly.',
      })
    ).toBe(true);
  });
});

describe('normalizeNestingOptions', () => {
  it('keeps no rotation when allowRotation is false even if rotationCount is larger', () => {
    const normalized = normalizeNestingOptions({
      allowRotation: false,
      rotationCount: 4,
    });

    expect(normalized.allowRotation).toBe(false);
    expect(normalized.rotationCount).toBe(1);
    expect(normalized.rotations).toEqual([0]);
  });

  it('preserves legacy allowRotation=true fallback without persisting contradictory rotationCount', () => {
    const normalized = normalizeNestingOptions({
      allowRotation: true,
    });

    expect(normalized.allowRotation).toBe(true);
    expect(normalized.rotationCount).toBeUndefined();
    expect(normalized.rotations).toEqual([0, 90]);
  });

  it('keeps legacy fallback stable when rehydrated and normalized again', () => {
    const first = normalizeNestingOptions({ allowRotation: true });
    const second = normalizeNestingOptions(first);

    expect(first.rotations).toEqual([0, 90]);
    expect(first.rotationCount).toBeUndefined();
    expect(second.rotations).toEqual([0, 90]);
    expect(second.rotationCount).toBeUndefined();
  });
});

describe('resolveDisplayedSvg', () => {
  it('shows preview svg while nesting is running', () => {
    expect(
      resolveDisplayedSvg({
        committedSvg: '<svg id="final"/>',
        previewSvg: '<svg id="preview"/>',
        isNestingRunning: true,
      })
    ).toBe('<svg id="preview"/>');
  });

  it('shows committed svg after nesting completes', () => {
    expect(
      resolveDisplayedSvg({
        committedSvg: '<svg id="final"/>',
        previewSvg: '<svg id="preview"/>',
        isNestingRunning: false,
      })
    ).toBe('<svg id="final"/>');
  });
});

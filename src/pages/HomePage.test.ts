import { describe, expect, it } from 'vitest';
import {
  shouldApplyNestingWorkerResult,
  shouldShowNestingStatus,
} from '@/pages/HomePage';

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
            binsUsed: 1,
            compactness: 10,
            width: 2,
            height: 5,
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

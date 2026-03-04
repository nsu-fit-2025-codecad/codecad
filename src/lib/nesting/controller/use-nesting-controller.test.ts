import { describe, expect, it } from 'vitest';
import {
  createEmptyNestingPreviewState,
  reduceNestingPreviewState,
  reduceNestingPreviewStateWithGuard,
} from '@/lib/nesting/controller/use-nesting-controller';

describe('reduceNestingPreviewState', () => {
  it('stores preview snapshots from progress events', () => {
    const initial = createEmptyNestingPreviewState();
    const next = reduceNestingPreviewState(initial, {
      type: 'progress',
      progress: {
        phase: 'placing',
        progress: 0.4,
        message: 'Placing',
        preview: {
          svgString: '<svg id="preview-1"/>',
          packedIds: ['a'],
        },
      },
    });

    expect(next.svgString).toBe('<svg id="preview-1"/>');
    expect(Array.from(next.packedIds)).toEqual(['a']);
  });

  it('preserves last preview when progress event has no preview payload', () => {
    const withPreview = reduceNestingPreviewState(
      createEmptyNestingPreviewState(),
      {
        type: 'progress',
        progress: {
          phase: 'placing',
          progress: 0.4,
          message: 'Placing',
          preview: {
            svgString: '<svg id="preview-1"/>',
            packedIds: ['a'],
          },
        },
      }
    );
    const withoutPreview = reduceNestingPreviewState(withPreview, {
      type: 'progress',
      progress: {
        phase: 'finalizing',
        progress: 0.97,
        message: 'Finalizing',
      },
    });

    expect(withoutPreview.svgString).toBe('<svg id="preview-1"/>');
    expect(Array.from(withoutPreview.packedIds)).toEqual(['a']);
  });

  it('clears preview on reset (success, cancel, or error end states)', () => {
    const withPreview = reduceNestingPreviewState(
      createEmptyNestingPreviewState(),
      {
        type: 'progress',
        progress: {
          phase: 'placing',
          progress: 0.5,
          message: 'Placing',
          preview: {
            svgString: '<svg id="preview-2"/>',
            packedIds: ['a', 'b'],
          },
        },
      }
    );
    const cleared = reduceNestingPreviewState(withPreview, { type: 'reset' });

    expect(cleared.svgString).toBeNull();
    expect(cleared.packedIds.size).toBe(0);
  });
});

describe('reduceNestingPreviewStateWithGuard', () => {
  it('clears preview when model revision changed during the run', () => {
    const withPreview = reduceNestingPreviewState(
      createEmptyNestingPreviewState(),
      {
        type: 'progress',
        progress: {
          phase: 'placing',
          progress: 0.35,
          message: 'Placing',
          preview: {
            svgString: '<svg id="preview-old"/>',
            packedIds: ['a'],
          },
        },
      }
    );
    const stale = reduceNestingPreviewStateWithGuard(withPreview, {
      runToken: 'run-1',
      activeRunToken: 'run-1',
      modelRevisionAtRunStart: 3,
      currentModelRevision: 4,
      progress: {
        phase: 'placing',
        progress: 0.4,
        message: 'Placing',
        preview: {
          svgString: '<svg id="preview-stale"/>',
          packedIds: ['a', 'b'],
        },
      },
    });

    expect(stale.svgString).toBeNull();
    expect(stale.packedIds.size).toBe(0);
  });

  it('does not reapply stale preview after it has been cleared', () => {
    const staleOnce = reduceNestingPreviewStateWithGuard(
      createEmptyNestingPreviewState(),
      {
        runToken: 'run-1',
        activeRunToken: 'run-1',
        modelRevisionAtRunStart: 3,
        currentModelRevision: 4,
        progress: {
          phase: 'placing',
          progress: 0.4,
          message: 'Placing',
          preview: {
            svgString: '<svg id="preview-stale-1"/>',
            packedIds: ['a'],
          },
        },
      }
    );
    const staleTwice = reduceNestingPreviewStateWithGuard(staleOnce, {
      runToken: 'run-1',
      activeRunToken: 'run-1',
      modelRevisionAtRunStart: 3,
      currentModelRevision: 4,
      progress: {
        phase: 'placing',
        progress: 0.45,
        message: 'Placing',
        preview: {
          svgString: '<svg id="preview-stale-2"/>',
          packedIds: ['a', 'b'],
        },
      },
    });

    expect(staleTwice.svgString).toBeNull();
    expect(staleTwice.packedIds.size).toBe(0);
  });

  it('ignores stale GA preview updates after model revision changes', () => {
    const withDeterministicPreview = reduceNestingPreviewState(
      createEmptyNestingPreviewState(),
      {
        type: 'progress',
        progress: {
          phase: 'placing',
          progress: 0.45,
          message: 'Placing',
          preview: {
            svgString: '<svg id="preview-deterministic"/>',
            packedIds: ['a', 'b'],
          },
        },
      }
    );
    const staleGaPreview = reduceNestingPreviewStateWithGuard(
      withDeterministicPreview,
      {
        runToken: 'run-2',
        activeRunToken: 'run-2',
        modelRevisionAtRunStart: 7,
        currentModelRevision: 8,
        progress: {
          phase: 'genetic',
          progress: 0.62,
          message: 'Running genetic search',
          preview: {
            svgString: '<svg id="preview-stale-ga"/>',
            packedIds: ['a', 'b', 'c'],
          },
        },
      }
    );

    expect(staleGaPreview.svgString).toBeNull();
    expect(staleGaPreview.packedIds.size).toBe(0);
  });
});

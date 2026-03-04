import { describe, expect, it } from 'vitest';
import {
  createEmptyNestingPreviewState,
  reduceNestingPreviewState,
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

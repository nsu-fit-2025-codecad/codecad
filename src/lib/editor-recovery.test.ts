import { describe, expect, it } from 'vitest';
import {
  addEditorRecoverySnapshot,
  createEditorEvaluationError,
  createEditorRecoverySnapshot,
} from '@/lib/editor-recovery';

describe('createEditorEvaluationError', () => {
  it('normalizes thrown values into messages', () => {
    expect(createEditorEvaluationError('boom')).toEqual({
      message: 'boom',
      stack: undefined,
    });
  });

  it('extracts anonymous function line and column when present', () => {
    const error = new Error('cad failed');
    error.stack = 'Error: cad failed\n    at eval (<anonymous>:5:12)';

    expect(createEditorEvaluationError(error)).toMatchObject({
      message: 'cad failed',
      lineNumber: 4,
      column: 12,
    });
  });
});

describe('addEditorRecoverySnapshot', () => {
  it('keeps newest snapshots first and limits history', () => {
    const first = createEditorRecoverySnapshot({
      code: 'return one;',
      parameters: [],
      createdAt: 1,
    });
    const second = createEditorRecoverySnapshot({
      code: 'return two;',
      parameters: [],
      createdAt: 2,
    });

    expect(
      addEditorRecoverySnapshot({
        snapshots: [first],
        snapshot: second,
        maxSnapshots: 1,
      })
    ).toEqual([second]);
  });

  it('deduplicates equivalent code and parameters', () => {
    const older = createEditorRecoverySnapshot({
      code: 'return cad;',
      parameters: [{ name: 'width', value: 10 }],
      createdAt: 1,
    });
    const newer = createEditorRecoverySnapshot({
      code: 'return cad;',
      parameters: [{ name: 'width', value: 10 }],
      createdAt: 2,
    });

    expect(
      addEditorRecoverySnapshot({
        snapshots: [older],
        snapshot: newer,
      })
    ).toEqual([newer]);
  });
});

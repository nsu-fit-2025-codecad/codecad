import type { Parameter } from '@/store/store';

const DEFAULT_MAX_SNAPSHOTS = 5;
const EVALUATION_STACK_LINE_OFFSET = 1;

export interface EditorEvaluationError {
  message: string;
  stack?: string;
  lineNumber?: number;
  column?: number;
}

export interface EditorRecoverySnapshot {
  id: string;
  code: string;
  parameters: Parameter[];
  createdAt: number;
}

const cloneParameters = (parameters: readonly Parameter[]): Parameter[] =>
  parameters.map((parameter) => ({ ...parameter }));

export const createEditorEvaluationError = (
  error: unknown
): EditorEvaluationError => {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  const locationMatch = stack?.match(/<anonymous>:(\d+):(\d+)/);

  if (!locationMatch) {
    return { message, stack };
  }

  return {
    message,
    stack,
    lineNumber: Math.max(
      1,
      Number(locationMatch[1]) - EVALUATION_STACK_LINE_OFFSET
    ),
    column: Number(locationMatch[2]),
  };
};

export const createEditorRecoverySnapshot = ({
  code,
  parameters,
  createdAt = Date.now(),
}: {
  code: string;
  parameters: readonly Parameter[];
  createdAt?: number;
}): EditorRecoverySnapshot => ({
  id: `editor-snapshot-${createdAt}`,
  code,
  parameters: cloneParameters(parameters),
  createdAt,
});

export const addEditorRecoverySnapshot = ({
  snapshots,
  snapshot,
  maxSnapshots = DEFAULT_MAX_SNAPSHOTS,
}: {
  snapshots: readonly EditorRecoverySnapshot[];
  snapshot: EditorRecoverySnapshot;
  maxSnapshots?: number;
}): EditorRecoverySnapshot[] => {
  const withoutDuplicate = snapshots.filter(
    (existing) =>
      existing.code !== snapshot.code ||
      JSON.stringify(existing.parameters) !==
        JSON.stringify(snapshot.parameters)
  );

  return [snapshot, ...withoutDuplicate].slice(0, maxSnapshots);
};

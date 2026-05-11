import React from 'react';
import { AlertTriangle, RotateCcw, Undo2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type {
  EditorEvaluationError,
  EditorRecoverySnapshot,
} from '@/lib/editor-recovery';
import { cn } from '@/lib/utils';

interface EditorErrorStatusProps {
  error: EditorEvaluationError;
  latestSnapshot: EditorRecoverySnapshot | null;
  onRestoreSnapshot: (snapshot: EditorRecoverySnapshot) => void;
  onResetDefaultScene: () => void;
  onDismiss: () => void;
  className?: string;
}

export const EditorErrorStatus = ({
  error,
  latestSnapshot,
  onRestoreSnapshot,
  onResetDefaultScene,
  onDismiss,
  className,
}: EditorErrorStatusProps) => {
  const location =
    typeof error.lineNumber === 'number'
      ? `Line ${error.lineNumber}${
          typeof error.column === 'number' ? `:${error.column}` : ''
        }`
      : null;

  return (
    <section
      className={cn(
        'w-[min(34rem,calc(100vw-2rem))] rounded-md border border-destructive/40 bg-background/95 p-3 text-sm shadow-lg backdrop-blur',
        className
      )}
      aria-label="Editor error"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium text-destructive">Code did not run</p>
              <p className="mt-1 break-words text-muted-foreground">
                Showing the last valid preview.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 shrink-0"
              onClick={onDismiss}
              aria-label="Dismiss editor error"
              title="Dismiss editor error"
            >
              <X className="size-4" />
            </Button>
          </div>
          <p className="mt-2 break-words font-mono text-xs">{error.message}</p>
          {location && (
            <p className="mt-1 text-xs text-muted-foreground">{location}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!latestSnapshot}
              onClick={() => {
                if (latestSnapshot) {
                  onRestoreSnapshot(latestSnapshot);
                }
              }}
            >
              <Undo2 className="size-4" />
              Restore last valid
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onResetDefaultScene}
            >
              <RotateCcw className="size-4" />
              Reset scene
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

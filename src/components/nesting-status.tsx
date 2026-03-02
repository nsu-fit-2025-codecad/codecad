import type { NestingProgress, NestingRunStats } from '@/lib/nesting';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface NestingStatusProps {
  isRunning: boolean;
  progress: NestingProgress | null;
  stats: NestingRunStats | null;
  error: string | null;
  className?: string;
  onCancel?: () => void;
  onDismiss?: () => void;
}

const formatDuration = (durationMs: number) =>
  durationMs >= 1000
    ? `${(durationMs / 1000).toFixed(2)}s`
    : `${Math.round(durationMs)}ms`;

const formatCompactness = (compactness: number) =>
  Number.isFinite(compactness) ? compactness.toFixed(2) : 'n/a';

const formatAlgorithm = (algorithm: NestingRunStats['algorithm']) =>
  algorithm === 'genetic' ? 'Genetic algorithm' : 'Standard placement';

const isCancellationMessage = (error: string) => /cancel/i.test(error);

export const NestingStatus = ({
  isRunning,
  progress,
  stats,
  error,
  className,
  onCancel,
  onDismiss,
}: NestingStatusProps) => {
  if (!isRunning && !stats && !error) {
    return null;
  }

  const progressPercent = Math.round((progress?.progress ?? 0) * 100);
  const canDismiss = !isRunning && !!(stats || error);

  return (
    <Card className={cn('w-80', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">Nesting Status</CardTitle>
          {canDismiss && onDismiss && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onDismiss}
              className="h-7 w-7 cursor-pointer"
              aria-label="Dismiss nesting status"
            >
              <X />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        {isRunning && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">
                {progress?.message ?? 'Running'}
              </span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded bg-muted">
              <div
                className="h-full bg-primary transition-all duration-200"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            {progress?.phase === 'genetic' &&
              progress.generation !== undefined &&
              progress.totalGenerations !== undefined && (
                <p className="text-muted-foreground">
                  Search round {progress.generation} /{' '}
                  {progress.totalGenerations}
                </p>
              )}
          </div>
        )}

        {stats && (
          <div className="space-y-1">
            <p>
              Method:{' '}
              <span className="font-medium">
                {formatAlgorithm(stats.algorithm)}
              </span>
            </p>
            <p>
              Placed / Could not place:{' '}
              <span className="font-medium">
                {stats.placedCount} / {stats.notFitCount}
              </span>
            </p>
            <p>
              Runtime:{' '}
              <span className="font-medium">
                {formatDuration(stats.durationMs)}
              </span>
            </p>
            <p>
              Layout footprint:{' '}
              <span className="font-medium">
                {formatCompactness(stats.fitness.compactness)}
              </span>
            </p>
            {stats.evaluations !== undefined && (
              <p>
                Genetic algorithm evaluations:{' '}
                <span className="font-medium">{stats.evaluations}</span>
              </p>
            )}
          </div>
        )}

        {error && (
          <p
            className={
              isCancellationMessage(error)
                ? 'text-muted-foreground'
                : 'text-destructive'
            }
          >
            {error}
          </p>
        )}

        {isRunning && onCancel && (
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="w-full cursor-pointer"
          >
            Cancel nesting
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

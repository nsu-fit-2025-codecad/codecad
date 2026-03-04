import { useEffect, useRef, useState } from 'react';
import type { IModel } from 'makerjs';
import {
  NESTING_RUN_CANCELLED_MESSAGE,
  NestingWorkerClient,
} from '@/lib/nesting/worker/worker-client';
import { normalizePackingOptions } from '@/lib/nesting/orchestration/options';
import type {
  NestingProgress,
  NestingRunStats,
  PackingOptions,
} from '@/lib/nesting';

export interface NestingWorkerResultGuard {
  runToken: string;
  activeRunToken: string | null;
  modelRevisionAtRunStart: number;
  currentModelRevision: number;
}

export const shouldApplyNestingWorkerResult = ({
  runToken,
  activeRunToken,
  modelRevisionAtRunStart,
  currentModelRevision,
}: NestingWorkerResultGuard) =>
  runToken === activeRunToken &&
  modelRevisionAtRunStart === currentModelRevision;

export interface NestingStatusVisibilityInput {
  isRunning: boolean;
  isDismissed: boolean;
  stats: NestingRunStats | null;
  error: string | null;
}

export const shouldShowNestingStatus = ({
  isRunning,
  isDismissed,
  stats,
  error,
}: NestingStatusVisibilityInput) =>
  isRunning || (!isDismissed && (stats !== null || error !== null));

export interface UseNestingControllerInput {
  model: IModel | null;
  updateFitStatus: (packedIds: Set<string>, notFitIds: Set<string>) => void;
  setModel: (model: IModel | null) => void;
  setSvg: (svg: string) => void;
  getModelRevision: () => number;
  bumpModelRevision: () => void;
}

export interface UseNestingControllerResult {
  nestingOptions: PackingOptions;
  setNestingOptions: (options: PackingOptions) => void;
  isDialogOpen: boolean;
  setIsDialogOpen: (open: boolean) => void;
  isRunning: boolean;
  progress: NestingProgress | null;
  stats: NestingRunStats | null;
  error: string | null;
  isStatusVisible: boolean;
  runNestingForTarget: (
    targetModelId: string,
    options?: PackingOptions
  ) => Promise<void>;
  cancelNestingRun: () => void;
  dismissNestingStatus: () => void;
}

const DEFAULT_NESTING_OPTIONS = normalizePackingOptions({
  rotationCount: 4,
  gap: 0,
  curveTolerance: 1,
  useGeneticSearch: true,
  populationSize: 8,
  maxGenerations: 2,
  mutationRate: 0.2,
  crossoverRate: 0.85,
  eliteCount: 2,
});

export const useNestingController = ({
  model,
  updateFitStatus,
  setModel,
  setSvg,
  getModelRevision,
  bumpModelRevision,
}: UseNestingControllerInput): UseNestingControllerResult => {
  const [nestingOptions, setNestingOptions] = useState<PackingOptions>(
    DEFAULT_NESTING_OPTIONS
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<NestingProgress | null>(null);
  const [stats, setStats] = useState<NestingRunStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStatusDismissed, setIsStatusDismissed] = useState(false);
  const workerClientRef = useRef<NestingWorkerClient | null>(null);
  const activeRunTokenRef = useRef<string | null>(null);
  const runTokenSequenceRef = useRef(0);

  useEffect(() => {
    const workerClient = new NestingWorkerClient();
    workerClientRef.current = workerClient;

    return () => {
      workerClient.dispose();
      workerClientRef.current = null;
    };
  }, []);

  const runNestingForTarget = async (
    targetModelId: string,
    options: PackingOptions = nestingOptions
  ) => {
    if (!model || isRunning) {
      return;
    }

    const normalizedOptions = normalizePackingOptions(options);
    const runToken = `nest-ui-${Date.now()}-${runTokenSequenceRef.current + 1}`;
    runTokenSequenceRef.current += 1;
    const modelRevisionAtRunStart = getModelRevision();
    activeRunTokenRef.current = runToken;

    setNestingOptions(normalizedOptions);
    setError(null);
    setStats(null);
    setIsStatusDismissed(false);
    setProgress({
      phase: 'preparing',
      progress: 0,
      message: 'Starting worker',
    });
    setIsRunning(true);

    try {
      const workerClient =
        workerClientRef.current ??
        (() => {
          const nextClient = new NestingWorkerClient();
          workerClientRef.current = nextClient;
          return nextClient;
        })();
      const result = await workerClient.run({
        model,
        targetModelId,
        options: normalizedOptions,
        onProgress: (nextProgress) => {
          if (activeRunTokenRef.current !== runToken) {
            return;
          }
          setProgress(nextProgress);
        },
      });

      if (
        !shouldApplyNestingWorkerResult({
          runToken,
          activeRunToken: activeRunTokenRef.current,
          modelRevisionAtRunStart,
          currentModelRevision: getModelRevision(),
        })
      ) {
        return;
      }

      setModel(result.model);
      bumpModelRevision();
      updateFitStatus(result.packedIds, result.notFitIds);
      setSvg(result.svgString);
      setStats(result.stats);
    } catch (nextError) {
      setIsStatusDismissed(false);
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Nesting failed unexpectedly.'
      );
    } finally {
      if (activeRunTokenRef.current === runToken) {
        activeRunTokenRef.current = null;
        setIsRunning(false);
      }
    }
  };

  const cancelNestingRun = () => {
    if (!isRunning) {
      return;
    }

    activeRunTokenRef.current = null;
    workerClientRef.current?.cancelRun(NESTING_RUN_CANCELLED_MESSAGE);
    setIsRunning(false);
    setProgress(null);
    setStats(null);
    setError(NESTING_RUN_CANCELLED_MESSAGE);
    setIsStatusDismissed(false);
  };

  const dismissNestingStatus = () => {
    if (isRunning) {
      return;
    }

    setIsStatusDismissed(true);
    setProgress(null);
    setStats(null);
    setError(null);
  };

  return {
    nestingOptions,
    setNestingOptions,
    isDialogOpen,
    setIsDialogOpen,
    isRunning,
    progress,
    stats,
    error,
    isStatusVisible: shouldShowNestingStatus({
      isRunning,
      isDismissed: isStatusDismissed,
      stats,
      error,
    }),
    runNestingForTarget,
    cancelNestingRun,
    dismissNestingStatus,
  };
};

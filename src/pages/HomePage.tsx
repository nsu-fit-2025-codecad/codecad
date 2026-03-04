import React, { useCallback, useEffect, useRef, useState } from 'react';
import makerjs, { IModel } from 'makerjs';
import { ParametersPane } from '@/components/parameters-pane';
import { useEditorStore, useParametersStore } from '@/store/store';
import { mapModelsToSizes } from '@/lib/geometry';
import { useModelsStore } from '@/store/models-store';
import { ModelsPane } from '@/components/models-pane';
import { Toolbar } from '@/components/toolbar';
import { usePanesStore } from '@/store/panes-store';
import { WorkbenchLayout } from '@/components/workbench-layout';
import { NestingTargetDialog } from '@/components/nesting-target-dialog';
import { NestingStatus } from '@/components/nesting-status';
import {
  NESTING_RUN_CANCELLED_MESSAGE,
  NestingWorkerClient,
} from '@/lib/nesting/worker-client';
import type {
  NestingProgress,
  NestingRunStats,
  PackingOptions,
} from '@/lib/nesting';
import { resolveRotationSelection } from '@/lib/nesting/rotations';
import { renderModelToSvg } from '@/lib/svg-render';

const normalizeNumeric = (
  value: number | undefined,
  fallback: number,
  min: number,
  max?: number
) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  if (max === undefined) {
    return Math.max(min, value);
  }

  return Math.min(max, Math.max(min, value));
};

const normalizeNestingOptions = (options: PackingOptions): PackingOptions => {
  const resolvedRotationSelection = resolveRotationSelection({
    rotationCount: options.rotationCount,
    rotations: options.rotations,
    allowRotation: options.allowRotation ?? true,
  });
  const populationSize = Math.round(
    normalizeNumeric(options.populationSize, 8, 2, 200)
  );

  return {
    gap: normalizeNumeric(options.gap, 0, 0),
    allowRotation: resolvedRotationSelection.rotationCount > 1,
    rotationCount: resolvedRotationSelection.rotationCount,
    rotations: resolvedRotationSelection.rotations,
    curveTolerance: normalizeNumeric(options.curveTolerance, 1, 1e-6),
    searchStep:
      options.searchStep === undefined
        ? undefined
        : normalizeNumeric(options.searchStep, 1, 1e-6),
    useGeneticSearch: options.useGeneticSearch ?? true,
    populationSize,
    maxGenerations: Math.round(
      normalizeNumeric(options.maxGenerations, 2, 1, 500)
    ),
    mutationRate: normalizeNumeric(options.mutationRate, 0.2, 0, 1),
    crossoverRate: normalizeNumeric(options.crossoverRate, 0.85, 0, 1),
    eliteCount: Math.round(
      normalizeNumeric(options.eliteCount, 2, 1, Math.max(1, populationSize))
    ),
    geneticSeed:
      typeof options.geneticSeed === 'number' &&
      Number.isFinite(options.geneticSeed)
        ? Math.round(options.geneticSeed)
        : undefined,
  };
};

interface NestingWorkerResultGuard {
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

interface NestingStatusVisibilityInput {
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

export const HomePage = () => {
  const [svg, setSvg] = useState<string>('');
  const [model, setModel] = useState<IModel | null>(null);
  const [isNestingTargetDialogOpen, setIsNestingTargetDialogOpen] =
    useState(false);
  const [nestingOptions, setNestingOptions] = useState<PackingOptions>(() =>
    normalizeNestingOptions({
      rotationCount: 4,
      gap: 0,
      curveTolerance: 1,
      useGeneticSearch: true,
      populationSize: 8,
      maxGenerations: 2,
      mutationRate: 0.2,
      crossoverRate: 0.85,
      eliteCount: 2,
    })
  );
  const [isNestingInProgress, setIsNestingInProgress] = useState(false);
  const [nestingProgress, setNestingProgress] =
    useState<NestingProgress | null>(null);
  const [nestingStats, setNestingStats] = useState<NestingRunStats | null>(
    null
  );
  const [nestingError, setNestingError] = useState<string | null>(null);
  const [isNestingStatusDismissed, setIsNestingStatusDismissed] =
    useState(false);
  const workerClientRef = useRef<NestingWorkerClient | null>(null);
  const modelRevisionRef = useRef(0);
  const activeNestingRunTokenRef = useRef<string | null>(null);
  const runTokenSequenceRef = useRef(0);

  const { parameters } = useParametersStore();
  const {
    update,
    updateFitStatus,
    selectedModelId,
    models: availableModels,
  } = useModelsStore();
  const { code, settings } = useEditorStore();
  const {
    isModelsPaneOpen,
    isParametersPaneOpen,
    closeModelsPane,
    closeParametersPane,
  } = usePanesStore();

  useEffect(() => {
    const workerClient = new NestingWorkerClient();
    workerClientRef.current = workerClient;

    return () => {
      workerClient.dispose();
      workerClientRef.current = null;
    };
  }, []);

  const exportDXF = () => {
    if (!model) {
      alert('No model to export');
      return;
    }

    try {
      const dxf = makerjs.exporter.toDXF(model, {
        units: 'Millimeter',
        usePOLYLINE: true,
      });

      const blob = new Blob([dxf], {
        type: 'application/dxf',
      });

      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `drawing_${Date.now()}.dxf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('DXF export error:', error);
    }
  };

  const evalInput = useCallback(() => {
    if (!code) {
      return;
    }
    try {
      const createModel = new Function(
        'makerjs',
        ...parameters.map((p) => p.name),
        `return (function() {
          ${code}
        })();`
      );

      const model: IModel = createModel(
        makerjs,
        ...parameters.map((p) => p.value)
      );

      setModel(model);
      if (model.models) {
        update(mapModelsToSizes(model.models));
      }

      const svgString = renderModelToSvg(model);
      setSvg(svgString);
      modelRevisionRef.current += 1;
    } catch (error) {
      console.error('Error:', error);
      setSvg('');
      modelRevisionRef.current += 1;
    }
  }, [update, code, parameters]);

  useEffect(() => {
    if (!settings.autorun) {
      return;
    }
    evalInput();
  }, [evalInput, settings.autorun, code, parameters]);

  const runNestingForTarget = async (
    targetModelId: string,
    options: PackingOptions = nestingOptions
  ) => {
    if (!model || isNestingInProgress) {
      return;
    }

    const normalizedOptions = normalizeNestingOptions(options);
    const runToken = `nest-ui-${Date.now()}-${runTokenSequenceRef.current + 1}`;
    runTokenSequenceRef.current += 1;
    const modelRevisionAtRunStart = modelRevisionRef.current;
    activeNestingRunTokenRef.current = runToken;

    setNestingOptions(normalizedOptions);
    setNestingError(null);
    setNestingStats(null);
    setIsNestingStatusDismissed(false);
    setNestingProgress({
      phase: 'preparing',
      progress: 0,
      message: 'Starting worker',
    });
    setIsNestingInProgress(true);

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
        onProgress: (progress) => {
          if (activeNestingRunTokenRef.current !== runToken) {
            return;
          }
          setNestingProgress(progress);
        },
      });

      if (
        !shouldApplyNestingWorkerResult({
          runToken,
          activeRunToken: activeNestingRunTokenRef.current,
          modelRevisionAtRunStart,
          currentModelRevision: modelRevisionRef.current,
        })
      ) {
        return;
      }

      setModel(result.model);
      modelRevisionRef.current += 1;
      updateFitStatus(result.packedIds, result.notFitIds);
      setSvg(result.svgString);
      setNestingStats(result.stats);
    } catch (error) {
      setIsNestingStatusDismissed(false);
      setNestingError(
        error instanceof Error ? error.message : 'Nesting failed unexpectedly.'
      );
    } finally {
      if (activeNestingRunTokenRef.current === runToken) {
        activeNestingRunTokenRef.current = null;
        setIsNestingInProgress(false);
      }
    }
  };

  const cancelNestingRun = () => {
    if (!isNestingInProgress) {
      return;
    }

    activeNestingRunTokenRef.current = null;
    workerClientRef.current?.cancelRun(NESTING_RUN_CANCELLED_MESSAGE);
    setIsNestingInProgress(false);
    setNestingProgress(null);
    setNestingStats(null);
    setNestingError(NESTING_RUN_CANCELLED_MESSAGE);
    setIsNestingStatusDismissed(false);
  };

  const dismissNestingStatus = () => {
    if (isNestingInProgress) {
      return;
    }

    setIsNestingStatusDismissed(true);
    setNestingProgress(null);
    setNestingStats(null);
    setNestingError(null);
  };

  const runNesting = () => {
    if (!model || !model.models || isNestingInProgress) {
      return;
    }
    setIsNestingTargetDialogOpen(true);
  };

  const isNestingStatusVisible = shouldShowNestingStatus({
    isRunning: isNestingInProgress,
    isDismissed: isNestingStatusDismissed,
    stats: nestingStats,
    error: nestingError,
  });

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background text-foreground">
      <WorkbenchLayout
        svgString={svg}
        selectedModelId={selectedModelId}
        onExecuteCode={evalInput}
      />
      <Toolbar
        className="fixed bottom-5 left-1/2 -translate-x-1/2 z-30"
        onRunNesting={runNesting}
        isNesting={isNestingInProgress}
      />
      <NestingTargetDialog
        open={isNestingTargetDialogOpen}
        models={availableModels}
        initialTargetModelId={selectedModelId}
        initialOptions={nestingOptions}
        isNesting={isNestingInProgress}
        onOpenChange={setIsNestingTargetDialogOpen}
        onConfirm={runNestingForTarget}
      />
      {isNestingStatusVisible && (
        <NestingStatus
          className="fixed top-4 left-1/2 z-20 -translate-x-1/2"
          isRunning={isNestingInProgress}
          progress={nestingProgress}
          stats={nestingStats}
          error={nestingError}
          onCancel={cancelNestingRun}
          onDismiss={dismissNestingStatus}
        />
      )}
      {isModelsPaneOpen && (
        <ModelsPane
          className="fixed left-4 w-80 top-4 h-[calc(100vh-2rem)] z-10"
          onExportDXF={exportDXF}
          onClose={closeModelsPane}
        />
      )}
      {isParametersPaneOpen && (
        <ParametersPane
          className="fixed right-4 w-80 top-4 h-[calc(100vh-2rem)] z-10"
          onParametersEdit={() => {}}
          onClose={closeParametersPane}
        />
      )}
    </div>
  );
};

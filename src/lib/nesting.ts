import { IModel, IModelMap } from 'makerjs';
import { prepareNestInput } from '@/lib/nesting/orchestration/input-preparation';
import { applyPlacementToModelMap } from '@/lib/nesting/orchestration/model-assembly';
import { normalizePackingOptions } from '@/lib/nesting/orchestration/options';
import { runNestingEngine } from '@/lib/nesting/orchestration/orchestrator';
import { createProgressEmitter } from '@/lib/nesting/orchestration/progress';
import { buildNestingStats } from '@/lib/nesting/orchestration/stats';
import { renderModelToSvg } from '@/lib/svg-render';
import type { FitnessScore } from '@/lib/nesting/genetic/fitness';

export interface PackingOptions {
  gap?: number;
  allowRotation?: boolean;
  rotationCount?: number;
  rotations?: number[];
  curveTolerance?: number;
  searchStep?: number;
  useGeneticSearch?: boolean;
  populationSize?: number;
  maxGenerations?: number;
  mutationRate?: number;
  crossoverRate?: number;
  eliteCount?: number;
  geneticSeed?: number;
}

export type NestingAlgorithm = 'deterministic' | 'genetic';

export interface NestingProgress {
  phase: 'preparing' | 'placing' | 'genetic' | 'finalizing';
  progress: number;
  message: string;
  generation?: number;
  totalGenerations?: number;
  bestFitness?: FitnessScore;
}

export interface PackingRunCallbacks {
  onProgress?: (progress: NestingProgress) => void;
}

export interface NestingRunStats {
  algorithm: NestingAlgorithm;
  placedCount: number;
  notFitCount: number;
  durationMs: number;
  fitness: FitnessScore;
  generationsEvaluated?: number;
  evaluations?: number;
  geneticSeed?: number;
}

export interface PackModelsIntoNestingAreaResult {
  packedModels: IModelMap;
  didNotFitModels: IModelMap;
  stats: NestingRunStats;
}

export function packModelsIntoNestingArea(
  nestingArea: IModel,
  modelsToNest: IModelMap,
  options: PackingOptions = {},
  callbacks: PackingRunCallbacks = {}
): PackModelsIntoNestingAreaResult {
  const startedAt = Date.now();
  const emitProgress = createProgressEmitter(callbacks);
  const normalizedOptions = normalizePackingOptions(options);
  const rootModel: IModel = {
    models: {
      __target__: nestingArea,
      ...modelsToNest,
    },
  };

  emitProgress({
    phase: 'preparing',
    progress: 0.05,
    message: 'Preparing nesting input',
  });

  const { prepared, didNotFitModels: initialDidNotFitModels } =
    prepareNestInput(rootModel, '__target__', normalizedOptions);

  emitProgress({
    phase: 'preparing',
    progress: 0.2,
    message: 'Geometry prepared',
  });

  if (!prepared) {
    emitProgress({
      phase: 'finalizing',
      progress: 1,
      message: 'Nesting finished',
    });

    return {
      packedModels: {},
      didNotFitModels: initialDidNotFitModels,
      stats: buildNestingStats({
        algorithm: 'deterministic',
        placements: [],
        didNotFitModels: initialDidNotFitModels,
        packedModels: {},
        startedAt,
      }),
    };
  }

  const engineResult = runNestingEngine(prepared, normalizedOptions, {
    onProgress: emitProgress,
  });

  emitProgress({
    phase: 'finalizing',
    progress: 0.97,
    message: 'Finalizing result',
  });

  const assembledResult = applyPlacementToModelMap({
    prepared,
    placementResult: engineResult.placementResult,
  });

  emitProgress({
    phase: 'finalizing',
    progress: 1,
    message: 'Nesting finished',
  });

  return {
    packedModels: assembledResult.packedModels,
    didNotFitModels: assembledResult.didNotFitModels,
    stats: buildNestingStats({
      algorithm: engineResult.algorithm,
      placements: engineResult.placementResult.placements,
      didNotFitModels: assembledResult.didNotFitModels,
      packedModels: assembledResult.packedModels,
      startedAt,
      extras: engineResult.statsExtras,
    }),
  };
}

export interface PackModelsIntoTargetModelResult {
  packedIds: Set<string>;
  notFitIds: Set<string>;
  svgString: string;
  stats: NestingRunStats;
}

export function packModelsIntoTargetModel(
  model: IModel | null,
  targetModelId: string,
  options: PackingOptions = {},
  callbacks: PackingRunCallbacks = {}
): PackModelsIntoTargetModelResult | null {
  if (!model || !model.models) {
    return null;
  }

  const nestingArea = model.models[targetModelId];

  if (!nestingArea) {
    return null;
  }

  const modelsToNest: IModelMap = {};

  Object.entries(model.models).forEach(([modelId, candidate]) => {
    if (modelId === targetModelId) {
      return;
    }

    modelsToNest[modelId] = candidate;
  });

  if (Object.keys(modelsToNest).length === 0) {
    return null;
  }

  const { packedModels, didNotFitModels, stats } = packModelsIntoNestingArea(
    nestingArea,
    modelsToNest,
    options,
    callbacks
  );

  model.models = {
    [targetModelId]: nestingArea,
    ...packedModels,
    ...didNotFitModels,
  };

  return {
    packedIds: new Set(Object.keys(packedModels)),
    notFitIds: new Set(Object.keys(didNotFitModels)),
    svgString: renderModelToSvg(model),
    stats,
  };
}

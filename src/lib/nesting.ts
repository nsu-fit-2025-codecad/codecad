import makerjs, { IModel, IModelMap } from 'makerjs';
import {
  modelMapToNestParts,
  modelToPolygonShape,
} from '@/lib/nesting/makerjs-to-polygons';
import { compareFitness, evaluateNestFitness } from '@/lib/nesting/fitness';
import { runGeneticSearch } from '@/lib/nesting/genetic';
import { placePartsGreedy } from '@/lib/nesting/place';
import { resolveRotationSelection } from '@/lib/nesting/rotations';
import { renderModelToSvg } from '@/lib/svg-render';
import type { FitnessScore } from '@/lib/nesting/fitness';
import type { NestConfig, NestResult } from '@/lib/nesting/types';

const EPSILON = 1e-9;
const DEFAULT_CURVE_TOLERANCE = 1;
const MAX_GA_VERTEX_BUDGET = 180;
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

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
  const emitProgress = (progress: NestingProgress) => {
    callbacks.onProgress?.({
      ...progress,
      progress: clamp01(progress.progress),
    });
  };
  const buildStats = (
    algorithm: NestingAlgorithm,
    placements: NestResult['placements'],
    didNotFitModels: IModelMap,
    extras: Partial<NestingRunStats> = {}
  ): NestingRunStats => ({
    algorithm,
    placedCount: Object.keys(packedModels).length,
    notFitCount: Object.keys(didNotFitModels).length,
    durationMs: Date.now() - startedAt,
    fitness: evaluateNestFitness(
      {
        placements,
        notPlacedIds: Object.keys(didNotFitModels),
      },
      1
    ),
    ...extras,
  });

  const gap = Math.max(0, options.gap ?? 0);
  const allowRotation = options.allowRotation ?? true;
  const curveTolerance = Math.max(
    EPSILON,
    options.curveTolerance ?? DEFAULT_CURVE_TOLERANCE
  );
  const resolvedRotationSelection = resolveRotationSelection({
    rotationCount: options.rotationCount,
    rotations: options.rotations,
    allowRotation,
  });

  const packedModels: IModelMap = {};
  const didNotFitModels: IModelMap = {};

  emitProgress({
    phase: 'preparing',
    progress: 0.05,
    message: 'Preparing nesting input',
  });

  const nestingExtents = makerjs.measure.modelExtents(nestingArea);
  const nestingShape = modelToPolygonShape(nestingArea, curveTolerance);

  if (!nestingExtents || !nestingShape || nestingShape.area <= EPSILON) {
    const failedModels = {
      ...didNotFitModels,
      ...modelsToNest,
    };

    emitProgress({
      phase: 'finalizing',
      progress: 1,
      message: 'Nesting finished',
    });

    return {
      packedModels,
      didNotFitModels: failedModels,
      stats: buildStats('deterministic', [], failedModels),
    };
  }

  const { parts, invalidModels } = modelMapToNestParts(
    modelsToNest,
    curveTolerance
  );
  Object.assign(didNotFitModels, invalidModels);

  emitProgress({
    phase: 'preparing',
    progress: 0.2,
    message: 'Geometry prepared',
  });

  if (parts.length === 0) {
    emitProgress({
      phase: 'finalizing',
      progress: 1,
      message: 'Nesting finished',
    });

    return {
      packedModels,
      didNotFitModels,
      stats: buildStats('deterministic', [], didNotFitModels),
    };
  }

  const config: NestConfig = {
    gap,
    rotations: resolvedRotationSelection.rotations,
    curveTolerance,
    searchStep: options.searchStep,
  };

  emitProgress({
    phase: 'placing',
    progress: 0.35,
    message: 'Running deterministic placement',
  });

  const deterministicPlacementResult = placePartsGreedy(
    parts,
    nestingShape,
    config
  );
  let placementResult = deterministicPlacementResult;
  let selectedAlgorithm: NestingAlgorithm = 'deterministic';
  let runStatsExtras: Partial<NestingRunStats> = {};
  const totalPartVertices = parts.reduce(
    (sum, part) =>
      sum +
      part.shape.contours.reduce(
        (contourSum, contour) => contourSum + contour.length,
        0
      ),
    0
  );
  const deterministicFitness = evaluateNestFitness(
    deterministicPlacementResult,
    1
  );

  if (
    (options.useGeneticSearch ?? true) &&
    parts.length > 2 &&
    totalPartVertices <= MAX_GA_VERTEX_BUDGET
  ) {
    const geneticResult = runGeneticSearch(
      parts,
      nestingShape,
      config,
      {
        populationSize: options.populationSize,
        maxGenerations: options.maxGenerations,
        mutationRate: options.mutationRate,
        crossoverRate: options.crossoverRate,
        eliteCount: options.eliteCount,
        seed: options.geneticSeed,
      },
      {
        onProgress: (progress) => {
          const ratio =
            progress.totalGenerations > 0
              ? progress.generation / progress.totalGenerations
              : 1;

          emitProgress({
            phase: 'genetic',
            progress: 0.45 + ratio * 0.5,
            message: 'Running genetic search',
            generation: progress.generation,
            totalGenerations: progress.totalGenerations,
            bestFitness: progress.bestFitness,
          });
        },
      }
    );

    runStatsExtras = {
      generationsEvaluated: geneticResult.generationsEvaluated,
      evaluations: geneticResult.evaluations,
      geneticSeed: geneticResult.seed,
    };

    if (compareFitness(geneticResult.best.fitness, deterministicFitness) < 0) {
      placementResult = geneticResult.best.result;
      selectedAlgorithm = 'genetic';
    }
  }

  emitProgress({
    phase: 'finalizing',
    progress: 0.97,
    message: 'Finalizing result',
  });

  const partById = new Map(parts.map((part) => [part.id, part]));

  placementResult.placements.forEach((placement) => {
    const part = partById.get(placement.id);

    if (!part) {
      return;
    }

    const packedModel = makerjs.model.clone(part.sourceModel);

    if (Math.abs(placement.rotation) > EPSILON) {
      makerjs.model.rotate(packedModel, placement.rotation, [0, 0]);
    }

    const packedExtents = makerjs.measure.modelExtents(packedModel);

    if (!packedExtents) {
      didNotFitModels[placement.id] = part.sourceModel;
      return;
    }

    const targetX = nestingExtents.low[0] + placement.x;
    const targetY = nestingExtents.low[1] + placement.y;

    makerjs.model.moveRelative(packedModel, [
      targetX - packedExtents.low[0],
      targetY - packedExtents.low[1],
    ]);

    packedModels[placement.id] = packedModel;
  });

  placementResult.notPlacedIds.forEach((id) => {
    const part = partById.get(id);

    if (!part) {
      return;
    }

    didNotFitModels[id] = part.sourceModel;
  });

  emitProgress({
    phase: 'finalizing',
    progress: 1,
    message: 'Nesting finished',
  });

  return {
    packedModels,
    didNotFitModels,
    stats: buildStats(
      selectedAlgorithm,
      placementResult.placements,
      didNotFitModels,
      runStatsExtras
    ),
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

  Object.entries(model.models).forEach(([modelId, nestingCandidate]) => {
    if (modelId === targetModelId) {
      return;
    }

    modelsToNest[modelId] = nestingCandidate;
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

import {
  compareFitness,
  evaluateNestFitness,
} from '@/lib/nesting/genetic/fitness';
import { runGeneticSearch } from '@/lib/nesting/genetic/genetic';
import { decideGeneticExecution } from '@/lib/nesting/orchestration/genetic-policy';
import { applyPlacementToModelMap } from '@/lib/nesting/orchestration/model-assembly';
import { placePartsGreedy } from '@/lib/nesting/placement/place';
import type { PlacementProgressSnapshot } from '@/lib/nesting/placement/place';
import { renderModelToSvg } from '@/lib/svg-render';
import type {
  EngineExecutionResult,
  PreparedNestInput,
} from '@/lib/nesting/orchestration/runtime-types';
import type { NormalizedPackingOptions } from '@/lib/nesting/orchestration/runtime-types';
import type { PackingRunCallbacks } from '@/lib/nesting';

const buildDeterministicPreview = (
  prepared: PreparedNestInput,
  snapshot: PlacementProgressSnapshot
) => {
  const placedIds = new Set(
    snapshot.placements.map((placement) => placement.id)
  );
  const notPlacedSet = new Set(snapshot.notPlacedIds);
  const unresolvedIds = prepared.parts
    .map((part) => part.id)
    .filter((id) => !placedIds.has(id) && !notPlacedSet.has(id));
  const assembled = applyPlacementToModelMap({
    prepared,
    placementResult: {
      placements: snapshot.placements,
      notPlacedIds: [...snapshot.notPlacedIds, ...unresolvedIds],
    },
  });
  const previewModel = {
    models: {
      [prepared.targetModelId]: prepared.nestingArea,
      ...assembled.packedModels,
      ...assembled.didNotFitModels,
    },
  };

  return {
    svgString: renderModelToSvg(previewModel),
    packedIds: Object.keys(assembled.packedModels),
  };
};

export const runNestingEngine = (
  prepared: PreparedNestInput,
  options: NormalizedPackingOptions,
  callbacks: PackingRunCallbacks = {}
): EngineExecutionResult => {
  const config = {
    gap: options.gap,
    rotations: options.rotations,
    curveTolerance: options.curveTolerance,
    searchStep: options.searchStep,
  };

  callbacks.onProgress?.({
    phase: 'placing',
    progress: 0.35,
    message: 'Running deterministic placement',
  });

  const deterministicPlacementResult = placePartsGreedy(
    prepared.parts,
    prepared.nestingShape,
    config,
    {
      onPartProcessed: (snapshot) => {
        const ratio =
          snapshot.totalParts > 0
            ? snapshot.processedParts / snapshot.totalParts
            : 1;

        callbacks.onProgress?.({
          phase: 'placing',
          progress: 0.35 + ratio * 0.1,
          message: `Placing parts (${snapshot.processedParts}/${snapshot.totalParts})`,
          preview: buildDeterministicPreview(prepared, snapshot),
        });
      },
    }
  );
  const deterministicFitness = evaluateNestFitness(
    deterministicPlacementResult,
    1
  );
  const geneticDecision = decideGeneticExecution(prepared.parts, options);

  if (geneticDecision.mode !== 'enabled') {
    return {
      algorithm: 'deterministic',
      placementResult: deterministicPlacementResult,
      statsExtras: {},
    };
  }

  const geneticResult = runGeneticSearch(
    prepared.parts,
    prepared.nestingShape,
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

        callbacks.onProgress?.({
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

  if (compareFitness(geneticResult.best.fitness, deterministicFitness) < 0) {
    return {
      algorithm: 'genetic',
      placementResult: geneticResult.best.result,
      statsExtras: {
        generationsEvaluated: geneticResult.generationsEvaluated,
        evaluations: geneticResult.evaluations,
        geneticSeed: geneticResult.seed,
      },
    };
  }

  return {
    algorithm: 'deterministic',
    placementResult: deterministicPlacementResult,
    statsExtras: {
      generationsEvaluated: geneticResult.generationsEvaluated,
      evaluations: geneticResult.evaluations,
      geneticSeed: geneticResult.seed,
    },
  };
};

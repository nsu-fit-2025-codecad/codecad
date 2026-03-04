import {
  compareFitness,
  evaluateNestFitness,
} from '@/lib/nesting/genetic/fitness';
import { runGeneticSearch } from '@/lib/nesting/genetic/genetic';
import { decideGeneticExecution } from '@/lib/nesting/orchestration/genetic-policy';
import { placePartsGreedy } from '@/lib/nesting/placement/place';
import type {
  EngineExecutionResult,
  PreparedNestInput,
} from '@/lib/nesting/orchestration/runtime-types';
import type { NormalizedPackingOptions } from '@/lib/nesting/orchestration/runtime-types';
import type { PackingRunCallbacks } from '@/lib/nesting';

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
    config
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

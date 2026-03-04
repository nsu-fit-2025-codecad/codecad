import { normalizeRotations } from '@/lib/nesting/polygon/rotations';
import { createSeededRandom } from '@/lib/nesting/utils/random';
import { resolveGeneticConfig } from '@/lib/nesting/genetic/genetic-config';
import {
  findBestEvaluatedChromosome,
  type EvaluationContext,
  deriveSeed,
  evaluateChromosome,
} from '@/lib/nesting/genetic/genetic-evaluation';
import {
  compareEvaluatedChromosomes,
  cloneChromosome,
  crossoverChromosomes,
  mutateChromosome,
} from '@/lib/nesting/genetic/genetic-operators';
import {
  createInitialPopulation,
  selectWeighted,
} from '@/lib/nesting/genetic/genetic-population';
import type {
  GeneticChromosome,
  GeneticSearchCallbacks,
  GeneticConfig,
  GeneticRunResult,
} from '@/lib/nesting/genetic/genetic-types';
import type {
  NestConfig,
  NestPart,
  PolygonShape,
} from '@/lib/nesting/polygon/types';
import { evaluateNestFitness } from '@/lib/nesting/genetic/fitness';

export {
  DEFAULT_GENETIC_CONFIG,
  resolveGeneticConfig,
} from '@/lib/nesting/genetic/genetic-config';
export { createSeededRandom } from '@/lib/nesting/utils/random';
export {
  crossoverChromosomes,
  mutateChromosome,
} from '@/lib/nesting/genetic/genetic-operators';

const emptyChromosome = (): GeneticChromosome => ({
  order: [],
  rotations: {},
});

export const runGeneticSearch = (
  parts: NestPart[],
  bin: PolygonShape,
  nestConfig: NestConfig,
  rawConfig: Partial<GeneticConfig> = {},
  callbacks: GeneticSearchCallbacks = {}
): GeneticRunResult => {
  const resolvedConfig = resolveGeneticConfig(rawConfig);
  const allowedRotations = normalizeRotations(nestConfig.rotations);
  const seed =
    resolvedConfig.seed ?? deriveSeed(parts, allowedRotations, resolvedConfig);

  if (parts.length === 0) {
    const emptyResult = { placements: [], notPlacedIds: [] };
    const emptyFitness = evaluateNestFitness(emptyResult, 1);

    callbacks.onProgress?.({
      generation: 0,
      totalGenerations: 0,
      evaluations: 0,
      bestFitness: emptyFitness,
    });

    return {
      best: {
        chromosome: emptyChromosome(),
        result: emptyResult,
        fitness: emptyFitness,
      },
      generationsEvaluated: 0,
      evaluations: 0,
      seed,
    };
  }

  const random = createSeededRandom(seed);
  const population = createInitialPopulation(
    parts,
    resolvedConfig,
    allowedRotations,
    random
  );
  const evaluationContext: EvaluationContext = {
    partById: new Map(parts.map((part) => [part.id, part])),
    rotatedShapeCache: new Map(),
    defaultRotation: allowedRotations[0] ?? 0,
    bin,
    config: {
      ...nestConfig,
      rotations: [0],
    },
  };
  let evaluations = 0;
  let currentEvaluated = population.map((chromosome) =>
    evaluateChromosome(chromosome, evaluationContext)
  );
  evaluations += currentEvaluated.length;
  let best = findBestEvaluatedChromosome(currentEvaluated);

  callbacks.onProgress?.({
    generation: 0,
    totalGenerations: resolvedConfig.maxGenerations,
    evaluations,
    bestFitness: best.fitness,
  });

  for (
    let generation = 0;
    generation < resolvedConfig.maxGenerations;
    generation += 1
  ) {
    const ranked = [...currentEvaluated].sort(compareEvaluatedChromosomes);
    const nextPopulation = ranked
      .slice(0, resolvedConfig.eliteCount)
      .map((candidate) => cloneChromosome(candidate.chromosome));

    while (nextPopulation.length < resolvedConfig.populationSize) {
      const parentA = selectWeighted(ranked, random).chromosome;
      const parentB = selectWeighted(ranked, random).chromosome;
      const crossed =
        random() <= resolvedConfig.crossoverRate
          ? crossoverChromosomes(parentA, parentB, random)
          : cloneChromosome(parentA);
      const mutated = mutateChromosome(
        crossed,
        allowedRotations,
        resolvedConfig.mutationRate,
        random
      );

      nextPopulation.push(mutated);
    }

    currentEvaluated = nextPopulation.map((chromosome) =>
      evaluateChromosome(chromosome, evaluationContext)
    );
    evaluations += currentEvaluated.length;

    const generationBest = findBestEvaluatedChromosome(currentEvaluated);

    if (
      generationBest &&
      compareEvaluatedChromosomes(generationBest, best) < 0
    ) {
      best = generationBest;
    }

    callbacks.onProgress?.({
      generation: generation + 1,
      totalGenerations: resolvedConfig.maxGenerations,
      evaluations,
      bestFitness: best.fitness,
    });
  }

  return {
    best,
    generationsEvaluated: resolvedConfig.maxGenerations,
    evaluations,
    seed,
  };
};

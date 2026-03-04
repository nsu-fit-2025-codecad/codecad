import { evaluateNestFitness } from '@/lib/nesting/genetic/fitness';
import { placePartsGreedy } from '@/lib/nesting/placement/place';
import { hashString } from '@/lib/nesting/utils/random';
import {
  cloneChromosome,
  compareEvaluatedChromosomes,
} from '@/lib/nesting/genetic/genetic-operators';
import {
  normalizeRotation,
  normalizeShapeForRotation,
} from '@/lib/nesting/polygon/rotations';
import type {
  EvaluatedChromosome,
  GeneticChromosome,
  GeneticConfig,
} from '@/lib/nesting/genetic/genetic-types';
import type {
  NestConfig,
  NestPart,
  PolygonShape,
} from '@/lib/nesting/polygon/types';

export interface EvaluationContext {
  partById: Map<string, NestPart>;
  rotatedShapeCache: Map<string, PolygonShape>;
  defaultRotation: number;
  bin: PolygonShape;
  config: NestConfig;
}

export const evaluateChromosome = (
  chromosome: GeneticChromosome,
  context: EvaluationContext
): EvaluatedChromosome => {
  const evaluationParts = chromosome.order.map((partId) => {
    const sourcePart = context.partById.get(partId);

    if (!sourcePart) {
      throw new Error(`Chromosome references unknown part "${partId}".`);
    }

    const rotation = normalizeRotation(
      chromosome.rotations[partId] ?? context.defaultRotation
    );
    const shapeCacheKey = `${partId}|${rotation}`;
    const cachedShape = context.rotatedShapeCache.get(shapeCacheKey);
    const shape =
      cachedShape ?? normalizeShapeForRotation(sourcePart.shape, rotation);

    if (!cachedShape) {
      context.rotatedShapeCache.set(shapeCacheKey, shape);
    }

    return {
      ...sourcePart,
      shape,
    };
  });

  const placementResult = placePartsGreedy(
    evaluationParts,
    context.bin,
    context.config,
    {
      preserveInputOrder: true,
    }
  );
  const result = {
    placements: placementResult.placements.map((placement) => ({
      ...placement,
      rotation: normalizeRotation(
        (chromosome.rotations[placement.id] ?? context.defaultRotation) +
          placement.rotation
      ),
    })),
    notPlacedIds: [...placementResult.notPlacedIds],
  };

  return {
    chromosome: cloneChromosome(chromosome),
    result,
    fitness: evaluateNestFitness(result, 1),
  };
};

export const deriveSeed = (
  parts: NestPart[],
  allowedRotations: number[],
  config: GeneticConfig
) =>
  hashString(
    [
      ...parts.map((part) => part.id).sort(),
      ...allowedRotations.map((rotation) => rotation.toFixed(6)),
      config.populationSize,
      config.maxGenerations,
      config.mutationRate.toFixed(6),
      config.crossoverRate.toFixed(6),
      config.eliteCount,
    ].join('|')
  ) || 1;

export const findBestEvaluatedChromosome = (
  population: EvaluatedChromosome[]
) => [...population].sort(compareEvaluatedChromosomes)[0];

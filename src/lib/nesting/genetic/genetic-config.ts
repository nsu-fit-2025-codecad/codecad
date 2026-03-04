import { clamp, finiteOrDefault } from '@/lib/nesting/utils/math';
import type { GeneticConfig } from '@/lib/nesting/genetic/genetic-types';

export const DEFAULT_GENETIC_CONFIG: GeneticConfig = {
  populationSize: 8,
  maxGenerations: 2,
  mutationRate: 0.2,
  crossoverRate: 0.85,
  eliteCount: 2,
};

export const resolveGeneticConfig = (
  input: Partial<GeneticConfig> = {}
): GeneticConfig => {
  const populationSize = clamp(
    Math.round(
      finiteOrDefault(
        input.populationSize,
        DEFAULT_GENETIC_CONFIG.populationSize
      )
    ),
    2,
    200
  );
  const maxGenerations = clamp(
    Math.round(
      finiteOrDefault(
        input.maxGenerations,
        DEFAULT_GENETIC_CONFIG.maxGenerations
      )
    ),
    1,
    500
  );

  return {
    populationSize,
    maxGenerations,
    mutationRate: clamp(
      finiteOrDefault(input.mutationRate, DEFAULT_GENETIC_CONFIG.mutationRate),
      0,
      1
    ),
    crossoverRate: clamp(
      finiteOrDefault(
        input.crossoverRate,
        DEFAULT_GENETIC_CONFIG.crossoverRate
      ),
      0,
      1
    ),
    eliteCount: clamp(
      Math.round(
        finiteOrDefault(input.eliteCount, DEFAULT_GENETIC_CONFIG.eliteCount)
      ),
      1,
      populationSize
    ),
    seed:
      typeof input.seed === 'number' && Number.isFinite(input.seed)
        ? Math.round(input.seed)
        : undefined,
  };
};

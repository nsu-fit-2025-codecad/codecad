import type { FitnessScore } from '@/lib/nesting/fitness';
import type { NestResult } from '@/lib/nesting/types';

export interface GeneticChromosome {
  order: string[];
  rotations: Record<string, number>;
}

export interface GeneticConfig {
  populationSize: number;
  maxGenerations: number;
  mutationRate: number;
  crossoverRate: number;
  eliteCount: number;
  seed?: number;
}

export interface EvaluatedChromosome {
  chromosome: GeneticChromosome;
  result: NestResult;
  fitness: FitnessScore;
}

export interface GeneticRunResult {
  best: EvaluatedChromosome;
  generationsEvaluated: number;
  evaluations: number;
  seed: number;
}

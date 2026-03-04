import type { FitnessScore } from '@/lib/nesting/genetic/fitness';
import type { NestResult } from '@/lib/nesting/polygon/types';

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

export interface GeneticProgressSnapshot {
  generation: number;
  totalGenerations: number;
  evaluations: number;
  bestFitness: FitnessScore;
  bestImproved?: boolean;
  bestResult?: NestResult;
}

export interface GeneticSearchCallbacks {
  onProgress?: (snapshot: GeneticProgressSnapshot) => void;
}

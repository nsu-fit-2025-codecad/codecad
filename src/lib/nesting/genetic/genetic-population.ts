import {
  buildAreaOrderedIds,
  cloneChromosome,
} from '@/lib/nesting/genetic/genetic-operators';
import { normalizeRotation } from '@/lib/nesting/polygon/rotations';
import { randomInt } from '@/lib/nesting/utils/random';
import type {
  EvaluatedChromosome,
  GeneticChromosome,
  GeneticConfig,
} from '@/lib/nesting/genetic/genetic-types';
import type { NestPart } from '@/lib/nesting/polygon/types';

const shuffle = <T>(items: T[], random: () => number): T[] => {
  const shuffled = [...items];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1, random);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
};

const defaultChromosome = (
  parts: NestPart[],
  allowedRotations: number[]
): GeneticChromosome => {
  const order = buildAreaOrderedIds(parts);
  const defaultRotation = allowedRotations[0];
  const rotations = Object.fromEntries(
    order.map((id) => [id, normalizeRotation(defaultRotation)])
  );

  return { order, rotations };
};

const randomChromosome = (
  partIds: string[],
  allowedRotations: number[],
  random: () => number
): GeneticChromosome => {
  const order = shuffle(partIds, random);
  const rotations = Object.fromEntries(
    order.map((id) => [
      id,
      allowedRotations[randomInt(allowedRotations.length, random)],
    ])
  );

  return { order, rotations };
};

export const createInitialPopulation = (
  parts: NestPart[],
  config: GeneticConfig,
  allowedRotations: number[],
  random: () => number
) => {
  const partIds = parts.map((part) => part.id);
  const population: GeneticChromosome[] = [
    defaultChromosome(parts, allowedRotations),
  ];

  while (population.length < config.populationSize) {
    population.push(randomChromosome(partIds, allowedRotations, random));
  }

  return population;
};

export const selectWeighted = (
  population: EvaluatedChromosome[],
  random: () => number
): EvaluatedChromosome => {
  if (population.length === 1) {
    return population[0];
  }

  const totalWeight = (population.length * (population.length + 1)) / 2;
  let threshold = random() * totalWeight;

  for (let index = 0; index < population.length; index += 1) {
    threshold -= population.length - index;

    if (threshold <= 0) {
      return population[index];
    }
  }

  return population[population.length - 1];
};

export const clonePopulation = (population: EvaluatedChromosome[]) =>
  population.map((candidate) => cloneChromosome(candidate.chromosome));

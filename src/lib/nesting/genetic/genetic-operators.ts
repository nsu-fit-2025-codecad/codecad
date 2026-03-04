import {
  normalizeRotation,
  normalizeRotations,
} from '@/lib/nesting/polygon/rotations';
import { randomInt } from '@/lib/nesting/utils/random';
import type {
  EvaluatedChromosome,
  GeneticChromosome,
} from '@/lib/nesting/genetic/genetic-types';
import { NESTING_EPSILON, type NestPart } from '@/lib/nesting/polygon/types';
import { compareFitness } from '@/lib/nesting/genetic/fitness';

export const cloneChromosome = (
  chromosome: GeneticChromosome
): GeneticChromosome => ({
  order: [...chromosome.order],
  rotations: { ...chromosome.rotations },
});

export const chromosomeKey = (chromosome: GeneticChromosome) => {
  const orderKey = chromosome.order.join(',');
  const rotationKey = chromosome.order
    .map((id) => `${id}:${normalizeRotation(chromosome.rotations[id] ?? 0)}`)
    .join(',');

  return `${orderKey}|${rotationKey}`;
};

export const compareEvaluatedChromosomes = (
  left: EvaluatedChromosome,
  right: EvaluatedChromosome
) => {
  const fitnessDiff = compareFitness(left.fitness, right.fitness);

  if (fitnessDiff !== 0) {
    return fitnessDiff;
  }

  return chromosomeKey(left.chromosome).localeCompare(
    chromosomeKey(right.chromosome)
  );
};

export const buildAreaOrderedIds = (parts: NestPart[]) =>
  [...parts]
    .sort((left, right) => {
      const areaDiff = right.shape.area - left.shape.area;

      if (Math.abs(areaDiff) > NESTING_EPSILON) {
        return areaDiff;
      }

      return left.id.localeCompare(right.id);
    })
    .map((part) => part.id);

export const crossoverChromosomes = (
  left: GeneticChromosome,
  right: GeneticChromosome,
  random: () => number
): GeneticChromosome => {
  if (left.order.length !== right.order.length) {
    throw new Error('Cannot crossover chromosomes with different lengths.');
  }

  const size = left.order.length;

  if (size === 0) {
    return { order: [], rotations: {} };
  }

  if (size === 1) {
    return cloneChromosome(left);
  }

  let start = randomInt(size, random);
  let end = randomInt(size, random);

  if (start > end) {
    [start, end] = [end, start];
  }

  const childOrder = new Array<string>(size);
  const lockedIds = new Set<string>();

  for (let i = start; i <= end; i += 1) {
    childOrder[i] = left.order[i];
    lockedIds.add(left.order[i]);
  }

  let rightIndex = 0;

  for (let i = 0; i < size; i += 1) {
    if (childOrder[i]) {
      continue;
    }

    while (lockedIds.has(right.order[rightIndex])) {
      rightIndex += 1;
    }

    childOrder[i] = right.order[rightIndex];
    rightIndex += 1;
  }

  const rotations: Record<string, number> = {};

  childOrder.forEach((id) => {
    const fromLeft = left.rotations[id];
    const fromRight = right.rotations[id];
    rotations[id] = normalizeRotation(
      random() < 0.5
        ? (fromLeft ?? fromRight ?? 0)
        : (fromRight ?? fromLeft ?? 0)
    );
  });

  return {
    order: childOrder,
    rotations,
  };
};

export const mutateChromosome = (
  chromosome: GeneticChromosome,
  allowedRotations: number[],
  mutationRate: number,
  random: () => number
): GeneticChromosome => {
  const normalizedRotations = normalizeRotations(allowedRotations);
  const next = cloneChromosome(chromosome);

  if (next.order.length > 1 && random() < mutationRate) {
    const firstIndex = randomInt(next.order.length, random);
    let secondIndex = randomInt(next.order.length - 1, random);

    if (secondIndex >= firstIndex) {
      secondIndex += 1;
    }

    [next.order[firstIndex], next.order[secondIndex]] = [
      next.order[secondIndex],
      next.order[firstIndex],
    ];
  }

  if (next.order.length > 0 && random() < mutationRate) {
    const targetId = next.order[randomInt(next.order.length, random)];
    const currentRotation = normalizeRotation(next.rotations[targetId] ?? 0);
    const alternatives = normalizedRotations.filter(
      (rotation) => Math.abs(rotation - currentRotation) > NESTING_EPSILON
    );

    if (alternatives.length > 0) {
      next.rotations[targetId] =
        alternatives[randomInt(alternatives.length, random)];
    } else if (normalizedRotations.length > 0) {
      next.rotations[targetId] = normalizedRotations[0];
    }
  }

  next.order.forEach((id) => {
    if (next.rotations[id] === undefined) {
      next.rotations[id] = normalizedRotations[0] ?? 0;
    }
  });

  return next;
};

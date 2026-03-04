import { describe, expect, it } from 'vitest';
import makerjs from 'makerjs';
import {
  compareFitness,
  evaluateNestFitness,
} from '@/lib/nesting/genetic/fitness';
import {
  DEFAULT_GENETIC_CONFIG,
  crossoverChromosomes,
  mutateChromosome,
  resolveGeneticConfig,
  runGeneticSearch,
} from '@/lib/nesting/genetic/genetic';
import { normalizeShape } from '@/lib/nesting/polygon/polygon-cleanup';
import {
  createShape,
  shapeBounds,
  translateShape,
} from '@/lib/nesting/polygon/polygon-math';
import { placePartsGreedy } from '@/lib/nesting/placement/place';
import type { GeneticChromosome } from '@/lib/nesting/genetic/genetic-types';
import type {
  NestPart,
  NestResult,
  PolygonShape,
} from '@/lib/nesting/polygon/types';

const rectangleShape = (width: number, height: number): PolygonShape =>
  normalizeShape(
    createShape([
      [
        { x: 0, y: 0 },
        { x: width, y: 0 },
        { x: width, y: height },
        { x: 0, y: height },
      ],
    ])
  );

const rectanglePart = (
  id: string,
  width: number,
  height: number
): NestPart => ({
  id,
  sourceModel: new makerjs.models.Rectangle(width, height),
  shape: rectangleShape(width, height),
});

const sequenceRandom = (values: number[]) => {
  let index = 0;
  return () => {
    const value = values[index] ?? values[values.length - 1] ?? 0;
    index += 1;
    return value;
  };
};

const sortedIds = (ids: string[]) =>
  [...ids].sort((left, right) => left.localeCompare(right));

const compactness = (result: NestResult) => {
  if (result.placements.length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  const bounds = shapeBounds(
    result.placements.flatMap((placement) => placement.shape.contours)
  );
  return bounds.width * bounds.height;
};

describe('genetic operators', () => {
  it('mutation preserves order and rotation invariants', () => {
    const chromosome: GeneticChromosome = {
      order: ['a', 'b', 'c', 'd'],
      rotations: {
        a: 0,
        b: 90,
        c: 0,
        d: 90,
      },
    };

    const mutated = mutateChromosome(
      chromosome,
      [0, 90],
      1,
      sequenceRandom([0, 0, 0.75, 0, 0.25, 0])
    );

    expect(sortedIds(mutated.order)).toEqual(sortedIds(chromosome.order));
    mutated.order.forEach((id) => {
      expect([0, 90]).toContain(mutated.rotations[id]);
    });
  });

  it('crossover preserves a valid permutation and inherited rotations', () => {
    const left: GeneticChromosome = {
      order: ['a', 'b', 'c', 'd'],
      rotations: {
        a: 0,
        b: 90,
        c: 0,
        d: 90,
      },
    };
    const right: GeneticChromosome = {
      order: ['c', 'a', 'd', 'b'],
      rotations: {
        a: 90,
        b: 0,
        c: 90,
        d: 0,
      },
    };

    const child = crossoverChromosomes(
      left,
      right,
      sequenceRandom([0.25, 0.5, 0, 1, 0, 1, 0, 1])
    );

    expect(sortedIds(child.order)).toEqual(sortedIds(left.order));
    child.order.forEach((id) => {
      expect([left.rotations[id], right.rotations[id]]).toContain(
        child.rotations[id]
      );
    });
  });
});

describe('fitness evaluation', () => {
  it('is stable for equivalent placement sets', () => {
    const firstShape = rectangleShape(40, 20);
    const secondShape = translateShape(rectangleShape(10, 10), 40, 0);
    const first: NestResult = {
      placements: [
        { id: 'a', x: 0, y: 0, rotation: 0, shape: firstShape },
        { id: 'b', x: 40, y: 0, rotation: 0, shape: secondShape },
      ],
      notPlacedIds: ['c'],
    };
    const second: NestResult = {
      placements: [...first.placements].reverse(),
      notPlacedIds: ['c'],
    };

    const firstFitness = evaluateNestFitness(first, 1);
    const secondFitness = evaluateNestFitness(second, 1);

    expect(firstFitness).toEqual(secondFitness);
    expect(compareFitness(firstFitness, secondFitness)).toBe(0);
  });
});

describe('config hardening', () => {
  it('falls back to safe defaults for malformed numeric options', () => {
    const resolved = resolveGeneticConfig({
      populationSize: Number.NaN,
      maxGenerations: Number.POSITIVE_INFINITY,
      mutationRate: Number.NaN,
      crossoverRate: Number.NEGATIVE_INFINITY,
      eliteCount: Number.NaN,
      seed: Number.POSITIVE_INFINITY,
    });

    expect(resolved.populationSize).toBe(DEFAULT_GENETIC_CONFIG.populationSize);
    expect(resolved.maxGenerations).toBe(DEFAULT_GENETIC_CONFIG.maxGenerations);
    expect(resolved.mutationRate).toBe(DEFAULT_GENETIC_CONFIG.mutationRate);
    expect(resolved.crossoverRate).toBe(DEFAULT_GENETIC_CONFIG.crossoverRate);
    expect(resolved.eliteCount).toBe(DEFAULT_GENETIC_CONFIG.eliteCount);
    expect(resolved.seed).toBeUndefined();
  });

  it('does not throw when malformed numeric options are provided to search', () => {
    const bin = rectangleShape(120, 80);
    const parts = [
      rectanglePart('a', 70, 30),
      rectanglePart('b', 50, 30),
      rectanglePart('c', 20, 20),
    ];
    const config = {
      gap: 0,
      rotations: [0, 90],
      curveTolerance: 1,
      searchStep: 1,
    };

    const run = () =>
      runGeneticSearch(parts, bin, config, {
        populationSize: Number.NaN,
        maxGenerations: 5,
        mutationRate: Number.NEGATIVE_INFINITY,
        crossoverRate: Number.POSITIVE_INFINITY,
        eliteCount: Number.NaN,
        seed: Number.NaN,
      });

    expect(run).not.toThrow();
    const result = run();
    expect(result.evaluations).toBeGreaterThan(0);
    expect(result.best.result).toBeDefined();
  });
});

describe('runGeneticSearch', () => {
  it('strictly improves deterministic placement on a stable non-trivial fixture', () => {
    const bin = rectangleShape(140, 100);
    const concavePart: NestPart = {
      id: 'b',
      sourceModel: new makerjs.models.Rectangle(1, 1),
      shape: normalizeShape(
        createShape([
          [
            { x: 0, y: 0 },
            { x: 75, y: 0 },
            { x: 75, y: 41 },
            { x: 35, y: 41 },
            { x: 35, y: 79 },
            { x: 0, y: 79 },
          ],
        ])
      ),
    };
    const parts = [
      rectanglePart('a', 36, 32),
      concavePart,
      rectanglePart('c', 43, 36),
      rectanglePart('d', 20, 30),
    ];
    const config = {
      gap: 0,
      rotations: [0, 90],
      curveTolerance: 1,
      searchStep: 1,
    };

    const deterministic = placePartsGreedy(parts, bin, config);
    const deterministicFitness = evaluateNestFitness(deterministic, 1);
    const genetic = runGeneticSearch(parts, bin, config, {
      populationSize: 6,
      maxGenerations: 2,
      mutationRate: 0.3,
      crossoverRate: 0.9,
      eliteCount: 2,
      seed: 17,
    });

    expect(
      compareFitness(genetic.best.fitness, deterministicFitness)
    ).toBeLessThan(0);
    expect(genetic.best.fitness.unplacedCount).toBe(
      deterministicFitness.unplacedCount
    );
    expect(compactness(genetic.best.result)).toBeLessThan(
      compactness(deterministic)
    );
  });
});

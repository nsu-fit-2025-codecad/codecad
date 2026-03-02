import { compareFitness, evaluateNestFitness } from '@/lib/nesting/fitness';
import type {
  EvaluatedChromosome,
  GeneticChromosome,
  GeneticSearchCallbacks,
  GeneticConfig,
  GeneticRunResult,
} from '@/lib/nesting/genetic-types';
import { placePartsGreedy } from '@/lib/nesting/place';
import {
  normalizeRotation,
  normalizeRotations,
  normalizeShapeForRotation,
} from '@/lib/nesting/rotations';
import type { NestConfig, NestPart, PolygonShape } from '@/lib/nesting/types';
import { NESTING_EPSILON } from '@/lib/nesting/types';

export const DEFAULT_GENETIC_CONFIG: GeneticConfig = {
  populationSize: 8,
  maxGenerations: 2,
  mutationRate: 0.2,
  crossoverRate: 0.85,
  eliteCount: 2,
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const finiteOrDefault = (value: number | undefined, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const randomInt = (maxExclusive: number, random: () => number) =>
  Math.min(maxExclusive - 1, Math.floor(random() * maxExclusive));

const hashString = (value: string) => {
  let hash = 2166136261;

  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

const cloneChromosome = (chromosome: GeneticChromosome): GeneticChromosome => ({
  order: [...chromosome.order],
  rotations: { ...chromosome.rotations },
});

const chromosomeKey = (chromosome: GeneticChromosome) => {
  const orderKey = chromosome.order.join(',');
  const rotationKey = chromosome.order
    .map((id) => `${id}:${normalizeRotation(chromosome.rotations[id] ?? 0)}`)
    .join(',');

  return `${orderKey}|${rotationKey}`;
};

const compareEvaluatedChromosomes = (
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

const shuffle = <T>(items: T[], random: () => number): T[] => {
  const shuffled = [...items];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1, random);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
};

const buildAreaOrderedIds = (parts: NestPart[]) =>
  [...parts]
    .sort((left, right) => {
      const areaDiff = right.shape.area - left.shape.area;

      if (Math.abs(areaDiff) > NESTING_EPSILON) {
        return areaDiff;
      }

      return left.id.localeCompare(right.id);
    })
    .map((part) => part.id);

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

const createInitialPopulation = (
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

interface EvaluationContext {
  partById: Map<string, NestPart>;
  rotatedShapeCache: Map<string, PolygonShape>;
  defaultRotation: number;
  bin: PolygonShape;
  config: NestConfig;
}

const evaluateChromosome = (
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

const selectWeighted = (
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

export const createSeededRandom = (seed: number): (() => number) => {
  let state = seed >>> 0 || 1;

  return () => {
    state = Math.imul(1664525, state) + 1013904223;
    state >>>= 0;
    return state / 0x1_0000_0000;
  };
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

const deriveSeed = (
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
        chromosome: { order: [], rotations: {} },
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
  let best = [...currentEvaluated].sort(compareEvaluatedChromosomes)[0];

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

    const generationBest = [...currentEvaluated].sort(
      compareEvaluatedChromosomes
    )[0];

    if (!generationBest) {
      continue;
    }

    if (compareEvaluatedChromosomes(generationBest, best) < 0) {
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

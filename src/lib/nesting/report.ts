import { normalizePackingOptions } from '@/lib/nesting/orchestration/options';
import type { NestingRunStats, PackingOptions } from '@/lib/nesting';

export interface NestingRunReportInput {
  targetModelId: string;
  options: PackingOptions;
  packedIds: Iterable<string>;
  notFitIds: Iterable<string>;
  stats: NestingRunStats;
  modelRevision?: number;
  createdAt?: Date;
}

export interface NestingRunReport {
  targetModelId: string;
  options: ReturnType<typeof normalizePackingOptions>;
  packedIds: string[];
  notFitIds: string[];
  stats: NestingRunStats;
  modelRevision?: number;
  createdAt: string;
  text: string;
}

const sortIds = (ids: Iterable<string>) =>
  [...ids].sort((a, b) => a.localeCompare(b));

const formatJson = (value: unknown) => JSON.stringify(value, null, 2);

export const createNestingRunReport = ({
  targetModelId,
  options,
  packedIds,
  notFitIds,
  stats,
  modelRevision,
  createdAt = new Date(),
}: NestingRunReportInput): NestingRunReport => {
  const normalizedOptions = normalizePackingOptions(options);
  const sortedPackedIds = sortIds(packedIds);
  const sortedNotFitIds = sortIds(notFitIds);
  const createdAtIso = createdAt.toISOString();
  const geneticLines =
    stats.algorithm === 'genetic' || stats.evaluations !== undefined
      ? [
          `Genetic seed: ${stats.geneticSeed ?? normalizedOptions.geneticSeed ?? 'n/a'}`,
          `Generations: ${stats.generationsEvaluated ?? 'n/a'}`,
          `Evaluations: ${stats.evaluations ?? 'n/a'}`,
        ]
      : [];
  const text = [
    '# Code CAD Nesting Report',
    '',
    `Created: ${createdAtIso}`,
    `Target model: ${targetModelId}`,
    modelRevision !== undefined ? `Model revision: ${modelRevision}` : null,
    `Algorithm: ${stats.algorithm}`,
    `Placed: ${stats.placedCount}`,
    `Not fit: ${stats.notFitCount}`,
    `Duration: ${stats.durationMs}ms`,
    `Compactness: ${stats.fitness.compactness}`,
    ...geneticLines,
    '',
    `Packed ids: ${sortedPackedIds.length > 0 ? sortedPackedIds.join(', ') : 'none'}`,
    `Not-fit ids: ${sortedNotFitIds.length > 0 ? sortedNotFitIds.join(', ') : 'none'}`,
    '',
    'Normalized options:',
    formatJson(normalizedOptions),
    '',
    'Fitness:',
    formatJson(stats.fitness),
  ]
    .filter((line): line is string => line !== null)
    .join('\n');

  return {
    targetModelId,
    options: normalizedOptions,
    packedIds: sortedPackedIds,
    notFitIds: sortedNotFitIds,
    stats,
    modelRevision,
    createdAt: createdAtIso,
    text,
  };
};

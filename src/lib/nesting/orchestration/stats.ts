import { evaluateNestFitness } from '@/lib/nesting/genetic/fitness';
import type { NestingAlgorithm, NestingRunStats } from '@/lib/nesting';
import type { NestResult } from '@/lib/nesting/polygon/types';
import type { IModelMap } from 'makerjs';

interface BuildNestingStatsInput {
  algorithm: NestingAlgorithm;
  placements: NestResult['placements'];
  didNotFitModels: IModelMap;
  packedModels: IModelMap;
  startedAt: number;
  extras?: Partial<NestingRunStats>;
}

export const buildNestingStats = ({
  algorithm,
  placements,
  didNotFitModels,
  packedModels,
  startedAt,
  extras = {},
}: BuildNestingStatsInput): NestingRunStats => ({
  algorithm,
  placedCount: Object.keys(packedModels).length,
  notFitCount: Object.keys(didNotFitModels).length,
  durationMs: Date.now() - startedAt,
  fitness: evaluateNestFitness(
    {
      placements,
      notPlacedIds: Object.keys(didNotFitModels),
    },
    1
  ),
  ...extras,
});

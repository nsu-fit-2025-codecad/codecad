import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FitnessScore } from '@/lib/nesting/genetic/fitness';
import type { NestResult } from '@/lib/nesting/polygon/types';
import type {
  NormalizedPackingOptions,
  PreparedNestInput,
} from '@/lib/nesting/orchestration/runtime-types';
import { runNestingEngine } from '@/lib/nesting/orchestration/orchestrator';
import { placePartsGreedy } from '@/lib/nesting/placement/place';
import { runGeneticSearch } from '@/lib/nesting/genetic/genetic';
import { applyPlacementToModelMap } from '@/lib/nesting/orchestration/model-assembly';
import { renderModelToSvg } from '@/lib/svg-render';
import { evaluateNestFitness } from '@/lib/nesting/genetic/fitness';
import { decideGeneticExecution } from '@/lib/nesting/orchestration/genetic-policy';

vi.mock('@/lib/nesting/placement/place', () => ({
  placePartsGreedy: vi.fn(),
}));

vi.mock('@/lib/nesting/genetic/genetic', () => ({
  runGeneticSearch: vi.fn(),
}));

vi.mock('@/lib/nesting/orchestration/model-assembly', () => ({
  applyPlacementToModelMap: vi.fn(),
}));

vi.mock('@/lib/svg-render', () => ({
  renderModelToSvg: vi.fn(),
}));

vi.mock('@/lib/nesting/orchestration/genetic-policy', () => ({
  decideGeneticExecution: vi.fn(() => ({
    mode: 'enabled',
    reason: 'eligible',
  })),
}));

vi.mock('@/lib/nesting/genetic/fitness', () => ({
  evaluateNestFitness: vi.fn(),
  compareFitness: vi.fn((left: FitnessScore, right: FitnessScore) => {
    if (left.unplacedCount !== right.unplacedCount) {
      return left.unplacedCount - right.unplacedCount;
    }

    if (left.binsUsed !== right.binsUsed) {
      return left.binsUsed - right.binsUsed;
    }

    if (left.compactness !== right.compactness) {
      return left.compactness < right.compactness ? -1 : 1;
    }

    if (left.height !== right.height) {
      return left.height < right.height ? -1 : 1;
    }

    if (left.width !== right.width) {
      return left.width < right.width ? -1 : 1;
    }

    return 0;
  }),
}));

const createResult = (id: string): NestResult => ({
  placements: [
    {
      id,
      x: 0,
      y: 0,
      rotation: 0,
      shape: {} as NestResult['placements'][number]['shape'],
    },
  ],
  notPlacedIds: [],
});

const preparedInput: PreparedNestInput = {
  nestingArea: {} as PreparedNestInput['nestingArea'],
  nestingShape: {} as PreparedNestInput['nestingShape'],
  nestingExtents: {} as PreparedNestInput['nestingExtents'],
  parts: [{ id: 'part-a' } as PreparedNestInput['parts'][number]],
  invalidModels: {},
  sourceModel: {} as PreparedNestInput['sourceModel'],
  targetModelId: 'target',
};

const normalizedOptions: NormalizedPackingOptions = {
  gap: 0,
  allowRotation: true,
  rotationCount: 4,
  rotations: [0, 90],
  curveTolerance: 1,
  searchStep: 1,
  useGeneticSearch: true,
  populationSize: 8,
  maxGenerations: 4,
  mutationRate: 0.2,
  crossoverRate: 0.85,
  eliteCount: 2,
};

describe('runNestingEngine GA preview behavior', () => {
  beforeEach(() => {
    vi.mocked(decideGeneticExecution).mockReturnValue({
      mode: 'enabled',
      reason: 'eligible',
    });
    vi.mocked(applyPlacementToModelMap).mockImplementation(
      ({ placementResult }) => ({
        packedModels: Object.fromEntries(
          placementResult.placements.map((placement) => [placement.id, {}])
        ),
        didNotFitModels: Object.fromEntries(
          placementResult.notPlacedIds.map((id) => [id, {}])
        ),
      })
    );
    vi.mocked(renderModelToSvg).mockImplementation((model) => {
      const ids = Object.keys(model.models ?? {})
        .sort()
        .join(',');
      return `<svg data-models="${ids}"/>`;
    });
  });

  it('anchors GA preview to best overall result and suppresses unchanged duplicates', () => {
    const deterministicResult = createResult('deterministic');
    const gaWorseResult = createResult('ga-worse');
    const gaBetterResult = createResult('ga-better');
    const deterministicFitness: FitnessScore = {
      unplacedCount: 0,
      binsUsed: 1,
      compactness: 100,
      width: 10,
      height: 10,
    };
    const gaWorseFitness: FitnessScore = {
      unplacedCount: 0,
      binsUsed: 1,
      compactness: 120,
      width: 11,
      height: 11,
    };
    const gaBetterFitness: FitnessScore = {
      unplacedCount: 0,
      binsUsed: 1,
      compactness: 90,
      width: 9,
      height: 10,
    };
    const progressEvents: Array<{
      generation?: number;
      previewPackedIds?: string[];
    }> = [];

    vi.mocked(placePartsGreedy).mockReturnValue(deterministicResult);
    vi.mocked(evaluateNestFitness).mockReturnValue(deterministicFitness);
    vi.mocked(runGeneticSearch).mockImplementation(
      (_parts, _bin, _config, _raw, callbacks) => {
        callbacks?.onProgress?.({
          generation: 0,
          totalGenerations: 4,
          evaluations: 8,
          bestFitness: gaWorseFitness,
          bestImproved: true,
          bestResult: gaWorseResult,
        });
        callbacks?.onProgress?.({
          generation: 1,
          totalGenerations: 4,
          evaluations: 16,
          bestFitness: gaWorseFitness,
          bestImproved: false,
        });
        callbacks?.onProgress?.({
          generation: 2,
          totalGenerations: 4,
          evaluations: 24,
          bestFitness: gaWorseFitness,
          bestImproved: false,
        });
        callbacks?.onProgress?.({
          generation: 3,
          totalGenerations: 4,
          evaluations: 32,
          bestFitness: gaBetterFitness,
          bestImproved: true,
          bestResult: gaBetterResult,
        });
        callbacks?.onProgress?.({
          generation: 4,
          totalGenerations: 4,
          evaluations: 40,
          bestFitness: gaBetterFitness,
          bestImproved: false,
        });

        return {
          best: {
            chromosome: { order: [], rotations: {} },
            result: gaBetterResult,
            fitness: gaBetterFitness,
          },
          generationsEvaluated: 4,
          evaluations: 40,
          seed: 7,
        };
      }
    );

    const engineResult = runNestingEngine(preparedInput, normalizedOptions, {
      onProgress: (progress) => {
        if (progress.phase !== 'genetic') {
          return;
        }

        progressEvents.push({
          generation: progress.generation,
          previewPackedIds: progress.preview?.packedIds,
        });
      },
    });

    const previewEvents = progressEvents.filter((event) =>
      Array.isArray(event.previewPackedIds)
    );

    expect(previewEvents).toHaveLength(1);
    expect(previewEvents[0].previewPackedIds).toEqual(['ga-better']);
    expect(engineResult.algorithm).toBe('genetic');
    expect(engineResult.placementResult.placements[0]?.id).toBe('ga-better');
  });

  it('keeps final selection deterministic when GA fitness is not better', () => {
    const deterministicResult = createResult('deterministic');
    const gaResult = createResult('ga-not-better');
    const deterministicFitness: FitnessScore = {
      unplacedCount: 0,
      binsUsed: 1,
      compactness: 80,
      width: 8,
      height: 10,
    };
    const gaFitness: FitnessScore = {
      unplacedCount: 0,
      binsUsed: 1,
      compactness: 120,
      width: 11,
      height: 11,
    };

    vi.mocked(placePartsGreedy).mockReturnValue(deterministicResult);
    vi.mocked(evaluateNestFitness).mockReturnValue(deterministicFitness);
    vi.mocked(runGeneticSearch).mockImplementation(
      (_parts, _bin, _config, _raw, callbacks) => {
        callbacks?.onProgress?.({
          generation: 0,
          totalGenerations: 2,
          evaluations: 8,
          bestFitness: gaFitness,
          bestImproved: true,
          bestResult: gaResult,
        });

        return {
          best: {
            chromosome: { order: [], rotations: {} },
            result: gaResult,
            fitness: gaFitness,
          },
          generationsEvaluated: 2,
          evaluations: 8,
          seed: 9,
        };
      }
    );

    const engineResult = runNestingEngine(preparedInput, normalizedOptions);

    expect(engineResult.algorithm).toBe('deterministic');
    expect(engineResult.placementResult.placements[0]?.id).toBe(
      'deterministic'
    );
  });
});

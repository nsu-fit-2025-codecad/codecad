import { describe, expect, it } from 'vitest';
import { createNestingRunReport } from '@/lib/nesting/report';
import type { NestingRunStats } from '@/lib/nesting';

const createStats = (
  overrides: Partial<NestingRunStats> = {}
): NestingRunStats => ({
  algorithm: 'deterministic',
  placedCount: 2,
  notFitCount: 1,
  durationMs: 42,
  fitness: {
    unplacedCount: 1,
    binsUsed: 1,
    compactness: 120,
    width: 12,
    height: 10,
  },
  ...overrides,
});

describe('createNestingRunReport', () => {
  it('normalizes options and sorts result ids', () => {
    const report = createNestingRunReport({
      targetModelId: 'stock',
      options: {
        allowRotation: true,
        rotationCount: 4,
        gap: 2,
      },
      packedIds: ['part-b', 'part-a'],
      notFitIds: ['part-c'],
      stats: createStats(),
      createdAt: new Date('2026-05-12T00:00:00.000Z'),
    });

    expect(report.options.rotations).toEqual([0, 90, 180, 270]);
    expect(report.packedIds).toEqual(['part-a', 'part-b']);
    expect(report.text).toContain('Target model: stock');
    expect(report.text).toContain('Packed ids: part-a, part-b');
    expect(report.text).toContain('"gap": 2');
  });

  it('includes genetic seed and evaluation metadata when available', () => {
    const report = createNestingRunReport({
      targetModelId: 'sheet',
      options: {
        useGeneticSearch: true,
        geneticSeed: 17,
      },
      packedIds: ['a'],
      notFitIds: [],
      stats: createStats({
        algorithm: 'genetic',
        generationsEvaluated: 3,
        evaluations: 24,
        geneticSeed: 17,
      }),
      createdAt: new Date('2026-05-12T00:00:00.000Z'),
    });

    expect(report.text).toContain('Algorithm: genetic');
    expect(report.text).toContain('Genetic seed: 17');
    expect(report.text).toContain('Evaluations: 24');
  });
});

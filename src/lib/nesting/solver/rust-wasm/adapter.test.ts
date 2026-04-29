import { describe, expect, it, vi } from 'vitest';
import type {
  NormalizedPackingOptions,
  PreparedNestInput,
} from '@/lib/nesting/orchestration/runtime-types';
import {
  createShape,
  translateShape,
} from '@/lib/nesting/polygon/polygon-math';
import type { NestResult, PolygonShape } from '@/lib/nesting/polygon/types';
import { runSvgNestSearch } from '@/lib/nesting/solver/rust-wasm/adapter';

const rectangleShape = (width: number, height: number): PolygonShape =>
  createShape([
    [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width, y: height },
      { x: 0, y: height },
    ],
  ]);

const options: NormalizedPackingOptions = {
  nestingEngine: 'rust-wasm',
  gap: 0,
  allowRotation: false,
  rotations: [0],
  curveTolerance: 1,
  useGeneticSearch: false,
  populationSize: 24,
  maxGenerations: 1,
  mutationRate: 0.1,
  crossoverRate: 0.85,
  eliteCount: 1,
  wasmSearchMode: 'best-of-n',
  wasmAttempts: 3,
};

const prepared = {} as PreparedNestInput;
const wasmBytes = new ArrayBuffer(0);

const resultWithSecondPartAt = (x: number): NestResult => ({
  placements: [
    { id: 'a', x: 0, y: 0, rotation: 0, shape: rectangleShape(20, 20) },
    {
      id: 'b',
      x,
      y: 0,
      rotation: 0,
      shape: translateShape(rectangleShape(20, 20), x, 0),
    },
  ],
  notPlacedIds: [],
});

describe('SVGnest WASM adapter search', () => {
  it('selects the best result across best-of-n attempts', async () => {
    const runAttempt = vi
      .fn()
      .mockResolvedValueOnce(resultWithSecondPartAt(80))
      .mockResolvedValueOnce(resultWithSecondPartAt(20))
      .mockResolvedValueOnce(resultWithSecondPartAt(50));

    const result = await runSvgNestSearch(
      prepared,
      options,
      wasmBytes,
      {},
      runAttempt
    );

    expect(result.bestAttempt.attempt).toBe(2);
    expect(result.bestAttempt.result).toEqual(resultWithSecondPartAt(20));
    expect(result.totalAttempts).toBe(3);
  });

  it('keeps successful attempts when another attempt fails', async () => {
    const runAttempt = vi
      .fn()
      .mockRejectedValueOnce(new Error('unreachable'))
      .mockResolvedValueOnce(resultWithSecondPartAt(20))
      .mockRejectedValueOnce(new Error('unreachable'));

    const result = await runSvgNestSearch(
      prepared,
      options,
      wasmBytes,
      {},
      runAttempt
    );

    expect(result.bestAttempt.attempt).toBe(2);
    expect(result.bestAttempt.result.notPlacedIds).toEqual([]);
  });

  it('throws a clear error when all attempts fail', async () => {
    const runAttempt = vi.fn().mockRejectedValue(new Error('unreachable'));

    await expect(
      runSvgNestSearch(prepared, options, wasmBytes, {}, runAttempt)
    ).rejects.toThrow('unreachable');
  });
});

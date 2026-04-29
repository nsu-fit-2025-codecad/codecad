import { resolveRotationSelection } from '@/lib/nesting/polygon/rotations';
import { normalizeNumeric } from '@/lib/nesting/utils/math';
import type { PackingOptions } from '@/lib/nesting';
import type { NormalizedPackingOptions } from '@/lib/nesting/orchestration/runtime-types';

export const MAX_WASM_ATTEMPTS = 10000;

export const normalizePackingOptions = (
  options: PackingOptions
): NormalizedPackingOptions => {
  const resolvedRotationSelection = resolveRotationSelection({
    rotationCount: options.rotationCount,
    rotations: options.rotations,
    allowRotation: options.allowRotation ?? true,
  });
  const populationSize = Math.round(
    normalizeNumeric(options.populationSize, 8, 2, 200)
  );
  const wasmSearchMode =
    options.wasmSearchMode === 'single' ? 'single' : 'best-of-n';

  return {
    ...options,
    nestingEngine: options.nestingEngine ?? 'typescript',
    gap: normalizeNumeric(options.gap, 0, 0),
    allowRotation: resolvedRotationSelection.rotations.length > 1,
    rotationCount: resolvedRotationSelection.rotationCount ?? undefined,
    rotations: resolvedRotationSelection.rotations,
    curveTolerance: normalizeNumeric(options.curveTolerance, 1, 1e-6),
    searchStep:
      options.searchStep === undefined
        ? undefined
        : normalizeNumeric(options.searchStep, 1, 1e-6),
    useGeneticSearch: options.useGeneticSearch ?? true,
    populationSize,
    maxGenerations: Math.round(
      normalizeNumeric(options.maxGenerations, 2, 1, 500)
    ),
    mutationRate: normalizeNumeric(options.mutationRate, 0.2, 0, 1),
    crossoverRate: normalizeNumeric(options.crossoverRate, 0.85, 0, 1),
    eliteCount: Math.round(
      normalizeNumeric(options.eliteCount, 2, 1, Math.max(1, populationSize))
    ),
    geneticSeed:
      typeof options.geneticSeed === 'number' &&
      Number.isFinite(options.geneticSeed)
        ? Math.round(options.geneticSeed)
        : undefined,
    wasmSearchMode,
    wasmAttempts: Math.round(
      normalizeNumeric(options.wasmAttempts, 8, 1, MAX_WASM_ATTEMPTS)
    ),
  };
};

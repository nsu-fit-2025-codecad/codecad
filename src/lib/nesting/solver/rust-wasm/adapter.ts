import type { PackingRunCallbacks } from '@/lib/nesting';
import type {
  NormalizedPackingOptions,
  PreparedNestInput,
} from '@/lib/nesting/orchestration/runtime-types';
import {
  compareFitness,
  evaluateNestFitness,
} from '@/lib/nesting/genetic/fitness';
import type { NestResult } from '@/lib/nesting/polygon/types';
import type { AsyncNestingSolverAdapter } from '@/lib/nesting/solver/solver-types';
import { runSvgNest } from '@/lib/nesting/solver/rust-wasm/svgnest-runner';

const WASM_URL = '/nesting/polygon-packer.wasm';

let wasmBytesPromise: Promise<ArrayBuffer> | null = null;

const loadWasmBytes = async () => {
  if (wasmBytesPromise) {
    return wasmBytesPromise;
  }

  wasmBytesPromise = fetch(WASM_URL).then(async (response) => {
    if (!response.ok) {
      throw new Error(
        `Failed to load SVGnest WASM from ${WASM_URL}: ${response.status}`
      );
    }

    return response.arrayBuffer();
  });

  return wasmBytesPromise;
};

interface SvgNestAttemptResult {
  attempt: number;
  result: NestResult;
}

type SvgNestAttemptRunner = (
  prepared: PreparedNestInput,
  options: NormalizedPackingOptions,
  wasmBytes: ArrayBuffer
) => Promise<NestResult>;

export const selectBestSvgNestAttempt = (
  attempts: SvgNestAttemptResult[]
): SvgNestAttemptResult | null => {
  if (attempts.length === 0) {
    return null;
  }

  return attempts.reduce((best, candidate) =>
    compareFitness(
      evaluateNestFitness(candidate.result, 1),
      evaluateNestFitness(best.result, 1)
    ) < 0
      ? candidate
      : best
  );
};

export const runSvgNestSearch = async (
  prepared: PreparedNestInput,
  options: NormalizedPackingOptions,
  wasmBytes: ArrayBuffer,
  callbacks: PackingRunCallbacks,
  runAttempt: SvgNestAttemptRunner = runSvgNest
) => {
  const totalAttempts =
    options.wasmSearchMode === 'best-of-n' ? options.wasmAttempts : 1;
  const successfulAttempts: SvgNestAttemptResult[] = [];
  const failedReasons: string[] = [];

  for (let attempt = 1; attempt <= totalAttempts; attempt += 1) {
    callbacks.onProgress?.({
      phase: 'placing',
      progress: 0.35 + ((attempt - 1) / totalAttempts) * 0.55,
      message:
        totalAttempts > 1
          ? `Running SVGnest WASM attempt ${attempt}/${totalAttempts}`
          : 'Running SVGnest WASM nesting engine',
    });

    try {
      successfulAttempts.push({
        attempt,
        result: await runAttempt(prepared, options, wasmBytes),
      });
    } catch (error) {
      failedReasons.push(
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  const bestAttempt = selectBestSvgNestAttempt(successfulAttempts);

  if (!bestAttempt) {
    throw new Error(failedReasons[0] ?? 'All SVGnest attempts failed.');
  }

  return {
    bestAttempt,
    totalAttempts,
  };
};

export const rustWasmNestingSolver: AsyncNestingSolverAdapter = {
  execute: async (
    prepared: PreparedNestInput,
    options: NormalizedPackingOptions,
    callbacks: PackingRunCallbacks = {}
  ) => {
    callbacks.onProgress?.({
      phase: 'placing',
      progress: 0.35,
      message: 'Running SVGnest WASM nesting engine',
    });

    let searchResult;

    try {
      searchResult = await runSvgNestSearch(
        prepared,
        options,
        await loadWasmBytes(),
        callbacks
      );
    } catch (error) {
      wasmBytesPromise = null;
      const reason = error instanceof Error ? error.message : String(error);

      throw new Error(`Rust/WASM nesting failed. ${reason}`);
    }

    callbacks.onProgress?.({
      phase: 'placing',
      progress: 0.95,
      message: 'SVGnest WASM nesting finished',
    });

    return {
      algorithm: 'deterministic',
      placementResult: searchResult.bestAttempt.result,
      statsExtras: {
        engine: 'rust-wasm',
        wasmSearchMode: options.wasmSearchMode,
        wasmAttempts: searchResult.totalAttempts,
        wasmBestAttempt: searchResult.bestAttempt.attempt,
      },
    };
  },
};

import type { PackingRunCallbacks } from '@/lib/nesting';
import type {
  NormalizedPackingOptions,
  PreparedNestInput,
} from '@/lib/nesting/orchestration/runtime-types';
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

    let placementResult;

    try {
      placementResult = await runSvgNest(
        prepared,
        options,
        await loadWasmBytes()
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
      placementResult,
      statsExtras: {
        engine: 'rust-wasm',
      },
    };
  },
};

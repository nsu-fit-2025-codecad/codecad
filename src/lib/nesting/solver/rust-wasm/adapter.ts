import type { PackingRunCallbacks } from '@/lib/nesting';
import type {
  NormalizedPackingOptions,
  PreparedNestInput,
} from '@/lib/nesting/orchestration/runtime-types';
import type { AsyncNestingSolverAdapter } from '@/lib/nesting/solver/solver-types';
import {
  mapRustWasmOutputToNestResult,
  serializeRustWasmInput,
  type RustWasmNestingOutput,
} from '@/lib/nesting/solver/rust-wasm/serializer';

interface RustWasmModule {
  run_nesting: (inputJson: string) => string;
}

const loadRustWasmModule = async (): Promise<RustWasmModule> => {
  try {
    const modulePath = '/src/lib/nesting/solver/rust-wasm/pkg/nesting_wasm.js';
    const module = (await import(/* @vite-ignore */ modulePath)) as Partial<
      RustWasmModule & { default?: unknown }
    >;

    if (typeof module.run_nesting !== 'function') {
      throw new Error('run_nesting export is missing.');
    }

    return {
      run_nesting: module.run_nesting,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown error';

    throw new Error(
      `Rust/WASM nesting engine is not available. Build the wasm package first. ${reason}`
    );
  }
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
      message: 'Running Rust/WASM nesting engine',
    });

    const wasmModule = await loadRustWasmModule();
    const input = serializeRustWasmInput(prepared, options);
    const output = JSON.parse(
      wasmModule.run_nesting(JSON.stringify(input))
    ) as RustWasmNestingOutput;

    callbacks.onProgress?.({
      phase: 'placing',
      progress: 0.95,
      message: 'Rust/WASM nesting finished',
    });

    return {
      algorithm: 'deterministic',
      placementResult: mapRustWasmOutputToNestResult(prepared, output),
      statsExtras: {
        engine: 'rust-wasm',
      },
    };
  },
};

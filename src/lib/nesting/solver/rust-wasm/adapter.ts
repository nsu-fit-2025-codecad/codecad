import type { PackingRunCallbacks } from '@/lib/nesting';
import type {
  NormalizedPackingOptions,
  PreparedNestInput,
} from '@/lib/nesting/orchestration/runtime-types';
import { placePartsGreedy } from '@/lib/nesting/placement/place';
import {
  isShapeInsideBin,
  overlapsPlacedShapes,
} from '@/lib/nesting/placement/place-validation';
import { translateShape } from '@/lib/nesting/polygon/polygon-math';
import { normalizeShapeForRotation } from '@/lib/nesting/polygon/rotations';
import type { NestResult, PolygonShape } from '@/lib/nesting/polygon/types';
import type { AsyncNestingSolverAdapter } from '@/lib/nesting/solver/solver-types';
import {
  mapRustWasmOutputToNestResult,
  serializeRustWasmInput,
  type RustWasmNestingOutput,
} from '@/lib/nesting/solver/rust-wasm/serializer';

interface RustWasmModule {
  default?: () => Promise<unknown>;
  run_nesting: (inputJson: string) => string;
}

let rustWasmModulePromise: Promise<RustWasmModule> | null = null;

const hasPolygonHoles = (shape: PolygonShape) => shape.contours.length > 1;

const createConfig = (options: NormalizedPackingOptions) => ({
  gap: options.gap,
  rotations: options.rotations,
  curveTolerance: options.curveTolerance,
  searchStep: options.searchStep,
});

const validateRustWasmResult = (
  prepared: PreparedNestInput,
  options: NormalizedPackingOptions,
  result: NestResult
) => {
  if (hasPolygonHoles(prepared.nestingShape)) {
    return 'target holes are not supported by the Rust/WASM strip-packing prototype';
  }

  if (prepared.parts.some((part) => hasPolygonHoles(part.shape))) {
    return 'part holes are not supported by the Rust/WASM strip-packing prototype';
  }

  const partById = new Map(prepared.parts.map((part) => [part.id, part]));
  const seenIds = new Set<string>();
  const placedShapes: PolygonShape[] = [];

  for (const placement of result.placements) {
    const part = partById.get(placement.id);

    if (
      !part ||
      seenIds.has(placement.id) ||
      !Number.isFinite(placement.x) ||
      !Number.isFinite(placement.y) ||
      !Number.isFinite(placement.rotation)
    ) {
      return 'Rust/WASM returned an invalid placement';
    }

    const normalizedShape = normalizeShapeForRotation(
      part.shape,
      placement.rotation
    );
    const placedShape = translateShape(
      normalizedShape,
      placement.x,
      placement.y
    );

    if (!isShapeInsideBin(placedShape, prepared.nestingShape, options.gap)) {
      return 'Rust/WASM placement leaves the target boundary';
    }

    if (overlapsPlacedShapes(placedShape, placedShapes, options.gap)) {
      return 'Rust/WASM placements overlap';
    }

    seenIds.add(placement.id);
    placedShapes.push(placedShape);
  }

  return null;
};

const loadRustWasmModule = async (): Promise<RustWasmModule> => {
  if (rustWasmModulePromise) {
    return rustWasmModulePromise;
  }

  rustWasmModulePromise = loadRustWasmModuleOnce();

  return rustWasmModulePromise;
};

const loadRustWasmModuleOnce = async (): Promise<RustWasmModule> => {
  try {
    const modulePath = '/src/lib/nesting/solver/rust-wasm/pkg/nesting_wasm.js';
    const module = (await import(
      /* @vite-ignore */ modulePath
    )) as Partial<RustWasmModule>;

    if (typeof module.default === 'function') {
      await module.default();
    }

    if (typeof module.run_nesting !== 'function') {
      throw new Error('run_nesting export is missing.');
    }

    return {
      run_nesting: module.run_nesting,
    };
  } catch (error) {
    rustWasmModulePromise = null;
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
    let output: RustWasmNestingOutput;

    try {
      output = JSON.parse(
        wasmModule.run_nesting(JSON.stringify(input))
      ) as RustWasmNestingOutput;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);

      throw new Error(`Rust/WASM nesting failed. ${reason}`);
    }

    callbacks.onProgress?.({
      phase: 'placing',
      progress: 0.95,
      message: 'Rust/WASM nesting finished',
    });

    const placementResult = mapRustWasmOutputToNestResult(prepared, output);
    const fallbackReason = validateRustWasmResult(
      prepared,
      options,
      placementResult
    );

    if (fallbackReason) {
      callbacks.onProgress?.({
        phase: 'placing',
        progress: 0.65,
        message: `Falling back to TypeScript placement: ${fallbackReason}`,
      });

      return {
        algorithm: 'deterministic',
        placementResult: placePartsGreedy(
          prepared.parts,
          prepared.nestingShape,
          createConfig(options)
        ),
        statsExtras: {
          engine: 'rust-wasm',
          wasmFallback: true,
          wasmFallbackReason: fallbackReason,
        },
      };
    }

    return {
      algorithm: 'deterministic',
      placementResult,
      statsExtras: {
        engine: 'rust-wasm',
      },
    };
  },
};

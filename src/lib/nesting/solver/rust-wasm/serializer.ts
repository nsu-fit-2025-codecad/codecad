import type {
  NormalizedPackingOptions,
  PreparedNestInput,
} from '@/lib/nesting/orchestration/runtime-types';
import type { NestResult } from '@/lib/nesting/polygon/types';

export interface RustWasmNestingInput {
  target: PreparedNestInput['nestingShape'];
  parts: PreparedNestInput['parts'];
  options: {
    gap: number;
    rotations: number[];
    curveTolerance: number;
    searchStep?: number;
    seed?: number;
  };
}

export interface RustWasmNestingPlacement {
  id: string;
  x: number;
  y: number;
  rotation: number;
}

export interface RustWasmNestingOutput {
  placements: RustWasmNestingPlacement[];
  notPlacedIds: string[];
}

export const serializeRustWasmInput = (
  prepared: PreparedNestInput,
  options: NormalizedPackingOptions
): RustWasmNestingInput => ({
  target: prepared.nestingShape,
  parts: prepared.parts,
  options: {
    gap: options.gap,
    rotations: options.rotations,
    curveTolerance: options.curveTolerance,
    searchStep: options.searchStep,
    seed: options.geneticSeed,
  },
});

export const mapRustWasmOutputToNestResult = (
  prepared: PreparedNestInput,
  output: RustWasmNestingOutput
): NestResult => ({
  placements: output.placements.flatMap((placement) => {
    const part = prepared.parts.find(
      (candidate) => candidate.id === placement.id
    );

    if (!part) {
      return [];
    }

    return [
      {
        id: placement.id,
        x: placement.x,
        y: placement.y,
        rotation: placement.rotation,
        shape: part.shape,
      },
    ];
  }),
  notPlacedIds: output.notPlacedIds,
});

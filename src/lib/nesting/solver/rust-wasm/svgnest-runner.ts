import type {
  NormalizedPackingOptions,
  PreparedNestInput,
} from '@/lib/nesting/orchestration/runtime-types';
import type { NestResult, PolygonShape } from '@/lib/nesting/polygon/types';
import WasmNesting from '@/lib/nesting/solver/svgnest/wasm-nesting';
import type { NestConfig } from '@/lib/nesting/solver/svgnest/types';

const MAX_SVGNEST_SPACING = 31;
const MAX_SVGNEST_ROTATIONS = 31;
const MAX_SVGNEST_CURVE_TOLERANCE = 1.5;
const DEFAULT_POPULATION_SIZE = 24;
const STAGING_PADDING = 1024;

interface SourceMapEntry {
  partIndex: number;
}

const toPolygon = (
  contour: PolygonShape['contours'][number],
  offsetX = 0,
  offsetY = 0
) =>
  new Float32Array(
    contour.flatMap((point) => [point.x + offsetX, point.y + offsetY])
  );

const getStagingStep = (
  prepared: PreparedNestInput,
  options: NormalizedPackingOptions
) => {
  const partMaxDimension = prepared.parts.reduce(
    (maxDimension, part) =>
      Math.max(maxDimension, part.shape.bounds.width, part.shape.bounds.height),
    0
  );
  const targetMaxDimension = Math.max(
    prepared.nestingShape.bounds.width,
    prepared.nestingShape.bounds.height
  );

  return (
    Math.max(partMaxDimension, targetMaxDimension, options.gap, 1) * 4 +
    STAGING_PADDING
  );
};

const buildSvgNestConfig = (options: NormalizedPackingOptions): NestConfig => ({
  curveTolerance: Math.min(
    Math.max(options.curveTolerance, 0),
    MAX_SVGNEST_CURVE_TOLERANCE
  ),
  spacing: Math.min(Math.max(Math.round(options.gap), 0), MAX_SVGNEST_SPACING),
  rotations: Math.min(
    Math.max(options.rotations.length, 1),
    MAX_SVGNEST_ROTATIONS
  ),
  populationSize: Math.min(
    Math.max(options.populationSize, DEFAULT_POPULATION_SIZE),
    96
  ),
  mutationRate: Math.round(options.mutationRate * 100),
  useHoles: true,
});

const buildPolygons = (
  prepared: PreparedNestInput,
  options: NormalizedPackingOptions
) => {
  const polygons: Float32Array[] = [];
  const sourceMap: SourceMapEntry[] = [];
  const stagingStep = getStagingStep(prepared, options);

  prepared.parts.forEach((part, partIndex) => {
    const stageX = partIndex * stagingStep;

    part.shape.contours.forEach((contour) => {
      sourceMap.push({ partIndex });
      polygons.push(toPolygon(contour, stageX, 0));
    });
  });

  const [targetOuter, ...targetHoles] = prepared.nestingShape.contours;

  if (!targetOuter) {
    throw new Error('Target has no outer contour.');
  }

  polygons.push(toPolygon(targetOuter));
  targetHoles.forEach((hole) => {
    polygons.push(toPolygon(hole));
  });

  return {
    binHoleCount: targetHoles.length,
    polygons,
    sourceMap,
  };
};

const decodeFirstBinPlacement = (
  prepared: PreparedNestInput,
  result: ReturnType<WasmNesting['nest']>,
  sourceMap: SourceMapEntry[]
): NestResult => {
  const placedPartIndexes = new Set<number>();
  const placements: NestResult['placements'] = [];

  if (result.hasResult && result.placementCount > 0) {
    result.bindPlacement(0);

    for (let index = 0; index < result.size; index += 1) {
      const sourceIndex = result.bindData(index);
      const mapped = sourceMap[sourceIndex];

      if (!mapped || placedPartIndexes.has(mapped.partIndex)) {
        continue;
      }

      const part = prepared.parts[mapped.partIndex];
      placedPartIndexes.add(mapped.partIndex);
      placements.push({
        id: part.id,
        x: result.x,
        y: result.y,
        rotation: result.rotation,
        shape: part.shape,
      });
    }
  }

  return {
    placements,
    notPlacedIds: prepared.parts
      .filter((_, index) => !placedPartIndexes.has(index))
      .map((part) => part.id),
  };
};

export const runSvgNest = async (
  prepared: PreparedNestInput,
  options: NormalizedPackingOptions,
  wasmBytes: ArrayBuffer
): Promise<NestResult> => {
  const wasmNesting = new WasmNesting();
  await wasmNesting.initBuffer(wasmBytes);

  const { binHoleCount, polygons, sourceMap } = buildPolygons(
    prepared,
    options
  );

  wasmNesting.initWithBinHoles(
    buildSvgNestConfig(options),
    polygons,
    binHoleCount
  );

  try {
    return decodeFirstBinPlacement(prepared, wasmNesting.nest(), sourceMap);
  } finally {
    wasmNesting.stop();
  }
};

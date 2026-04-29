import type {
  NormalizedPackingOptions,
  PreparedNestInput,
} from '@/lib/nesting/orchestration/runtime-types';
import { holeInteriorAnchors } from '@/lib/nesting/placement/place-hole-candidates';
import type { PlacedPartState } from '@/lib/nesting/placement/place-types';
import {
  createCandidateBounds,
  isCandidateWithinBounds,
  isShapeInsideBin,
  overlapsPlacedShapes,
} from '@/lib/nesting/placement/place-validation';
import { extractHoleRegions } from '@/lib/nesting/polygon/hole-regions';
import {
  polygonArea,
  translateShape,
} from '@/lib/nesting/polygon/polygon-math';
import {
  normalizeRotations,
  normalizeShapeForRotation,
} from '@/lib/nesting/polygon/rotations';
import type {
  Contour,
  NestResult,
  PolygonShape,
} from '@/lib/nesting/polygon/types';
import WasmNesting from '@/lib/nesting/solver/svgnest/wasm-nesting';
import type { NestConfig } from '@/lib/nesting/solver/svgnest/types';

const MAX_SVGNEST_SPACING = 31;
const MAX_SVGNEST_ROTATIONS = 31;
const MAX_SVGNEST_CURVE_TOLERANCE = 1.5;
const MAX_SVGNEST_CONTOUR_POINTS = 28;
const DEFAULT_POPULATION_SIZE = 24;
const STAGING_PADDING = 1024;
const PAIR_CHUNK_SIZE = 1;

interface SourceMapEntry {
  partIndex: number;
  isRoot: boolean;
}

const toPolygon = (
  contour: PolygonShape['contours'][number],
  offsetX = 0,
  offsetY = 0
) =>
  new Float32Array(
    simplifyContourForSvgNest(contour).flatMap((point) => [
      point.x + offsetX,
      point.y + offsetY,
    ])
  );

const simplifyContourForSvgNest = (contour: Contour): Contour => {
  if (contour.length <= MAX_SVGNEST_CONTOUR_POINTS) {
    return contour;
  }

  const step = Math.ceil(contour.length / MAX_SVGNEST_CONTOUR_POINTS);
  const keepIndices = new Set<number>();

  for (let index = 0; index < contour.length; index += step) {
    keepIndices.add(index);
  }

  let minXIndex = 0;
  let maxXIndex = 0;
  let minYIndex = 0;
  let maxYIndex = 0;

  contour.forEach((point, index) => {
    if (point.x < contour[minXIndex].x) {
      minXIndex = index;
    }

    if (point.x > contour[maxXIndex].x) {
      maxXIndex = index;
    }

    if (point.y < contour[minYIndex].y) {
      minYIndex = index;
    }

    if (point.y > contour[maxYIndex].y) {
      maxYIndex = index;
    }
  });

  keepIndices.add(minXIndex);
  keepIndices.add(maxXIndex);
  keepIndices.add(minYIndex);
  keepIndices.add(maxYIndex);

  const simplified = [...keepIndices]
    .sort((a, b) => a - b)
    .map((index) => contour[index]);

  if (
    simplified.length >= 3 &&
    Math.sign(polygonArea(simplified)) !== Math.sign(polygonArea(contour))
  ) {
    return [...simplified].reverse();
  }

  return simplified;
};

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

export const buildSvgNestPolygons = (
  prepared: PreparedNestInput,
  options: NormalizedPackingOptions
) => {
  const polygons: Float32Array[] = [];
  const sourceMap: SourceMapEntry[] = [];
  const stagingStep = getStagingStep(prepared, options);
  const stagedPartHoles: Array<{
    contour: Contour;
    partIndex: number;
    stageX: number;
  }> = [];

  // SVGnest uses root source ids as indexes into its root node array, so keep
  // all placeable roots densely ordered before appending child hole contours.
  prepared.parts.forEach((part, partIndex) => {
    const stageX = partIndex * stagingStep;
    const [outerContour, ...holeContours] = part.shape.contours;

    if (!outerContour) {
      return;
    }

    sourceMap.push({
      partIndex,
      isRoot: true,
    });
    polygons.push(toPolygon(outerContour, stageX, 0));

    holeContours.forEach((contour) => {
      stagedPartHoles.push({
        contour,
        partIndex,
        stageX,
      });
    });
  });

  stagedPartHoles.forEach(({ contour, partIndex, stageX }) => {
    sourceMap.push({
      partIndex,
      isRoot: false,
    });
    polygons.push(toPolygon(contour, stageX, 0));
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

      if (
        !mapped ||
        !mapped.isRoot ||
        placedPartIndexes.has(mapped.partIndex)
      ) {
        continue;
      }

      const part = prepared.parts[mapped.partIndex];
      const normalizedShape = normalizeShapeForRotation(
        part.shape,
        result.rotation
      );
      placedPartIndexes.add(mapped.partIndex);
      placements.push({
        id: part.id,
        x: result.x,
        y: result.y,
        rotation: result.rotation,
        shape: translateShape(normalizedShape, result.x, result.y),
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

const buildPlacedPartState = (
  prepared: PreparedNestInput,
  placement: NestResult['placements'][number]
): PlacedPartState | null => {
  const part = prepared.parts.find(
    (candidate) => candidate.id === placement.id
  );

  if (!part) {
    return null;
  }

  const normalizedShape = normalizeShapeForRotation(
    part.shape,
    placement.rotation
  );
  const shape = translateShape(normalizedShape, placement.x, placement.y);

  return {
    id: part.id,
    x: placement.x,
    y: placement.y,
    rotation: placement.rotation,
    normalizedShape,
    holeRegions: extractHoleRegions(normalizedShape),
    shape,
  };
};

const fillPlacedHoles = (
  prepared: PreparedNestInput,
  options: NormalizedPackingOptions,
  result: NestResult
): NestResult => {
  const partById = new Map(prepared.parts.map((part) => [part.id, part]));
  const placements = [...result.placements];
  const placedParts = placements
    .map((placement) => buildPlacedPartState(prepared, placement))
    .filter((state): state is PlacedPartState => state !== null);
  const rotations = normalizeRotations(options.rotations);
  const buildBinAnchorPoints = (shape: PolygonShape) => {
    const minX =
      prepared.nestingShape.bounds.minX - shape.bounds.minX + options.gap;
    const minY =
      prepared.nestingShape.bounds.minY - shape.bounds.minY + options.gap;
    const maxX =
      prepared.nestingShape.bounds.maxX - shape.bounds.maxX - options.gap;
    const maxY =
      prepared.nestingShape.bounds.maxY - shape.bounds.maxY - options.gap;

    if (maxX < minX || maxY < minY) {
      return [];
    }

    return [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: minX, y: maxY },
      { x: maxX, y: maxY },
    ];
  };
  const movePlacedIntoAvailableHoles = () => {
    for (let index = placedParts.length - 1; index >= 0; index -= 1) {
      const movingPart = placedParts[index];
      const movingPlacement = placements[index];
      const otherPlacedParts = placedParts.filter(
        (_, other) => other !== index
      );
      const otherPlacedShapes = otherPlacedParts.map(
        (placedPart) => placedPart.shape
      );
      let moved = false;

      for (const targetPart of otherPlacedParts) {
        if (moved) {
          break;
        }

        for (const holeRegion of targetPart.holeRegions) {
          if (moved) {
            break;
          }

          const candidatePoints = holeInteriorAnchors(
            holeRegion.shape,
            movingPart.normalizedShape,
            options.gap,
            targetPart.x,
            targetPart.y
          );

          for (const point of candidatePoints) {
            const candidateShape = translateShape(
              movingPart.normalizedShape,
              point.x,
              point.y
            );

            if (
              !isShapeInsideBin(
                candidateShape,
                prepared.nestingShape,
                options.gap
              )
            ) {
              continue;
            }

            if (
              overlapsPlacedShapes(
                candidateShape,
                otherPlacedShapes,
                options.gap
              )
            ) {
              continue;
            }

            movingPlacement.x = point.x;
            movingPlacement.y = point.y;
            movingPlacement.shape = candidateShape;
            movingPart.x = point.x;
            movingPart.y = point.y;
            movingPart.shape = candidateShape;
            moved = true;
            break;
          }
        }
      }
    }
  };

  movePlacedIntoAvailableHoles();

  if (result.notPlacedIds.length === 0) {
    return {
      placements,
      notPlacedIds: [],
    };
  }

  const stillNotPlaced: string[] = [];

  result.notPlacedIds.forEach((partId) => {
    const part = partById.get(partId);

    if (!part) {
      return;
    }

    let placed = false;

    for (const rotation of rotations) {
      if (placed) {
        break;
      }

      const normalizedShape = normalizeShapeForRotation(part.shape, rotation);
      const candidateBounds = createCandidateBounds(
        prepared.nestingShape,
        normalizedShape
      );
      const placedShapes = placedParts.map((placedPart) => placedPart.shape);
      const candidatePoints = [
        ...buildBinAnchorPoints(normalizedShape),
        ...placedParts.flatMap((placedPart) =>
          placedPart.holeRegions.flatMap((holeRegion) =>
            holeInteriorAnchors(
              holeRegion.shape,
              normalizedShape,
              options.gap,
              placedPart.x,
              placedPart.y
            )
          )
        ),
      ];
      const movingHoleRegions = extractHoleRegions(normalizedShape);

      movingHoleRegions.forEach((holeRegion) => {
        placedParts.forEach((placedPart) => {
          holeInteriorAnchors(
            holeRegion.shape,
            placedPart.normalizedShape,
            options.gap,
            0,
            0
          ).forEach((relativePlacedOrigin) => {
            candidatePoints.push({
              x: placedPart.x - relativePlacedOrigin.x,
              y: placedPart.y - relativePlacedOrigin.y,
            });
          });
        });
      });

      for (const point of candidatePoints) {
        if (!isCandidateWithinBounds(point, candidateBounds)) {
          continue;
        }

        const candidateShape = translateShape(
          normalizedShape,
          point.x,
          point.y
        );

        if (
          !isShapeInsideBin(candidateShape, prepared.nestingShape, options.gap)
        ) {
          continue;
        }

        if (overlapsPlacedShapes(candidateShape, placedShapes, options.gap)) {
          continue;
        }

        placements.push({
          id: part.id,
          x: point.x,
          y: point.y,
          rotation,
          shape: candidateShape,
        });
        placedParts.push({
          id: part.id,
          x: point.x,
          y: point.y,
          rotation,
          normalizedShape,
          holeRegions: extractHoleRegions(normalizedShape),
          shape: candidateShape,
        });
        placed = true;
        movePlacedIntoAvailableHoles();
        break;
      }
    }

    if (!placed) {
      stillNotPlaced.push(part.id);
    }
  });

  return {
    placements,
    notPlacedIds: stillNotPlaced,
  };
};

const validatePlacements = (
  prepared: PreparedNestInput,
  options: NormalizedPackingOptions,
  result: NestResult
): NestResult => {
  const partById = new Map(prepared.parts.map((part) => [part.id, part]));
  const placements: NestResult['placements'] = [];
  const placedShapes: PolygonShape[] = [];
  const notPlacedIds = new Set(result.notPlacedIds);

  result.placements.forEach((placement) => {
    const part = partById.get(placement.id);

    if (!part) {
      return;
    }

    const normalizedShape = normalizeShapeForRotation(
      part.shape,
      placement.rotation
    );
    const candidateShape = translateShape(
      normalizedShape,
      placement.x,
      placement.y
    );

    if (
      !isShapeInsideBin(candidateShape, prepared.nestingShape, 0) ||
      overlapsPlacedShapes(candidateShape, placedShapes, options.gap)
    ) {
      notPlacedIds.add(part.id);
      return;
    }

    placements.push({
      ...placement,
      shape: candidateShape,
    });
    placedShapes.push(candidateShape);
  });

  return {
    placements,
    notPlacedIds: prepared.parts
      .map((part) => part.id)
      .filter(
        (partId) =>
          notPlacedIds.has(partId) ||
          !placements.some((placement) => placement.id === partId)
      ),
  };
};

export const runSvgNestRaw = async (
  prepared: PreparedNestInput,
  options: NormalizedPackingOptions,
  wasmBytes: ArrayBuffer
): Promise<NestResult> => {
  const wasmNesting = new WasmNesting();
  await wasmNesting.initBuffer(wasmBytes);

  const { binHoleCount, polygons, sourceMap } = buildSvgNestPolygons(
    prepared,
    options
  );

  wasmNesting.initWithBinHoles(
    buildSvgNestConfig(options),
    polygons,
    binHoleCount
  );

  try {
    const generatedNfps = wasmNesting
      .getPairs(PAIR_CHUNK_SIZE)
      .flatMap((pair) => {
        try {
          const nfp = wasmNesting.calculate(pair);
          return nfp.length > 0 ? [nfp.buffer as ArrayBuffer] : [];
        } catch {
          return [];
        }
      });

    if (generatedNfps.length === 0) {
      return {
        placements: [],
        notPlacedIds: prepared.parts.map((part) => part.id),
      };
    }

    const placementData = wasmNesting.getPlacementData(generatedNfps);
    const placementResult = wasmNesting.calculate(placementData);

    if (placementResult.length === 0) {
      return {
        placements: [],
        notPlacedIds: prepared.parts.map((part) => part.id),
      };
    }

    return validatePlacements(
      prepared,
      options,
      decodeFirstBinPlacement(
        prepared,
        wasmNesting.getPlacementResult([placementResult.buffer as ArrayBuffer]),
        sourceMap
      )
    );
  } finally {
    wasmNesting.stop();
  }
};

export const runSvgNest = async (
  prepared: PreparedNestInput,
  options: NormalizedPackingOptions,
  wasmBytes: ArrayBuffer
): Promise<NestResult> =>
  fillPlacedHoles(
    prepared,
    options,
    await runSvgNestRaw(prepared, options, wasmBytes)
  );

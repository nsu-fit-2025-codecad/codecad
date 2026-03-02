import {
  isShapeInsideBin,
  polygonsOverlap,
} from '@/lib/nesting/polygon-boolean';
import { rotateShape, translateShape } from '@/lib/nesting/polygon-math';
import type {
  NestConfig,
  NestPart,
  NestPlacement,
  NestResult,
  PolygonShape,
} from '@/lib/nesting/types';
import { NESTING_EPSILON } from '@/lib/nesting/types';

interface PlacementCandidate {
  placement: NestPlacement;
  y: number;
  x: number;
  rotationIndex: number;
}

const normalizeRotation = (rotation: number): number => {
  const mod = rotation % 360;
  return mod >= 0 ? mod : mod + 360;
};

const normalizedRotations = (rotations: number[]): number[] => {
  const fallback = [0];

  if (rotations.length === 0) {
    return fallback;
  }

  return Array.from(new Set(rotations.map(normalizeRotation))).sort(
    (a, b) => a - b
  );
};

const normalizeShapeForRotation = (
  shape: PolygonShape,
  rotation: number
): PolygonShape => {
  const rotatedShape = rotateShape(shape, rotation);

  return translateShape(
    rotatedShape,
    -rotatedShape.bounds.minX,
    -rotatedShape.bounds.minY
  );
};

const axisValues = (min: number, max: number, step: number): number[] => {
  if (max < min - NESTING_EPSILON) {
    return [];
  }

  const values: number[] = [];
  const count = Math.floor((max - min) / step + NESTING_EPSILON);

  for (let i = 0; i <= count; i += 1) {
    values.push(min + i * step);
  }

  if (
    values.length === 0 ||
    Math.abs(values[values.length - 1] - max) > NESTING_EPSILON
  ) {
    values.push(max);
  }

  return values;
};

const isBetterCandidate = (
  candidate: PlacementCandidate,
  best: PlacementCandidate | null
) => {
  if (!best) {
    return true;
  }

  if (candidate.y < best.y - NESTING_EPSILON) {
    return true;
  }

  if (Math.abs(candidate.y - best.y) <= NESTING_EPSILON) {
    if (candidate.x < best.x - NESTING_EPSILON) {
      return true;
    }

    if (
      Math.abs(candidate.x - best.x) <= NESTING_EPSILON &&
      candidate.rotationIndex < best.rotationIndex
    ) {
      return true;
    }
  }

  return false;
};

const resolveSearchStep = (config: NestConfig, parts: NestPart[]) => {
  if (config.searchStep && config.searchStep > NESTING_EPSILON) {
    return config.searchStep;
  }

  const spans = parts.flatMap((part) => [
    part.shape.bounds.width,
    part.shape.bounds.height,
  ]);
  const positiveSpans = spans.filter((span) => span > NESTING_EPSILON);
  const minSpan =
    positiveSpans.length > 0
      ? Math.min(...positiveSpans)
      : Math.max(config.curveTolerance, 0.1);

  const adaptiveStep = Math.max(minSpan / 20, config.curveTolerance / 10);
  return Math.max(Math.min(adaptiveStep, 0.5), 0.01);
};

export function placePartsGreedy(
  parts: NestPart[],
  bin: PolygonShape,
  config: NestConfig
): NestResult {
  const placements: NestPlacement[] = [];
  const notPlacedIds: string[] = [];
  const placedShapes: PolygonShape[] = [];
  const rotations = normalizedRotations(config.rotations);
  const orderedParts = [...parts].sort((a, b) => {
    const areaDiff = b.shape.area - a.shape.area;

    if (Math.abs(areaDiff) > NESTING_EPSILON) {
      return areaDiff;
    }

    return a.id.localeCompare(b.id);
  });
  const searchStep = resolveSearchStep(config, orderedParts);

  for (const part of orderedParts) {
    let bestCandidate: PlacementCandidate | null = null;

    for (
      let rotationIndex = 0;
      rotationIndex < rotations.length;
      rotationIndex += 1
    ) {
      const rotation = rotations[rotationIndex];
      const normalizedShape = normalizeShapeForRotation(part.shape, rotation);
      const maxX = bin.bounds.maxX - normalizedShape.bounds.width;
      const maxY = bin.bounds.maxY - normalizedShape.bounds.height;

      if (
        maxX < bin.bounds.minX - NESTING_EPSILON ||
        maxY < bin.bounds.minY - NESTING_EPSILON
      ) {
        continue;
      }

      const xCandidates = axisValues(bin.bounds.minX, maxX, searchStep);
      const yCandidates = axisValues(bin.bounds.minY, maxY, searchStep);

      let foundForRotation: PlacementCandidate | null = null;

      for (const y of yCandidates) {
        for (const x of xCandidates) {
          const candidateShape = translateShape(normalizedShape, x, y);

          if (!isShapeInsideBin(candidateShape, bin, config.gap)) {
            continue;
          }

          const overlapsPlaced = placedShapes.some((placedShape) =>
            polygonsOverlap(candidateShape, placedShape, config.gap)
          );

          if (overlapsPlaced) {
            continue;
          }

          foundForRotation = {
            placement: {
              id: part.id,
              x,
              y,
              rotation,
              shape: candidateShape,
            },
            x,
            y,
            rotationIndex,
          };
          break;
        }

        if (foundForRotation) {
          break;
        }
      }

      if (
        foundForRotation &&
        isBetterCandidate(foundForRotation, bestCandidate)
      ) {
        bestCandidate = foundForRotation;
      }
    }

    if (!bestCandidate) {
      notPlacedIds.push(part.id);
      continue;
    }

    placements.push(bestCandidate.placement);
    placedShapes.push(bestCandidate.placement.shape);
  }

  return {
    placements,
    notPlacedIds,
  };
}

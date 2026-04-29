import {
  shapeBounds,
  translateShape,
} from '@/lib/nesting/polygon/polygon-math';
import { normalizeShapeForRotation } from '@/lib/nesting/polygon/rotations';
import type { NestResult } from '@/lib/nesting/polygon/types';
import { NESTING_EPSILON } from '@/lib/nesting/polygon/types';

export interface FitnessScore {
  unplacedCount: number;
  invalidCount: number;
  binsUsed: number;
  compactness: number;
  usedArea: number;
  materialArea: number;
  utilization: number;
  width: number;
  height: number;
  lowerLeftScore: number;
  placementKey: string;
}

const compareNumeric = (left: number, right: number) => {
  if (!Number.isFinite(left) || !Number.isFinite(right)) {
    if (left === right) {
      return 0;
    }

    return left < right ? -1 : 1;
  }

  if (Math.abs(left - right) <= NESTING_EPSILON) {
    return 0;
  }

  return left < right ? -1 : 1;
};

const roundForKey = (value: number) => Math.round(value * 1000) / 1000;

const getEffectivePlacementShape = (
  placement: NestResult['placements'][number]
) => {
  if (
    Math.abs(placement.shape.bounds.minX - placement.x) <= NESTING_EPSILON &&
    Math.abs(placement.shape.bounds.minY - placement.y) <= NESTING_EPSILON
  ) {
    return placement.shape;
  }

  return translateShape(
    normalizeShapeForRotation(placement.shape, placement.rotation),
    placement.x,
    placement.y
  );
};

const buildPlacementKey = (result: NestResult) =>
  [...result.placements]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map(
      (placement) =>
        `${placement.id}:${roundForKey(placement.x)},${roundForKey(
          placement.y
        )},${roundForKey(placement.rotation)}`
    )
    .join('|');

export const evaluateNestFitness = (
  result: NestResult,
  binsUsed = 1,
  invalidCount = 0
): FitnessScore => {
  if (result.placements.length === 0) {
    return {
      unplacedCount: result.notPlacedIds.length,
      invalidCount,
      binsUsed,
      compactness: Number.POSITIVE_INFINITY,
      usedArea: Number.POSITIVE_INFINITY,
      materialArea: 0,
      utilization: 0,
      width: Number.POSITIVE_INFINITY,
      height: Number.POSITIVE_INFINITY,
      lowerLeftScore: Number.POSITIVE_INFINITY,
      placementKey: buildPlacementKey(result),
    };
  }

  const effectiveShapes = result.placements.map(getEffectivePlacementShape);
  const bounds = shapeBounds(
    effectiveShapes.flatMap((placement) => placement.contours)
  );
  const usedArea = bounds.width * bounds.height;
  const materialArea = effectiveShapes.reduce(
    (sum, shape) => sum + shape.area,
    0
  );

  return {
    unplacedCount: result.notPlacedIds.length,
    invalidCount,
    binsUsed,
    compactness: usedArea,
    usedArea,
    materialArea,
    utilization: usedArea > 0 ? materialArea / usedArea : 0,
    width: bounds.width,
    height: bounds.height,
    lowerLeftScore: bounds.minY * 1_000_000 + bounds.minX,
    placementKey: buildPlacementKey(result),
  };
};

export const compareFitness = (left: FitnessScore, right: FitnessScore) => {
  const unplacedDiff = left.unplacedCount - right.unplacedCount;

  if (unplacedDiff !== 0) {
    return unplacedDiff;
  }

  const invalidDiff = left.invalidCount - right.invalidCount;

  if (invalidDiff !== 0) {
    return invalidDiff;
  }

  const binsDiff = left.binsUsed - right.binsUsed;

  if (binsDiff !== 0) {
    return binsDiff;
  }

  const compactnessDiff = compareNumeric(left.usedArea, right.usedArea);

  if (compactnessDiff !== 0) {
    return compactnessDiff;
  }

  const utilizationDiff = compareNumeric(right.utilization, left.utilization);

  if (utilizationDiff !== 0) {
    return utilizationDiff;
  }

  const heightDiff = compareNumeric(left.height, right.height);

  if (heightDiff !== 0) {
    return heightDiff;
  }

  const widthDiff = compareNumeric(left.width, right.width);

  if (widthDiff !== 0) {
    return widthDiff;
  }

  const lowerLeftDiff = compareNumeric(
    left.lowerLeftScore,
    right.lowerLeftScore
  );

  if (lowerLeftDiff !== 0) {
    return lowerLeftDiff;
  }

  return left.placementKey.localeCompare(right.placementKey);
};

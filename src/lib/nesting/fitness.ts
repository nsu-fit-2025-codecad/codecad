import { shapeBounds } from '@/lib/nesting/polygon-math';
import type { NestResult } from '@/lib/nesting/types';
import { NESTING_EPSILON } from '@/lib/nesting/types';

export interface FitnessScore {
  unplacedCount: number;
  binsUsed: number;
  compactness: number;
  width: number;
  height: number;
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

export const evaluateNestFitness = (
  result: NestResult,
  binsUsed = 1
): FitnessScore => {
  if (result.placements.length === 0) {
    return {
      unplacedCount: result.notPlacedIds.length,
      binsUsed,
      compactness: Number.POSITIVE_INFINITY,
      width: Number.POSITIVE_INFINITY,
      height: Number.POSITIVE_INFINITY,
    };
  }

  const bounds = shapeBounds(
    result.placements.flatMap((placement) => placement.shape.contours)
  );

  return {
    unplacedCount: result.notPlacedIds.length,
    binsUsed,
    compactness: bounds.width * bounds.height,
    width: bounds.width,
    height: bounds.height,
  };
};

export const compareFitness = (left: FitnessScore, right: FitnessScore) => {
  const unplacedDiff = left.unplacedCount - right.unplacedCount;

  if (unplacedDiff !== 0) {
    return unplacedDiff;
  }

  const binsDiff = left.binsUsed - right.binsUsed;

  if (binsDiff !== 0) {
    return binsDiff;
  }

  const compactnessDiff = compareNumeric(left.compactness, right.compactness);

  if (compactnessDiff !== 0) {
    return compactnessDiff;
  }

  const heightDiff = compareNumeric(left.height, right.height);

  if (heightDiff !== 0) {
    return heightDiff;
  }

  return compareNumeric(left.width, right.width);
};

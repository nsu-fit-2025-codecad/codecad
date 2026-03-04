import { shapeBounds } from '@/lib/nesting/polygon/polygon-math';
import type {
  PlacementCandidate,
  PlacementScore,
} from '@/lib/nesting/placement/place-types';
import type { PolygonShape } from '@/lib/nesting/polygon/types';
import { NESTING_EPSILON } from '@/lib/nesting/polygon/types';

export {
  pointKey,
  roundPointValue,
  sortByYThenX,
} from '@/lib/nesting/polygon/point-utils';

export const scorePlacement = (
  candidateShape: PolygonShape,
  placedShapes: PolygonShape[]
): PlacementScore => {
  const combinedContours = placedShapes
    .flatMap((shape) => shape.contours)
    .concat(candidateShape.contours);
  const bounds = shapeBounds(combinedContours);

  return {
    area: bounds.width * bounds.height,
    width: bounds.width,
    height: bounds.height,
    y: candidateShape.bounds.minY,
    x: candidateShape.bounds.minX,
  };
};

export const isBetterScore = (
  candidate: PlacementScore,
  best: PlacementScore
) => {
  if (candidate.area < best.area - NESTING_EPSILON) {
    return true;
  }

  if (
    Math.abs(candidate.area - best.area) <= NESTING_EPSILON &&
    candidate.height < best.height - NESTING_EPSILON
  ) {
    return true;
  }

  if (
    Math.abs(candidate.area - best.area) <= NESTING_EPSILON &&
    Math.abs(candidate.height - best.height) <= NESTING_EPSILON &&
    candidate.width < best.width - NESTING_EPSILON
  ) {
    return true;
  }

  if (
    Math.abs(candidate.area - best.area) <= NESTING_EPSILON &&
    Math.abs(candidate.height - best.height) <= NESTING_EPSILON &&
    Math.abs(candidate.width - best.width) <= NESTING_EPSILON &&
    candidate.y < best.y - NESTING_EPSILON
  ) {
    return true;
  }

  return (
    Math.abs(candidate.area - best.area) <= NESTING_EPSILON &&
    Math.abs(candidate.height - best.height) <= NESTING_EPSILON &&
    Math.abs(candidate.width - best.width) <= NESTING_EPSILON &&
    Math.abs(candidate.y - best.y) <= NESTING_EPSILON &&
    candidate.x < best.x - NESTING_EPSILON
  );
};

export const isBetterCandidate = (
  candidate: PlacementCandidate,
  best: PlacementCandidate | null
) => {
  if (!best) {
    return true;
  }

  if (isBetterScore(candidate.score, best.score)) {
    return true;
  }

  return (
    !isBetterScore(best.score, candidate.score) &&
    candidate.rotationIndex < best.rotationIndex
  );
};

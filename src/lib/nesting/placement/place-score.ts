import { shapeBounds } from '@/lib/nesting/polygon/polygon-math';
import type {
  PlacementCandidate,
  PlacementScore,
} from '@/lib/nesting/placement/place-types';
import type { Point, PolygonShape } from '@/lib/nesting/polygon/types';
import { NESTING_EPSILON } from '@/lib/nesting/polygon/types';

const POINT_EPSILON = 1e-6;

export const roundPointValue = (value: number) =>
  Math.round(value / POINT_EPSILON) * POINT_EPSILON;

export const pointKey = (point: Point) =>
  `${roundPointValue(point.x)}:${roundPointValue(point.y)}`;

export const sortByYThenX = (a: Point, b: Point) => {
  if (Math.abs(a.y - b.y) > NESTING_EPSILON) {
    return a.y - b.y;
  }

  return a.x - b.x;
};

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

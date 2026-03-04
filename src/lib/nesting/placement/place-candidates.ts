import type { Point, PolygonShape } from '@/lib/nesting/polygon/types';
import { NESTING_EPSILON } from '@/lib/nesting/polygon/types';
import {
  pointKey,
  roundPointValue,
  sortByYThenX,
} from '@/lib/nesting/placement/place-score';

const MAX_PAIRWISE_SHAPE_POINTS = 24;
const MAX_CANDIDATES_PER_ROTATION = 800;
const PRIORITY_CANDIDATES_PER_ROTATION = 400;

const contourPoints = (shape: PolygonShape): Point[] =>
  shape.contours.flatMap((contour) => contour.map((point) => ({ ...point })));

const samplePoints = (points: Point[], maxPoints: number): Point[] => {
  if (points.length <= maxPoints) {
    return points;
  }

  const step = Math.ceil(points.length / maxPoints);
  const sampled: Point[] = [];

  for (let i = 0; i < points.length; i += step) {
    sampled.push(points[i]);
  }

  return sampled;
};

export const dedupePoints = (points: Point[]): Point[] => {
  const seen = new Set<string>();
  const unique: Point[] = [];

  points.forEach((point) => {
    const key = pointKey(point);

    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    unique.push({
      x: roundPointValue(point.x),
      y: roundPointValue(point.y),
    });
  });

  return unique;
};

export const limitCandidatePoints = (points: Point[]): Point[] => {
  const sorted = [...points].sort(sortByYThenX);

  if (sorted.length <= MAX_CANDIDATES_PER_ROTATION) {
    return sorted;
  }

  const headCount = Math.min(
    PRIORITY_CANDIDATES_PER_ROTATION,
    MAX_CANDIDATES_PER_ROTATION
  );
  const limited: Point[] = sorted.slice(0, headCount);
  const remainingBudget = MAX_CANDIDATES_PER_ROTATION - limited.length;

  if (remainingBudget > 0) {
    const tail = sorted.slice(headCount);
    const stride = tail.length / remainingBudget;

    for (let i = 0; i < remainingBudget; i += 1) {
      const index = Math.min(tail.length - 1, Math.floor(i * stride));
      limited.push(tail[index]);
    }
  }

  return dedupePoints(limited).sort(sortByYThenX);
};

export const pairwiseVertexCandidates = (
  stationaryShape: PolygonShape,
  movingShape: PolygonShape,
  offsetX = 0,
  offsetY = 0
): Point[] => {
  const stationaryPoints = samplePoints(
    contourPoints(stationaryShape),
    MAX_PAIRWISE_SHAPE_POINTS
  );
  const movingPoints = samplePoints(
    contourPoints(movingShape),
    MAX_PAIRWISE_SHAPE_POINTS
  );
  const candidates: Point[] = [];

  stationaryPoints.forEach((stationaryPoint) => {
    movingPoints.forEach((movingPoint) => {
      candidates.push({
        x: offsetX + stationaryPoint.x - movingPoint.x,
        y: offsetY + stationaryPoint.y - movingPoint.y,
      });
    });
  });

  return candidates;
};

export const fallbackAnchorPoints = (
  shape: PolygonShape,
  bin: PolygonShape
): Point[] => {
  const minX = bin.bounds.minX;
  const minY = bin.bounds.minY;
  const maxX = bin.bounds.maxX - shape.bounds.width;
  const maxY = bin.bounds.maxY - shape.bounds.height;

  if (maxX < minX - NESTING_EPSILON || maxY < minY - NESTING_EPSILON) {
    return [];
  }

  return [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: minX, y: maxY },
    { x: maxX, y: maxY },
  ];
};

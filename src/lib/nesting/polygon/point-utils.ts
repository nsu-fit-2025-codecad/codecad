import type { Point, PolygonShape } from '@/lib/nesting/polygon/types';
import { NESTING_EPSILON } from '@/lib/nesting/polygon/types';

export const POINT_EPSILON = 1e-6;

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

export const contourPoints = (shape: PolygonShape): Point[] =>
  shape.contours.flatMap((contour) => contour.map((point) => ({ ...point })));

import { areBoundsOverlapping, polygonArea } from '@/lib/nesting/polygon-math';
import type { Contour, Point, PolygonShape } from '@/lib/nesting/types';
import { NESTING_EPSILON } from '@/lib/nesting/types';

const contourSegments = (contour: Contour): Array<[Point, Point]> => {
  if (contour.length < 2) {
    return [];
  }

  const segments: Array<[Point, Point]> = [];

  for (let i = 0; i < contour.length; i += 1) {
    segments.push([contour[i], contour[(i + 1) % contour.length]]);
  }

  return segments;
};

const signedCross = (a: Point, b: Point, c: Point) =>
  (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);

const isPointOnSegment = (point: Point, a: Point, b: Point) => {
  const cross = signedCross(a, b, point);

  if (Math.abs(cross) > NESTING_EPSILON) {
    return false;
  }

  const dot =
    (point.x - a.x) * (point.x - b.x) + (point.y - a.y) * (point.y - b.y);
  return dot <= NESTING_EPSILON;
};

const segmentsIntersect = (a1: Point, a2: Point, b1: Point, b2: Point) => {
  const d1 = signedCross(a1, a2, b1);
  const d2 = signedCross(a1, a2, b2);
  const d3 = signedCross(b1, b2, a1);
  const d4 = signedCross(b1, b2, a2);

  const aStraddles =
    (d1 > NESTING_EPSILON && d2 < -NESTING_EPSILON) ||
    (d1 < -NESTING_EPSILON && d2 > NESTING_EPSILON);
  const bStraddles =
    (d3 > NESTING_EPSILON && d4 < -NESTING_EPSILON) ||
    (d3 < -NESTING_EPSILON && d4 > NESTING_EPSILON);

  if (aStraddles && bStraddles) {
    return true;
  }

  return (
    isPointOnSegment(b1, a1, a2) ||
    isPointOnSegment(b2, a1, a2) ||
    isPointOnSegment(a1, b1, b2) ||
    isPointOnSegment(a2, b1, b2)
  );
};

const segmentsCrossStrict = (a1: Point, a2: Point, b1: Point, b2: Point) => {
  const d1 = signedCross(a1, a2, b1);
  const d2 = signedCross(a1, a2, b2);
  const d3 = signedCross(b1, b2, a1);
  const d4 = signedCross(b1, b2, a2);

  const aStraddles =
    (d1 > NESTING_EPSILON && d2 < -NESTING_EPSILON) ||
    (d1 < -NESTING_EPSILON && d2 > NESTING_EPSILON);
  const bStraddles =
    (d3 > NESTING_EPSILON && d4 < -NESTING_EPSILON) ||
    (d3 < -NESTING_EPSILON && d4 > NESTING_EPSILON);

  return aStraddles && bStraddles;
};

const pointToSegmentDistance = (point: Point, a: Point, b: Point) => {
  const abX = b.x - a.x;
  const abY = b.y - a.y;
  const abLengthSquared = abX * abX + abY * abY;

  if (abLengthSquared <= NESTING_EPSILON) {
    return Math.hypot(point.x - a.x, point.y - a.y);
  }

  const projection =
    ((point.x - a.x) * abX + (point.y - a.y) * abY) / abLengthSquared;
  const t = Math.max(0, Math.min(1, projection));
  const closestX = a.x + abX * t;
  const closestY = a.y + abY * t;

  return Math.hypot(point.x - closestX, point.y - closestY);
};

const segmentDistance = (a1: Point, a2: Point, b1: Point, b2: Point) => {
  if (segmentsIntersect(a1, a2, b1, b2)) {
    return 0;
  }

  return Math.min(
    pointToSegmentDistance(a1, b1, b2),
    pointToSegmentDistance(a2, b1, b2),
    pointToSegmentDistance(b1, a1, a2),
    pointToSegmentDistance(b2, a1, a2)
  );
};

const shapeBoundaryDistance = (point: Point, shape: PolygonShape) => {
  let minDistance = Number.POSITIVE_INFINITY;

  shape.contours.forEach((contour) => {
    contourSegments(contour).forEach(([start, end]) => {
      minDistance = Math.min(
        minDistance,
        pointToSegmentDistance(point, start, end)
      );
    });
  });

  return minDistance;
};

const isPointOnShapeBoundary = (point: Point, shape: PolygonShape) =>
  shape.contours.some((contour) =>
    contourSegments(contour).some(([start, end]) =>
      isPointOnSegment(point, start, end)
    )
  );

const isPointStrictlyInsidePolygon = (point: Point, shape: PolygonShape) =>
  pointInPolygon(point, shape) && !isPointOnShapeBoundary(point, shape);

const hasStrictContainment = (source: PolygonShape, target: PolygonShape) => {
  for (const contour of source.contours) {
    const centroid = contour.reduce(
      (acc, point) => ({
        x: acc.x + point.x,
        y: acc.y + point.y,
      }),
      { x: 0, y: 0 }
    );

    if (contour.length > 0) {
      centroid.x /= contour.length;
      centroid.y /= contour.length;

      if (isPointStrictlyInsidePolygon(centroid, target)) {
        return true;
      }
    }

    for (const point of contour) {
      if (isPointStrictlyInsidePolygon(point, target)) {
        return true;
      }
    }

    for (const [start, end] of contourSegments(contour)) {
      const midpoint = {
        x: (start.x + end.x) / 2,
        y: (start.y + end.y) / 2,
      };

      if (isPointStrictlyInsidePolygon(midpoint, target)) {
        return true;
      }
    }
  }

  return false;
};

export function pointInContour(point: Point, contour: Contour): boolean {
  if (contour.length < 3) {
    return false;
  }

  let inside = false;

  for (let i = 0, j = contour.length - 1; i < contour.length; j = i, i += 1) {
    const current = contour[i];
    const previous = contour[j];

    if (isPointOnSegment(point, previous, current)) {
      return true;
    }

    const intersects =
      current.y > point.y !== previous.y > point.y &&
      point.x <
        ((previous.x - current.x) * (point.y - current.y)) /
          (previous.y - current.y) +
          current.x;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

export function pointInPolygon(point: Point, shape: PolygonShape): boolean {
  if (shape.contours.length === 0) {
    return false;
  }

  let winding = 0;

  for (const contour of shape.contours) {
    if (!pointInContour(point, contour)) {
      continue;
    }

    const area = polygonArea(contour);

    if (Math.abs(area) <= NESTING_EPSILON) {
      continue;
    }

    winding += area > 0 ? 1 : -1;
  }

  return winding > 0;
}

export function polygonsOverlap(
  a: PolygonShape,
  b: PolygonShape,
  gap = 0
): boolean {
  if (!areBoundsOverlapping(a.bounds, b.bounds, gap)) {
    return false;
  }

  for (const contourA of a.contours) {
    const segmentsA = contourSegments(contourA);

    for (const contourB of b.contours) {
      const segmentsB = contourSegments(contourB);

      for (const [aStart, aEnd] of segmentsA) {
        for (const [bStart, bEnd] of segmentsB) {
          if (segmentsCrossStrict(aStart, aEnd, bStart, bEnd)) {
            return true;
          }

          if (
            gap > NESTING_EPSILON &&
            segmentDistance(aStart, aEnd, bStart, bEnd) < gap - NESTING_EPSILON
          ) {
            return true;
          }
        }
      }
    }
  }

  if (hasStrictContainment(a, b)) {
    return true;
  }

  return hasStrictContainment(b, a);
}

export function isShapeInsideBin(
  shape: PolygonShape,
  bin: PolygonShape,
  gap = 0
): boolean {
  if (shape.contours.length === 0 || bin.contours.length === 0) {
    return false;
  }

  if (!areBoundsOverlapping(shape.bounds, bin.bounds)) {
    return false;
  }

  for (const contour of shape.contours) {
    for (const point of contour) {
      if (!pointInPolygon(point, bin)) {
        return false;
      }

      if (
        gap > NESTING_EPSILON &&
        shapeBoundaryDistance(point, bin) < gap - NESTING_EPSILON
      ) {
        return false;
      }
    }
  }

  for (const contour of shape.contours) {
    const shapeSegments = contourSegments(contour);

    for (const binContour of bin.contours) {
      const binSegments = contourSegments(binContour);

      for (const [shapeStart, shapeEnd] of shapeSegments) {
        for (const [binStart, binEnd] of binSegments) {
          if (segmentsCrossStrict(shapeStart, shapeEnd, binStart, binEnd)) {
            return false;
          }

          if (
            gap > NESTING_EPSILON &&
            segmentDistance(shapeStart, shapeEnd, binStart, binEnd) <
              gap - NESTING_EPSILON
          ) {
            return false;
          }
        }
      }
    }
  }

  return true;
}

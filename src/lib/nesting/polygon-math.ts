import type { Bounds, Contour, Point, PolygonShape } from '@/lib/nesting/types';
import { NESTING_EPSILON } from '@/lib/nesting/types';

const EMPTY_BOUNDS: Bounds = {
  minX: 0,
  minY: 0,
  maxX: 0,
  maxY: 0,
  width: 0,
  height: 0,
};

const cloneContour = (contour: Contour): Contour =>
  contour.map((point) => ({ ...point }));

const boundsFromPoints = (points: Point[]): Bounds => {
  if (points.length === 0) {
    return { ...EMPTY_BOUNDS };
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  points.forEach((point) => {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  });

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
};

const contourSignedArea = (contour: Contour): number => {
  if (contour.length < 3) {
    return 0;
  }

  let area = 0;

  for (let i = 0; i < contour.length; i += 1) {
    const current = contour[i];
    const next = contour[(i + 1) % contour.length];
    area += current.x * next.y - next.x * current.y;
  }

  return area / 2;
};

export function polygonArea(contour: Contour): number {
  return contourSignedArea(contour);
}

export function polygonBounds(contour: Contour): Bounds {
  return boundsFromPoints(contour);
}

export function shapeBounds(contours: Contour[]): Bounds {
  return boundsFromPoints(contours.flat());
}

export function createShape(contours: Contour[]): PolygonShape {
  const clonedContours = contours.map((contour) => cloneContour(contour));
  const bounds = shapeBounds(clonedContours);
  const area = Math.abs(
    clonedContours.reduce((sum, contour) => sum + contourSignedArea(contour), 0)
  );

  return {
    contours: clonedContours,
    bounds,
    area,
  };
}

export function rotatePoints(
  points: Contour,
  angleDegrees: number,
  origin: Point = { x: 0, y: 0 }
): Contour {
  if (Math.abs(angleDegrees % 360) <= NESTING_EPSILON) {
    return cloneContour(points);
  }

  const radians = (angleDegrees * Math.PI) / 180;
  const cosValue = Math.cos(radians);
  const sinValue = Math.sin(radians);

  return points.map((point) => {
    const x = point.x - origin.x;
    const y = point.y - origin.y;

    return {
      x: x * cosValue - y * sinValue + origin.x,
      y: x * sinValue + y * cosValue + origin.y,
    };
  });
}

export function translatePoints(
  points: Contour,
  dx: number,
  dy: number
): Contour {
  if (Math.abs(dx) <= NESTING_EPSILON && Math.abs(dy) <= NESTING_EPSILON) {
    return cloneContour(points);
  }

  return points.map((point) => ({
    x: point.x + dx,
    y: point.y + dy,
  }));
}

export function rotateShape(
  shape: PolygonShape,
  angleDegrees: number,
  origin: Point = { x: 0, y: 0 }
): PolygonShape {
  return createShape(
    shape.contours.map((contour) => rotatePoints(contour, angleDegrees, origin))
  );
}

export function translateShape(
  shape: PolygonShape,
  dx: number,
  dy: number
): PolygonShape {
  return createShape(
    shape.contours.map((contour) => translatePoints(contour, dx, dy))
  );
}

export function areBoundsOverlapping(
  a: Bounds,
  b: Bounds,
  padding = 0
): boolean {
  return !(
    a.maxX + padding < b.minX ||
    b.maxX + padding < a.minX ||
    a.maxY + padding < b.minY ||
    b.maxY + padding < a.minY
  );
}

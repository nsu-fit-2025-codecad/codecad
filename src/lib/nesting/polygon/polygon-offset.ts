import { normalizeShape } from '@/lib/nesting/polygon/polygon-cleanup';
import { createShape, polygonArea } from '@/lib/nesting/polygon/polygon-math';
import type { Contour, Point, PolygonShape } from '@/lib/nesting/polygon/types';
import { NESTING_EPSILON } from '@/lib/nesting/polygon/types';

const OFFSET_EPSILON = 1e-9;

const cloneContour = (contour: Contour): Contour =>
  contour.map((point) => ({ ...point }));

const lineIntersection = (
  a1: Point,
  a2: Point,
  b1: Point,
  b2: Point
): Point | null => {
  const ax = a2.x - a1.x;
  const ay = a2.y - a1.y;
  const bx = b2.x - b1.x;
  const by = b2.y - b1.y;
  const determinant = ax * by - ay * bx;

  if (Math.abs(determinant) <= OFFSET_EPSILON) {
    return null;
  }

  const cx = b1.x - a1.x;
  const cy = b1.y - a1.y;
  const t = (cx * by - cy * bx) / determinant;

  return {
    x: a1.x + t * ax,
    y: a1.y + t * ay,
  };
};

export function offsetContour(contour: Contour, distance: number): Contour {
  if (contour.length < 3 || Math.abs(distance) <= NESTING_EPSILON) {
    return cloneContour(contour);
  }

  const area = polygonArea(contour);

  if (Math.abs(area) <= NESTING_EPSILON) {
    return cloneContour(contour);
  }

  const orientationSign = area > 0 ? 1 : -1;
  const shiftedEdges: Array<{ start: Point; end: Point }> = [];

  for (let i = 0; i < contour.length; i += 1) {
    const start = contour[i];
    const end = contour[(i + 1) % contour.length];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);

    if (length <= OFFSET_EPSILON) {
      continue;
    }

    const nx = (dy / length) * orientationSign;
    const ny = (-dx / length) * orientationSign;

    shiftedEdges.push({
      start: {
        x: start.x + nx * distance,
        y: start.y + ny * distance,
      },
      end: {
        x: end.x + nx * distance,
        y: end.y + ny * distance,
      },
    });
  }

  if (shiftedEdges.length < 3) {
    return cloneContour(contour);
  }

  const offsetPoints: Contour = [];

  for (let i = 0; i < shiftedEdges.length; i += 1) {
    const previous =
      shiftedEdges[(i - 1 + shiftedEdges.length) % shiftedEdges.length];
    const current = shiftedEdges[i];
    const intersection = lineIntersection(
      previous.start,
      previous.end,
      current.start,
      current.end
    );

    if (intersection) {
      offsetPoints.push(intersection);
      continue;
    }

    offsetPoints.push({ ...current.start });
  }

  return offsetPoints;
}

export function offsetShape(
  shape: PolygonShape,
  distance: number
): PolygonShape {
  if (Math.abs(distance) <= NESTING_EPSILON) {
    return createShape(shape.contours.map((contour) => cloneContour(contour)));
  }

  const offsetContours = shape.contours
    .map((contour) => {
      const area = polygonArea(contour);
      const contourDistance =
        Math.abs(area) <= NESTING_EPSILON
          ? distance
          : area > 0
            ? distance
            : -distance;

      return offsetContour(contour, contourDistance);
    })
    .filter((contour) => contour.length >= 3);

  if (offsetContours.length === 0) {
    return createShape([]);
  }

  return normalizeShape(createShape(offsetContours));
}

export function insetShape(
  shape: PolygonShape,
  distance: number
): PolygonShape {
  return offsetShape(shape, -Math.abs(distance));
}

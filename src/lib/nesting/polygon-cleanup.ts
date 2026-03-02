import { createShape, polygonArea } from '@/lib/nesting/polygon-math';
import type { Contour, PolygonShape } from '@/lib/nesting/types';
import { NESTING_EPSILON } from '@/lib/nesting/types';

const CLEANUP_EPSILON = 1e-6;

const pointsEqual = (
  a: { x: number; y: number },
  b: { x: number; y: number }
) =>
  Math.abs(a.x - b.x) <= CLEANUP_EPSILON &&
  Math.abs(a.y - b.y) <= CLEANUP_EPSILON;

export function dedupePoints(contour: Contour): Contour {
  if (contour.length === 0) {
    return [];
  }

  const deduped: Contour = [];

  contour.forEach((point) => {
    const lastPoint = deduped[deduped.length - 1];

    if (!lastPoint || !pointsEqual(lastPoint, point)) {
      deduped.push({ ...point });
    }
  });

  if (
    deduped.length > 1 &&
    pointsEqual(deduped[0], deduped[deduped.length - 1])
  ) {
    deduped.pop();
  }

  return deduped;
}

const collinearCrossProduct = (
  prev: { x: number; y: number },
  current: { x: number; y: number },
  next: { x: number; y: number }
) =>
  (current.x - prev.x) * (next.y - current.y) -
  (current.y - prev.y) * (next.x - current.x);

export function removeCollinearPoints(contour: Contour): Contour {
  if (contour.length < 4) {
    return contour.map((point) => ({ ...point }));
  }

  let points = contour.map((point) => ({ ...point }));
  let changed = true;

  while (changed && points.length > 3) {
    changed = false;
    const reduced: Contour = [];

    for (let i = 0; i < points.length; i += 1) {
      const prev = points[(i - 1 + points.length) % points.length];
      const current = points[i];
      const next = points[(i + 1) % points.length];
      const cross = collinearCrossProduct(prev, current, next);

      if (Math.abs(cross) <= CLEANUP_EPSILON) {
        changed = true;
        continue;
      }

      reduced.push(current);
    }

    if (reduced.length < 3) {
      break;
    }

    points = reduced;
  }

  return points;
}

export function normalizeContour(contour: Contour): Contour {
  const deduped = dedupePoints(contour);
  const cleaned = removeCollinearPoints(deduped);

  if (cleaned.length < 3) {
    return [];
  }

  const area = polygonArea(cleaned);

  if (Math.abs(area) <= NESTING_EPSILON) {
    return [];
  }

  if (area < 0) {
    return [...cleaned].reverse();
  }

  return cleaned;
}

export function normalizeShape(shape: PolygonShape): PolygonShape {
  const contours = shape.contours
    .map((contour) => normalizeContour(contour))
    .filter((contour) => contour.length >= 3);

  if (contours.length === 0) {
    return createShape([]);
  }

  let outerIndex = 0;
  let largestArea = 0;

  contours.forEach((contour, index) => {
    const area = Math.abs(polygonArea(contour));

    if (area > largestArea) {
      largestArea = area;
      outerIndex = index;
    }
  });

  const outerContour = contours[outerIndex];
  const innerContours = contours
    .filter((_, index) => index !== outerIndex)
    .sort((a, b) => Math.abs(polygonArea(b)) - Math.abs(polygonArea(a)))
    .map((contour) =>
      polygonArea(contour) > 0 ? [...contour].reverse() : contour
    );

  return createShape([outerContour, ...innerContours]);
}

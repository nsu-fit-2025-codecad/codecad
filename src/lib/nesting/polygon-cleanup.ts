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

const signedCross = (
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number }
) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);

const isPointOnSegment = (
  point: { x: number; y: number },
  start: { x: number; y: number },
  end: { x: number; y: number }
) => {
  const cross = signedCross(start, end, point);

  if (Math.abs(cross) > CLEANUP_EPSILON) {
    return false;
  }

  const dot =
    (point.x - start.x) * (point.x - end.x) +
    (point.y - start.y) * (point.y - end.y);
  return dot <= CLEANUP_EPSILON;
};

const pointInContour = (point: { x: number; y: number }, contour: Contour) => {
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
};

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

  const sortedContours = contours
    .map((contour, originalIndex) => ({
      contour,
      originalIndex,
      absArea: Math.abs(polygonArea(contour)),
    }))
    .sort((a, b) => {
      if (Math.abs(b.absArea - a.absArea) > NESTING_EPSILON) {
        return b.absArea - a.absArea;
      }

      return a.originalIndex - b.originalIndex;
    });

  const normalizedContours = sortedContours.map((entry, index) => {
    const probePoint = entry.contour[0];
    let depth = 0;

    for (let i = 0; i < index; i += 1) {
      if (pointInContour(probePoint, sortedContours[i].contour)) {
        depth += 1;
      }
    }

    const area = polygonArea(entry.contour);
    const shouldBeHole = depth % 2 === 1;

    if (shouldBeHole) {
      return area < 0 ? entry.contour : [...entry.contour].reverse();
    }

    return area > 0 ? entry.contour : [...entry.contour].reverse();
  });

  return createShape(normalizedContours);
}

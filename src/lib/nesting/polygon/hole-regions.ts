import { createShape } from '@/lib/nesting/polygon/polygon-math';
import type { Contour, Point, PolygonShape } from '@/lib/nesting/polygon/types';
import { NESTING_EPSILON } from '@/lib/nesting/polygon/types';
import { polygonArea } from '@/lib/nesting/polygon/polygon-math';

export interface HoleRegion {
  id: string;
  shape: PolygonShape;
}

const signedCross = (a: Point, b: Point, c: Point) =>
  (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);

const isPointOnSegment = (point: Point, start: Point, end: Point) => {
  const cross = signedCross(start, end, point);

  if (Math.abs(cross) > NESTING_EPSILON) {
    return false;
  }

  const dot =
    (point.x - start.x) * (point.x - end.x) +
    (point.y - start.y) * (point.y - end.y);

  return dot <= NESTING_EPSILON;
};

const pointInContour = (point: Point, contour: Contour): boolean => {
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

const isContourInsideContour = (
  childContour: Contour,
  parentContour: Contour
): boolean => {
  const probePoint = childContour[0];

  if (!probePoint) {
    return false;
  }

  return pointInContour(probePoint, parentContour);
};

export const extractHoleRegions = (
  shape: PolygonShape,
  idPrefix = 'hole'
): HoleRegion[] => {
  const contourEntries = shape.contours.map((contour, index) => ({
    contour,
    index,
    area: polygonArea(contour),
  }));

  return contourEntries
    .map((entry) => {
      if (entry.area >= -NESTING_EPSILON) {
        return null;
      }

      const regionContours = contourEntries
        .filter(
          (candidate) =>
            candidate.index === entry.index ||
            isContourInsideContour(candidate.contour, entry.contour)
        )
        .map((candidate) => [...candidate.contour].reverse());

      const holeShape = createShape(regionContours);

      if (
        holeShape.contours.length === 0 ||
        holeShape.area <= NESTING_EPSILON
      ) {
        return null;
      }

      return {
        id: `${idPrefix}-${entry.index}`,
        shape: holeShape,
      };
    })
    .filter((holeRegion): holeRegion is HoleRegion => holeRegion !== null);
};

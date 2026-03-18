import { createShape } from '@/lib/nesting/polygon/polygon-math';
import type { PolygonShape } from '@/lib/nesting/polygon/types';
import { NESTING_EPSILON } from '@/lib/nesting/polygon/types';
import { polygonArea } from '@/lib/nesting/polygon/polygon-math';

export interface HoleRegion {
  id: string;
  shape: PolygonShape;
}

export const extractHoleRegions = (
  shape: PolygonShape,
  idPrefix = 'hole'
): HoleRegion[] =>
  shape.contours
    .map((contour, index) => {
      if (polygonArea(contour) >= -NESTING_EPSILON) {
        return null;
      }

      const holeShape = createShape([[...contour].reverse()]);

      if (
        holeShape.contours.length === 0 ||
        holeShape.area <= NESTING_EPSILON
      ) {
        return null;
      }

      return {
        id: `${idPrefix}-${index}`,
        shape: holeShape,
      };
    })
    .filter((holeRegion): holeRegion is HoleRegion => holeRegion !== null);

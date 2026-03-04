import { polygonsOverlap } from '@/lib/nesting/polygon/polygon-boolean';
import type { PolygonShape, Point } from '@/lib/nesting/polygon/types';
import { NESTING_EPSILON } from '@/lib/nesting/polygon/types';

export interface CandidateBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export const createCandidateBounds = (
  bin: PolygonShape,
  shape: PolygonShape
): CandidateBounds => ({
  minX: bin.bounds.minX - shape.bounds.minX,
  minY: bin.bounds.minY - shape.bounds.minY,
  maxX: bin.bounds.maxX - shape.bounds.maxX,
  maxY: bin.bounds.maxY - shape.bounds.maxY,
});

export const isCandidateWithinBounds = (
  point: Point,
  bounds: CandidateBounds
) =>
  !(
    point.x < bounds.minX - NESTING_EPSILON ||
    point.x > bounds.maxX + NESTING_EPSILON ||
    point.y < bounds.minY - NESTING_EPSILON ||
    point.y > bounds.maxY + NESTING_EPSILON
  );

export const overlapsPlacedShapes = (
  candidateShape: PolygonShape,
  placedShapes: PolygonShape[],
  gap: number
) =>
  placedShapes.some((placedShape) =>
    polygonsOverlap(candidateShape, placedShape, gap)
  );

export { isShapeInsideBin } from '@/lib/nesting/polygon/polygon-boolean';

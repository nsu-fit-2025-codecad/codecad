import { buildInnerFitPolygon } from '@/lib/nesting/nfp/nfp';
import { createShape, polygonArea } from '@/lib/nesting/polygon/polygon-math';
import type { NfpCache } from '@/lib/nesting/nfp/nfp-cache';
import { pairwiseVertexCandidates } from '@/lib/nesting/placement/place-candidates';
import type {
  HoleRegion,
  PlacedPartState,
} from '@/lib/nesting/placement/place-types';
import type { Point, PolygonShape } from '@/lib/nesting/polygon/types';
import { NESTING_EPSILON } from '@/lib/nesting/polygon/types';

export const extractHoleRegions = (shape: PolygonShape): HoleRegion[] =>
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
        id: `hole-${index}`,
        shape: holeShape,
      };
    })
    .filter((holeRegion): holeRegion is HoleRegion => holeRegion !== null);

export const holeInteriorAnchors = (
  holeShape: PolygonShape,
  movingShape: PolygonShape,
  gap: number,
  offsetX: number,
  offsetY: number
): Point[] => {
  const minX = holeShape.bounds.minX - movingShape.bounds.minX + gap;
  const maxX = holeShape.bounds.maxX - movingShape.bounds.maxX - gap;
  const minY = holeShape.bounds.minY - movingShape.bounds.minY + gap;
  const maxY = holeShape.bounds.maxY - movingShape.bounds.maxY - gap;

  if (maxX < minX - NESTING_EPSILON || maxY < minY - NESTING_EPSILON) {
    return [];
  }

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const anchors: Point[] = [{ x: cx + offsetX, y: cy + offsetY }];

  if (maxX - minX > NESTING_EPSILON) {
    anchors.push(
      { x: (minX * 3 + maxX) / 4 + offsetX, y: cy + offsetY },
      { x: (minX + maxX * 3) / 4 + offsetX, y: cy + offsetY }
    );
  }

  if (maxY - minY > NESTING_EPSILON) {
    anchors.push(
      { x: cx + offsetX, y: (minY * 3 + maxY) / 4 + offsetY },
      { x: cx + offsetX, y: (minY + maxY * 3) / 4 + offsetY }
    );
  }

  return anchors;
};

export const buildHoleCandidatePoints = (
  placedPart: PlacedPartState,
  movingShape: PolygonShape,
  partId: string,
  rotation: number,
  gap: number,
  nfpCache: NfpCache
): Point[] => {
  const candidatePoints: Point[] = [];

  placedPart.holeRegions.forEach((holeRegion) => {
    const holeFit = nfpCache.getOrBuild(
      {
        stationaryId: `${placedPart.id}|${holeRegion.id}`,
        movingId: partId,
        inside: true,
        stationaryRotation: placedPart.rotation,
        movingRotation: rotation,
        gap,
      },
      () => buildInnerFitPolygon(holeRegion.shape, movingShape, gap)
    );

    holeFit.points.forEach((point) => {
      candidatePoints.push({
        x: point.x + placedPart.x,
        y: point.y + placedPart.y,
      });
    });

    candidatePoints.push(
      ...pairwiseVertexCandidates(
        holeRegion.shape,
        movingShape,
        placedPart.x,
        placedPart.y
      )
    );

    candidatePoints.push(
      ...holeInteriorAnchors(
        holeRegion.shape,
        movingShape,
        gap,
        placedPart.x,
        placedPart.y
      )
    );
  });

  return candidatePoints;
};

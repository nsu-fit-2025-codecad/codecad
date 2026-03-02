import { buildInnerFitPolygon, buildNoFitPolygon } from '@/lib/nesting/nfp';
import { NfpCache } from '@/lib/nesting/nfp-cache';
import {
  isShapeInsideBin,
  polygonsOverlap,
} from '@/lib/nesting/polygon-boolean';
import { shapeBounds, translateShape } from '@/lib/nesting/polygon-math';
import {
  normalizeRotations,
  normalizeShapeForRotation,
} from '@/lib/nesting/rotations';
import type {
  NestConfig,
  NestPart,
  NestPlacement,
  NestResult,
  Point,
  PolygonShape,
} from '@/lib/nesting/types';
import { NESTING_EPSILON } from '@/lib/nesting/types';

const BIN_CACHE_ID = '__bin__';
const POINT_EPSILON = 1e-6;
const MAX_PAIRWISE_SHAPE_POINTS = 24;
const MAX_CANDIDATES_PER_ROTATION = 800;
const PRIORITY_CANDIDATES_PER_ROTATION = 400;

interface PlacementCandidate {
  placement: NestPlacement;
  score: PlacementScore;
  rotationIndex: number;
}

interface PlacementScore {
  area: number;
  width: number;
  height: number;
  y: number;
  x: number;
}

interface PlacedPartState {
  id: string;
  x: number;
  y: number;
  rotation: number;
  normalizedShape: PolygonShape;
  shape: PolygonShape;
}

const roundPointValue = (value: number) =>
  Math.round(value / POINT_EPSILON) * POINT_EPSILON;

const pointKey = (point: Point) =>
  `${roundPointValue(point.x)}:${roundPointValue(point.y)}`;

const sortByYThenX = (a: Point, b: Point) => {
  if (Math.abs(a.y - b.y) > NESTING_EPSILON) {
    return a.y - b.y;
  }

  return a.x - b.x;
};

const dedupePoints = (points: Point[]): Point[] => {
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

const contourPoints = (shape: PolygonShape): Point[] =>
  shape.contours.flatMap((contour) => contour.map((point) => ({ ...point })));

const samplePoints = (points: Point[], maxPoints: number): Point[] => {
  if (points.length <= maxPoints) {
    return points;
  }

  const step = Math.ceil(points.length / maxPoints);
  const sampled: Point[] = [];

  for (let i = 0; i < points.length; i += step) {
    sampled.push(points[i]);
  }

  return sampled;
};

const limitCandidatePoints = (points: Point[]): Point[] => {
  const sorted = [...points].sort(sortByYThenX);

  if (sorted.length <= MAX_CANDIDATES_PER_ROTATION) {
    return sorted;
  }

  const headCount = Math.min(
    PRIORITY_CANDIDATES_PER_ROTATION,
    MAX_CANDIDATES_PER_ROTATION
  );
  const limited: Point[] = sorted.slice(0, headCount);
  const remainingBudget = MAX_CANDIDATES_PER_ROTATION - limited.length;

  if (remainingBudget > 0) {
    const tail = sorted.slice(headCount);
    const stride = tail.length / remainingBudget;

    for (let i = 0; i < remainingBudget; i += 1) {
      const index = Math.min(tail.length - 1, Math.floor(i * stride));
      limited.push(tail[index]);
    }
  }

  return dedupePoints(limited).sort(sortByYThenX);
};

const pairwiseVertexCandidates = (
  stationaryShape: PolygonShape,
  movingShape: PolygonShape,
  offsetX = 0,
  offsetY = 0
): Point[] => {
  const stationaryPoints = samplePoints(
    contourPoints(stationaryShape),
    MAX_PAIRWISE_SHAPE_POINTS
  );
  const movingPoints = samplePoints(
    contourPoints(movingShape),
    MAX_PAIRWISE_SHAPE_POINTS
  );
  const candidates: Point[] = [];

  stationaryPoints.forEach((stationaryPoint) => {
    movingPoints.forEach((movingPoint) => {
      candidates.push({
        x: offsetX + stationaryPoint.x - movingPoint.x,
        y: offsetY + stationaryPoint.y - movingPoint.y,
      });
    });
  });

  return candidates;
};

const fallbackAnchorPoints = (
  shape: PolygonShape,
  bin: PolygonShape
): Point[] => {
  const minX = bin.bounds.minX;
  const minY = bin.bounds.minY;
  const maxX = bin.bounds.maxX - shape.bounds.width;
  const maxY = bin.bounds.maxY - shape.bounds.height;

  if (maxX < minX - NESTING_EPSILON || maxY < minY - NESTING_EPSILON) {
    return [];
  }

  return [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: minX, y: maxY },
    { x: maxX, y: maxY },
  ];
};

const scorePlacement = (
  candidateShape: PolygonShape,
  placedShapes: PolygonShape[]
): PlacementScore => {
  const combinedContours = placedShapes
    .flatMap((shape) => shape.contours)
    .concat(candidateShape.contours);
  const bounds = shapeBounds(combinedContours);

  return {
    area: bounds.width * bounds.height,
    width: bounds.width,
    height: bounds.height,
    y: candidateShape.bounds.minY,
    x: candidateShape.bounds.minX,
  };
};

const isBetterScore = (candidate: PlacementScore, best: PlacementScore) => {
  if (candidate.area < best.area - NESTING_EPSILON) {
    return true;
  }

  if (
    Math.abs(candidate.area - best.area) <= NESTING_EPSILON &&
    candidate.height < best.height - NESTING_EPSILON
  ) {
    return true;
  }

  if (
    Math.abs(candidate.area - best.area) <= NESTING_EPSILON &&
    Math.abs(candidate.height - best.height) <= NESTING_EPSILON &&
    candidate.width < best.width - NESTING_EPSILON
  ) {
    return true;
  }

  if (
    Math.abs(candidate.area - best.area) <= NESTING_EPSILON &&
    Math.abs(candidate.height - best.height) <= NESTING_EPSILON &&
    Math.abs(candidate.width - best.width) <= NESTING_EPSILON &&
    candidate.y < best.y - NESTING_EPSILON
  ) {
    return true;
  }

  return (
    Math.abs(candidate.area - best.area) <= NESTING_EPSILON &&
    Math.abs(candidate.height - best.height) <= NESTING_EPSILON &&
    Math.abs(candidate.width - best.width) <= NESTING_EPSILON &&
    Math.abs(candidate.y - best.y) <= NESTING_EPSILON &&
    candidate.x < best.x - NESTING_EPSILON
  );
};

const isBetterCandidate = (
  candidate: PlacementCandidate,
  best: PlacementCandidate | null
) => {
  if (!best) {
    return true;
  }

  if (isBetterScore(candidate.score, best.score)) {
    return true;
  }

  return (
    !isBetterScore(best.score, candidate.score) &&
    candidate.rotationIndex < best.rotationIndex
  );
};

export interface PlacePartsGreedyOptions {
  preserveInputOrder?: boolean;
}

export function placePartsGreedy(
  parts: NestPart[],
  bin: PolygonShape,
  config: NestConfig,
  options: PlacePartsGreedyOptions = {}
): NestResult {
  const placements: NestPlacement[] = [];
  const notPlacedIds: string[] = [];
  const placedParts: PlacedPartState[] = [];
  const nfpCache = new NfpCache();
  const rotatedPartCache = new Map<string, PolygonShape>();
  const rotations = normalizeRotations(config.rotations);
  const orderedParts = options.preserveInputOrder
    ? [...parts]
    : [...parts].sort((a, b) => {
        const areaDiff = b.shape.area - a.shape.area;

        if (Math.abs(areaDiff) > NESTING_EPSILON) {
          return areaDiff;
        }

        return a.id.localeCompare(b.id);
      });
  const getNormalizedShapeForRotation = (
    sourcePart: NestPart,
    rotation: number
  ): PolygonShape => {
    const cacheKey = `${sourcePart.id}|${rotation}`;
    const cached = rotatedPartCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    const normalized = normalizeShapeForRotation(sourcePart.shape, rotation);
    rotatedPartCache.set(cacheKey, normalized);
    return normalized;
  };

  for (const part of orderedParts) {
    let bestCandidate: PlacementCandidate | null = null;

    for (
      let rotationIndex = 0;
      rotationIndex < rotations.length;
      rotationIndex += 1
    ) {
      const rotation = rotations[rotationIndex];
      const normalizedShape = getNormalizedShapeForRotation(part, rotation);
      const innerFit = nfpCache.getOrBuild(
        {
          stationaryId: BIN_CACHE_ID,
          movingId: part.id,
          inside: true,
          stationaryRotation: 0,
          movingRotation: rotation,
          gap: config.gap,
        },
        () => buildInnerFitPolygon(bin, normalizedShape, config.gap)
      );
      const candidatePoints: Point[] = [
        ...innerFit.points,
        ...fallbackAnchorPoints(normalizedShape, bin),
        ...pairwiseVertexCandidates(bin, normalizedShape),
      ];

      placedParts.forEach((placedPart) => {
        const noFit = nfpCache.getOrBuild(
          {
            stationaryId: placedPart.id,
            movingId: part.id,
            inside: false,
            stationaryRotation: placedPart.rotation,
            movingRotation: rotation,
            gap: config.gap,
          },
          () =>
            buildNoFitPolygon(
              placedPart.normalizedShape,
              normalizedShape,
              config.gap
            )
        );

        noFit.points.forEach((point) => {
          candidatePoints.push({
            x: point.x + placedPart.x,
            y: point.y + placedPart.y,
          });
        });

        candidatePoints.push(
          ...pairwiseVertexCandidates(
            placedPart.normalizedShape,
            normalizedShape,
            placedPart.x,
            placedPart.y
          )
        );
      });

      const dedupedCandidates = limitCandidatePoints(
        dedupePoints(candidatePoints)
      );
      const minX = bin.bounds.minX - normalizedShape.bounds.minX;
      const minY = bin.bounds.minY - normalizedShape.bounds.minY;
      const maxX = bin.bounds.maxX - normalizedShape.bounds.maxX;
      const maxY = bin.bounds.maxY - normalizedShape.bounds.maxY;
      const placedShapes = placedParts.map((placedPart) => placedPart.shape);
      let foundForRotation: PlacementCandidate | null = null;

      for (const point of dedupedCandidates) {
        if (
          point.x < minX - NESTING_EPSILON ||
          point.x > maxX + NESTING_EPSILON ||
          point.y < minY - NESTING_EPSILON ||
          point.y > maxY + NESTING_EPSILON
        ) {
          continue;
        }

        const candidateShape = translateShape(
          normalizedShape,
          point.x,
          point.y
        );

        if (!isShapeInsideBin(candidateShape, bin, config.gap)) {
          continue;
        }

        const overlapsPlaced = placedShapes.some((placedShape) =>
          polygonsOverlap(candidateShape, placedShape, config.gap)
        );

        if (overlapsPlaced) {
          continue;
        }

        const candidate: PlacementCandidate = {
          placement: {
            id: part.id,
            x: point.x,
            y: point.y,
            rotation,
            shape: candidateShape,
          },
          score: scorePlacement(candidateShape, placedShapes),
          rotationIndex,
        };

        if (isBetterCandidate(candidate, foundForRotation)) {
          foundForRotation = candidate;
        }
      }

      if (
        foundForRotation &&
        isBetterCandidate(foundForRotation, bestCandidate)
      ) {
        bestCandidate = foundForRotation;
      }
    }

    if (!bestCandidate) {
      notPlacedIds.push(part.id);
      continue;
    }

    placements.push(bestCandidate.placement);
    placedParts.push({
      id: part.id,
      x: bestCandidate.placement.x,
      y: bestCandidate.placement.y,
      rotation: bestCandidate.placement.rotation,
      normalizedShape: getNormalizedShapeForRotation(
        part,
        bestCandidate.placement.rotation
      ),
      shape: bestCandidate.placement.shape,
    });
  }

  return {
    placements,
    notPlacedIds,
  };
}

import { buildInnerFitPolygon, buildNoFitPolygon } from '@/lib/nesting/nfp/nfp';
import { NfpCache } from '@/lib/nesting/nfp/nfp-cache';
import { translateShape } from '@/lib/nesting/polygon/polygon-math';
import {
  dedupePoints,
  fallbackAnchorPoints,
  limitCandidatePoints,
  pairwiseVertexCandidates,
} from '@/lib/nesting/placement/place-candidates';
import {
  buildHoleCandidatePoints,
  extractHoleRegions,
} from '@/lib/nesting/placement/place-hole-candidates';
import {
  isBetterCandidate,
  scorePlacement,
} from '@/lib/nesting/placement/place-score';
import {
  createCandidateBounds,
  isCandidateWithinBounds,
  isShapeInsideBin,
  overlapsPlacedShapes,
} from '@/lib/nesting/placement/place-validation';
import {
  normalizeRotations,
  normalizeShapeForRotation,
} from '@/lib/nesting/polygon/rotations';
import type {
  PlacementCandidate,
  PlacedPartState,
} from '@/lib/nesting/placement/place-types';
import type {
  NestConfig,
  NestPart,
  NestPlacement,
  NestResult,
  Point,
  PolygonShape,
} from '@/lib/nesting/polygon/types';
import { NESTING_EPSILON } from '@/lib/nesting/polygon/types';

const BIN_CACHE_ID = '__bin__';

export interface PlacementProgressSnapshot {
  processedParts: number;
  totalParts: number;
  placedParts: number;
  placements: NestPlacement[];
  notPlacedIds: string[];
}

export interface PlacePartsGreedyOptions {
  preserveInputOrder?: boolean;
  onPartProcessed?: (snapshot: PlacementProgressSnapshot) => void;
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
  const emitProgress = () => {
    if (!options.onPartProcessed) {
      return;
    }

    options.onPartProcessed({
      processedParts: placements.length + notPlacedIds.length,
      totalParts: orderedParts.length,
      placedParts: placements.length,
      placements: [...placements],
      notPlacedIds: [...notPlacedIds],
    });
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

        candidatePoints.push(
          ...buildHoleCandidatePoints(
            placedPart,
            normalizedShape,
            part.id,
            rotation,
            config.gap,
            nfpCache
          )
        );
      });

      const dedupedCandidates = limitCandidatePoints(
        dedupePoints(candidatePoints)
      );
      const candidateBounds = createCandidateBounds(bin, normalizedShape);
      const placedShapes = placedParts.map((placedPart) => placedPart.shape);
      let foundForRotation: PlacementCandidate | null = null;

      for (const point of dedupedCandidates) {
        if (!isCandidateWithinBounds(point, candidateBounds)) {
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

        if (overlapsPlacedShapes(candidateShape, placedShapes, config.gap)) {
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
      emitProgress();
      continue;
    }

    const placedNormalizedShape = getNormalizedShapeForRotation(
      part,
      bestCandidate.placement.rotation
    );

    placements.push(bestCandidate.placement);
    placedParts.push({
      id: part.id,
      x: bestCandidate.placement.x,
      y: bestCandidate.placement.y,
      rotation: bestCandidate.placement.rotation,
      normalizedShape: placedNormalizedShape,
      holeRegions: extractHoleRegions(placedNormalizedShape),
      shape: bestCandidate.placement.shape,
    });
    emitProgress();
  }

  return {
    placements,
    notPlacedIds,
  };
}

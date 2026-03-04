import {
  isShapeInsideBin,
  polygonsOverlap,
} from '@/lib/nesting/polygon/polygon-boolean';
import { insetShape, offsetShape } from '@/lib/nesting/polygon/polygon-offset';
import {
  createShape,
  translateShape,
} from '@/lib/nesting/polygon/polygon-math';
import {
  POINT_EPSILON,
  contourPoints,
  dedupePoints,
  pointKey,
  roundPointValue,
  sortByYThenX,
} from '@/lib/nesting/polygon/point-utils';
import type { Point, PolygonShape } from '@/lib/nesting/polygon/types';
import { NESTING_EPSILON } from '@/lib/nesting/polygon/types';

const MAX_AXIS_VALUES = 40;
const MAX_GRID_POINTS = 2_500;
const MAX_DIRECT_PAIR_POINTS = 6_000;
const MAX_LATTICE_POINTS = 6_000;
const MAX_NFP_SHAPE_POINTS = 24;
const MAX_CLASSIFIED_CANDIDATES = 500;
const MAX_CLASSIFIED_SHAPE_POINTS = 140;
const MAX_COARSE_NFP_POINTS = 600;
const MIN_PROBE_DISTANCE = 1e-3;

export interface NfpRegion {
  polygon: PolygonShape | null;
  points: Point[];
}

const samplePoints = (points: Point[], maxPoints: number): Point[] => {
  if (points.length <= maxPoints) {
    return points;
  }

  const step = Math.ceil(points.length / maxPoints);
  const sampled: Point[] = [];

  for (let i = 0; i < points.length; i += step) {
    sampled.push(points[i]);
  }

  let minXPoint = points[0];
  let maxXPoint = points[0];
  let minYPoint = points[0];
  let maxYPoint = points[0];

  points.forEach((point) => {
    if (point.x < minXPoint.x) {
      minXPoint = point;
    }
    if (point.x > maxXPoint.x) {
      maxXPoint = point;
    }
    if (point.y < minYPoint.y) {
      minYPoint = point;
    }
    if (point.y > maxYPoint.y) {
      maxYPoint = point;
    }
  });

  sampled.push(minXPoint, maxXPoint, minYPoint, maxYPoint);
  return dedupePoints(sampled).slice(0, maxPoints);
};

const sampledShapePoints = (shape: PolygonShape) =>
  samplePoints(contourPoints(shape), MAX_NFP_SHAPE_POINTS);

const shapeVertexCount = (shape: PolygonShape) =>
  shape.contours.reduce((count, contour) => count + contour.length, 0);

const shouldClassifyBoundary = (candidates: Point[], shapes: PolygonShape[]) =>
  candidates.length <= MAX_CLASSIFIED_CANDIDATES &&
  shapes.every(
    (shape) => shapeVertexCount(shape) <= MAX_CLASSIFIED_SHAPE_POINTS
  );

const coarseCandidates = (candidates: Point[]) =>
  samplePoints(
    [...candidates].sort(sortByYThenX),
    Math.min(MAX_COARSE_NFP_POINTS, candidates.length)
  );

const limitPairwisePointSets = (
  stationaryPoints: Point[],
  movingPoints: Point[]
): [Point[], Point[]] => {
  if (
    stationaryPoints.length === 0 ||
    movingPoints.length === 0 ||
    stationaryPoints.length * movingPoints.length <= MAX_DIRECT_PAIR_POINTS
  ) {
    return [stationaryPoints, movingPoints];
  }

  const scale = Math.sqrt(
    MAX_DIRECT_PAIR_POINTS / (stationaryPoints.length * movingPoints.length)
  );
  const stationaryLimit = Math.max(
    16,
    Math.floor(stationaryPoints.length * scale)
  );
  const movingLimit = Math.max(16, Math.floor(movingPoints.length * scale));

  return [
    samplePoints(stationaryPoints, stationaryLimit),
    samplePoints(movingPoints, movingLimit),
  ];
};

const reducedAxisValues = (values: number[]): number[] => {
  const uniqueSorted = Array.from(
    new Set(values.map((value) => roundPointValue(value)))
  ).sort((a, b) => a - b);

  if (uniqueSorted.length <= MAX_AXIS_VALUES) {
    return uniqueSorted;
  }

  const reduced = new Set<number>();
  const step = (uniqueSorted.length - 1) / (MAX_AXIS_VALUES - 1);

  for (let i = 0; i < MAX_AXIS_VALUES; i += 1) {
    reduced.add(uniqueSorted[Math.round(i * step)]);
  }

  return Array.from(reduced).sort((a, b) => a - b);
};

const translationLattice = (
  stationaryPoints: Point[],
  movingPoints: Point[]
): Point[] => {
  if (stationaryPoints.length === 0 || movingPoints.length === 0) {
    return [];
  }

  const [limitedStationaryPoints, limitedMovingPoints] = limitPairwisePointSets(
    stationaryPoints,
    movingPoints
  );
  const directPoints: Point[] = [];
  const xValues: number[] = [];
  const yValues: number[] = [];

  limitedStationaryPoints.forEach((stationaryPoint) => {
    limitedMovingPoints.forEach((movingPoint) => {
      const x = stationaryPoint.x - movingPoint.x;
      const y = stationaryPoint.y - movingPoint.y;

      directPoints.push({ x, y });
      xValues.push(x);
      yValues.push(y);
    });
  });

  const reducedX = reducedAxisValues(xValues);
  const reducedY = reducedAxisValues(yValues);
  const gridPoints: Point[] = [];

  if (reducedX.length * reducedY.length <= MAX_GRID_POINTS) {
    reducedX.forEach((x) => {
      reducedY.forEach((y) => {
        gridPoints.push({ x, y });
      });
    });
  }

  const lattice = dedupePoints([...directPoints, ...gridPoints]);

  if (lattice.length <= MAX_LATTICE_POINTS) {
    return lattice;
  }

  return samplePoints(lattice.sort(sortByYThenX), MAX_LATTICE_POINTS);
};

const resolveProbeDistance = (shapes: PolygonShape[]) => {
  const spans = shapes
    .flatMap((shape) => [shape.bounds.width, shape.bounds.height])
    .filter((span) => span > NESTING_EPSILON);

  if (spans.length === 0) {
    return MIN_PROBE_DISTANCE;
  }

  const minSpan = Math.min(...spans);
  return Math.max(Math.min(minSpan / 200, 1), MIN_PROBE_DISTANCE);
};

const DIRECTIONAL_OFFSETS: Point[] = [
  { x: -1, y: 0 },
  { x: 1, y: 0 },
  { x: 0, y: -1 },
  { x: 0, y: 1 },
];

const extractBoundaryPoints = (
  candidates: Point[],
  classifier: (point: Point) => boolean,
  probeDistance: number
): Point[] => {
  const stateCache = new Map<string, boolean>();

  const stateAt = (point: Point) => {
    const key = pointKey(point);
    const cached = stateCache.get(key);

    if (cached !== undefined) {
      return cached;
    }

    const state = classifier(point);
    stateCache.set(key, state);
    return state;
  };

  const boundary: Point[] = [];

  candidates.forEach((candidate) => {
    const state = stateAt(candidate);

    for (const offset of DIRECTIONAL_OFFSETS) {
      const neighbor = {
        x: candidate.x + offset.x * probeDistance,
        y: candidate.y + offset.y * probeDistance,
      };

      if (stateAt(neighbor) !== state) {
        boundary.push(candidate);
        break;
      }
    }
  });

  return dedupePoints(boundary);
};

const convexHull = (points: Point[]): Point[] => {
  if (points.length < 3) {
    return [];
  }

  const sorted = [...dedupePoints(points)].sort((a, b) => {
    if (Math.abs(a.x - b.x) > POINT_EPSILON) {
      return a.x - b.x;
    }

    return a.y - b.y;
  });

  const cross = (o: Point, a: Point, b: Point) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  const lower: Point[] = [];

  sorted.forEach((point) => {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], point) <=
        NESTING_EPSILON
    ) {
      lower.pop();
    }

    lower.push(point);
  });

  const upper: Point[] = [];

  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    const point = sorted[i];

    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], point) <=
        NESTING_EPSILON
    ) {
      upper.pop();
    }

    upper.push(point);
  }

  const hull = lower.slice(0, -1).concat(upper.slice(0, -1));
  return hull.length >= 3 ? hull : [];
};

const polygonFromPoints = (points: Point[]): PolygonShape | null => {
  const hull = convexHull(points);

  if (hull.length < 3) {
    return null;
  }

  const polygon = createShape([hull]);
  return polygon.area > NESTING_EPSILON ? polygon : null;
};

const fallbackCandidate = (
  candidates: Point[],
  classifier: (point: Point) => boolean
) => [...candidates].sort(sortByYThenX).find((point) => classifier(point));

const fitBoxAnchors = (
  minX: number,
  maxX: number,
  minY: number,
  maxY: number
): Point[] => {
  if (
    maxX < minX - NESTING_EPSILON ||
    maxY < minY - NESTING_EPSILON ||
    !Number.isFinite(minX) ||
    !Number.isFinite(maxX) ||
    !Number.isFinite(minY) ||
    !Number.isFinite(maxY)
  ) {
    return [];
  }

  return dedupePoints([
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: minX, y: maxY },
    { x: maxX, y: maxY },
    { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
  ]);
};

export function buildInnerFitPolygon(
  bin: PolygonShape,
  part: PolygonShape,
  gap = 0
): NfpRegion {
  const insetBin = gap > NESTING_EPSILON ? insetShape(bin, gap) : bin;
  const useInsetBin = insetBin.contours.length > 0;
  const targetBin = useInsetBin ? insetBin : bin;
  const effectiveGap = useInsetBin ? 0 : gap;
  const candidates = translationLattice(
    sampledShapePoints(targetBin),
    sampledShapePoints(part)
  );

  if (candidates.length === 0) {
    return { polygon: null, points: [] };
  }

  const minX = targetBin.bounds.minX - part.bounds.minX;
  const maxX = targetBin.bounds.maxX - part.bounds.maxX;
  const minY = targetBin.bounds.minY - part.bounds.minY;
  const maxY = targetBin.bounds.maxY - part.bounds.maxY;
  const inside = (point: Point) =>
    isShapeInsideBin(
      translateShape(part, point.x, point.y),
      targetBin,
      effectiveGap
    );
  const boundedCandidates = dedupePoints([
    ...candidates.filter(
      (point) =>
        point.x >= minX - NESTING_EPSILON &&
        point.x <= maxX + NESTING_EPSILON &&
        point.y >= minY - NESTING_EPSILON &&
        point.y <= maxY + NESTING_EPSILON
    ),
    ...fitBoxAnchors(minX, maxX, minY, maxY),
  ]);

  if (boundedCandidates.length === 0) {
    return { polygon: null, points: [] };
  }

  if (!shouldClassifyBoundary(boundedCandidates, [targetBin, part])) {
    const coarse = coarseCandidates(boundedCandidates);
    let points = coarse.filter((point) => inside(point));

    if (points.length === 0) {
      const fallback = fallbackCandidate(boundedCandidates, inside);
      points = fallback ? [fallback] : [];
    }

    return {
      polygon: polygonFromPoints(points),
      points,
    };
  }

  const probeDistance = resolveProbeDistance([targetBin, part]);
  let points = extractBoundaryPoints(
    boundedCandidates,
    inside,
    probeDistance
  ).filter((point) => inside(point));

  if (points.length === 0) {
    const fallback = fallbackCandidate(boundedCandidates, inside);
    points = fallback ? [fallback] : [];
  }

  return {
    polygon: polygonFromPoints(points),
    points,
  };
}

export function buildNoFitPolygon(
  stationary: PolygonShape,
  moving: PolygonShape,
  gap = 0
): NfpRegion {
  const expandedStationary =
    gap > NESTING_EPSILON ? offsetShape(stationary, gap) : stationary;
  const useExpandedStationary = expandedStationary.contours.length > 0;
  const obstacle = useExpandedStationary ? expandedStationary : stationary;
  const effectiveGap = useExpandedStationary ? 0 : gap;
  const candidates = translationLattice(
    sampledShapePoints(obstacle),
    sampledShapePoints(moving)
  );

  if (candidates.length === 0) {
    return { polygon: null, points: [] };
  }

  if (!shouldClassifyBoundary(candidates, [obstacle, moving])) {
    const points = coarseCandidates(candidates);
    return {
      polygon: polygonFromPoints(points),
      points,
    };
  }

  const probeDistance = resolveProbeDistance([obstacle, moving]);
  const overlaps = (point: Point) =>
    polygonsOverlap(
      obstacle,
      translateShape(moving, point.x, point.y),
      effectiveGap
    );

  let points = extractBoundaryPoints(
    candidates,
    overlaps,
    probeDistance
  ).filter((point) => !overlaps(point));

  if (points.length === 0) {
    const fallback = fallbackCandidate(candidates, (point) => !overlaps(point));
    points = fallback ? [fallback] : [];
  }

  return {
    polygon: polygonFromPoints(points),
    points,
  };
}

import makerjs, { IModel, IModelMap, type IChain, type IPoint } from 'makerjs';
import {
  normalizeContour,
  normalizeShape,
} from '@/lib/nesting/polygon-cleanup';
import { createShape, translateShape } from '@/lib/nesting/polygon-math';
import {
  NESTING_EPSILON,
  type Contour,
  type NestPart,
  type PolygonShape,
} from '@/lib/nesting/types';

const MIN_CURVE_TOLERANCE = 1e-4;
const MAX_CONTOUR_POINTS = 120;

const toPoint = (point: IPoint) => ({
  x: point[0],
  y: point[1],
});

const isLinePathType = (pathType: unknown) =>
  typeof pathType === 'string' && pathType.toLowerCase() === 'line';

const chainContainsCurves = (chain: IChain) =>
  (chain.links ?? []).some(
    (link) => !isLinePathType(link.walkedPath?.pathContext?.type)
  );

const reduceContourDensity = (contour: Contour): Contour => {
  if (contour.length <= MAX_CONTOUR_POINTS) {
    return contour;
  }

  const step = Math.ceil(contour.length / MAX_CONTOUR_POINTS);
  const keepIndices = new Set<number>();

  for (let i = 0; i < contour.length; i += step) {
    keepIndices.add(i);
  }

  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let minXIndex = 0;
  let maxXIndex = 0;
  let minYIndex = 0;
  let maxYIndex = 0;

  contour.forEach((point, index) => {
    if (point.x < minX) {
      minX = point.x;
      minXIndex = index;
    }

    if (point.x > maxX) {
      maxX = point.x;
      maxXIndex = index;
    }

    if (point.y < minY) {
      minY = point.y;
      minYIndex = index;
    }

    if (point.y > maxY) {
      maxY = point.y;
      maxYIndex = index;
    }
  });

  keepIndices.add(minXIndex);
  keepIndices.add(maxXIndex);
  keepIndices.add(minYIndex);
  keepIndices.add(maxYIndex);

  return [...keepIndices].sort((a, b) => a - b).map((index) => contour[index]);
};

const chainToContour = (chain: IChain, curveTolerance: number) => {
  const contour = makerjs.chain
    .toKeyPoints(chain, Math.max(curveTolerance, MIN_CURVE_TOLERANCE))
    .map(toPoint);

  if (!chainContainsCurves(chain)) {
    return contour;
  }

  return reduceContourDensity(contour);
};

const flattenChains = (
  chains: ReturnType<typeof makerjs.model.findChains>
): IChain[] => {
  if (Array.isArray(chains)) {
    return chains;
  }

  return Object.values(chains).flat();
};

export function modelToPolygonShape(
  model: IModel,
  curveTolerance = 1
): PolygonShape | null {
  const chains = flattenChains(makerjs.model.findChains(model));

  const contours = chains
    .filter((chain) => chain.endless)
    .map((chain) => normalizeContour(chainToContour(chain, curveTolerance)))
    .filter((contour) => contour.length >= 3);

  if (contours.length === 0) {
    return null;
  }

  const normalized = normalizeShape(createShape(contours));

  if (normalized.contours.length === 0 || normalized.area <= NESTING_EPSILON) {
    return null;
  }

  const shifted = translateShape(
    normalized,
    -normalized.bounds.minX,
    -normalized.bounds.minY
  );
  const finalShape = normalizeShape(shifted);

  if (
    finalShape.contours.length === 0 ||
    finalShape.bounds.width <= NESTING_EPSILON ||
    finalShape.bounds.height <= NESTING_EPSILON
  ) {
    return null;
  }

  return finalShape;
}

export interface ModelMapToNestPartsResult {
  parts: NestPart[];
  invalidModels: IModelMap;
}

export function modelMapToNestParts(
  models: IModelMap,
  curveTolerance = 1
): ModelMapToNestPartsResult {
  const parts: NestPart[] = [];
  const invalidModels: IModelMap = {};

  Object.entries(models).forEach(([id, model]) => {
    const shape = modelToPolygonShape(model, curveTolerance);

    if (!shape) {
      invalidModels[id] = model;
      return;
    }

    parts.push({
      id,
      sourceModel: model,
      shape,
    });
  });

  parts.sort((a, b) => {
    const areaDiff = b.shape.area - a.shape.area;

    if (Math.abs(areaDiff) > NESTING_EPSILON) {
      return areaDiff;
    }

    return a.id.localeCompare(b.id);
  });

  return {
    parts,
    invalidModels,
  };
}

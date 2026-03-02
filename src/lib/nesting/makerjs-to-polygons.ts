import makerjs, { IModel, IModelMap, type IChain, type IPoint } from 'makerjs';
import {
  normalizeContour,
  normalizeShape,
} from '@/lib/nesting/polygon-cleanup';
import { createShape, translateShape } from '@/lib/nesting/polygon-math';
import {
  NESTING_EPSILON,
  type NestPart,
  type PolygonShape,
} from '@/lib/nesting/types';

const MIN_CURVE_TOLERANCE = 1e-4;

const toPoint = (point: IPoint) => ({
  x: point[0],
  y: point[1],
});

const chainToContour = (chain: IChain, curveTolerance: number) =>
  makerjs.chain
    .toKeyPoints(chain, Math.max(curveTolerance, MIN_CURVE_TOLERANCE))
    .map(toPoint);

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

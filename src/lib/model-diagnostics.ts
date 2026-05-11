import makerjs, { type IModel } from 'makerjs';
import { modelToPolygonShape } from '@/lib/nesting/polygon/makerjs-to-polygons';

export interface ModelBoundsSummary {
  low: [number, number];
  high: [number, number];
  width: number;
  height: number;
  area: number;
}

export interface ModelDiagnostics {
  bounds: ModelBoundsSummary | null;
  layers: string[];
  contourCount: number;
  canNest: boolean;
  warnings: string[];
}

const round = (value: number) => Number(value.toFixed(3));

const collectLayers = (model: IModel, layers = new Set<string>()) => {
  const modelLayer = (model as { layer?: unknown }).layer;

  if (typeof modelLayer === 'string' && modelLayer.trim()) {
    layers.add(modelLayer);
  }

  Object.values(model.paths ?? {}).forEach((path) => {
    const pathLayer = (path as { layer?: unknown }).layer;

    if (typeof pathLayer === 'string' && pathLayer.trim()) {
      layers.add(pathLayer);
    }
  });

  Object.values(model.models ?? {}).forEach((child) =>
    collectLayers(child, layers)
  );

  return layers;
};

export const createModelDiagnostics = (
  model: IModel,
  curveTolerance = 1
): ModelDiagnostics => {
  const extents = makerjs.measure.modelExtents(model);
  const shape = modelToPolygonShape(model, curveTolerance);
  const layers = [...collectLayers(model)].sort((a, b) => a.localeCompare(b));
  const warnings: string[] = [];

  if (!extents) {
    warnings.push('No measurable geometry');
  }

  if (!shape) {
    warnings.push('No closed nesting contour');
  }

  const bounds = extents
    ? {
        low: [round(extents.low[0]), round(extents.low[1])] as [number, number],
        high: [round(extents.high[0]), round(extents.high[1])] as [
          number,
          number,
        ],
        width: round(extents.high[0] - extents.low[0]),
        height: round(extents.high[1] - extents.low[1]),
        area: round(
          (extents.high[0] - extents.low[0]) *
            (extents.high[1] - extents.low[1])
        ),
      }
    : null;

  return {
    bounds,
    layers: layers.length > 0 ? layers : ['default'],
    contourCount: shape?.contours.length ?? 0,
    canNest: shape !== null,
    warnings,
  };
};

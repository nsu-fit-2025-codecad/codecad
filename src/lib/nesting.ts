import makerjs, { IModel, IModelMap } from 'makerjs';
import {
  modelMapToNestParts,
  modelToPolygonShape,
} from '@/lib/nesting/makerjs-to-polygons';
import { placePartsGreedy } from '@/lib/nesting/place';
import type { NestConfig } from '@/lib/nesting/types';

const EPSILON = 1e-9;
const DEFAULT_CURVE_TOLERANCE = 1;

export interface PackingOptions {
  gap?: number;
  allowRotation?: boolean;
  curveTolerance?: number;
  searchStep?: number;
}

export function packModelsIntoNestingArea(
  nestingArea: IModel,
  modelsToNest: IModelMap,
  options: PackingOptions = {}
) {
  const gap = Math.max(0, options.gap ?? 0);
  const allowRotation = options.allowRotation ?? true;
  const curveTolerance = Math.max(
    EPSILON,
    options.curveTolerance ?? DEFAULT_CURVE_TOLERANCE
  );

  const packedModels: IModelMap = {};
  const didNotFitModels: IModelMap = {};

  const nestingExtents = makerjs.measure.modelExtents(nestingArea);
  const nestingShape = modelToPolygonShape(nestingArea, curveTolerance);

  if (!nestingExtents || !nestingShape || nestingShape.area <= EPSILON) {
    return {
      packedModels,
      didNotFitModels: {
        ...didNotFitModels,
        ...modelsToNest,
      },
    };
  }

  const { parts, invalidModels } = modelMapToNestParts(
    modelsToNest,
    curveTolerance
  );
  Object.assign(didNotFitModels, invalidModels);

  if (parts.length === 0) {
    return {
      packedModels,
      didNotFitModels,
    };
  }

  const config: NestConfig = {
    gap,
    rotations: allowRotation ? [0, 90] : [0],
    curveTolerance,
    searchStep: options.searchStep,
  };

  const placementResult = placePartsGreedy(parts, nestingShape, config);
  const partById = new Map(parts.map((part) => [part.id, part]));

  placementResult.placements.forEach((placement) => {
    const part = partById.get(placement.id);

    if (!part) {
      return;
    }

    const packedModel = makerjs.model.clone(part.sourceModel);

    if (Math.abs(placement.rotation) > EPSILON) {
      makerjs.model.rotate(packedModel, placement.rotation, [0, 0]);
    }

    const packedExtents = makerjs.measure.modelExtents(packedModel);

    if (!packedExtents) {
      didNotFitModels[placement.id] = part.sourceModel;
      return;
    }

    const targetX = nestingExtents.low[0] + placement.x;
    const targetY = nestingExtents.low[1] + placement.y;

    makerjs.model.moveRelative(packedModel, [
      targetX - packedExtents.low[0],
      targetY - packedExtents.low[1],
    ]);

    packedModels[placement.id] = packedModel;
  });

  placementResult.notPlacedIds.forEach((id) => {
    const part = partById.get(id);

    if (!part) {
      return;
    }

    didNotFitModels[id] = part.sourceModel;
  });

  return { packedModels, didNotFitModels };
}

export interface PackModelsIntoTargetModelResult {
  packedIds: Set<string>;
  notFitIds: Set<string>;
  svgString: string;
}

export function packModelsIntoTargetModel(
  model: IModel | null,
  targetModelId: string,
  options: PackingOptions = {}
): PackModelsIntoTargetModelResult | null {
  if (!model || !model.models) {
    return null;
  }

  const nestingArea = model.models[targetModelId];

  if (!nestingArea) {
    return null;
  }

  const modelsToNest: IModelMap = {};

  Object.entries(model.models).forEach(([modelId, nestingCandidate]) => {
    if (modelId === targetModelId) {
      return;
    }

    modelsToNest[modelId] = nestingCandidate;
  });

  if (Object.keys(modelsToNest).length === 0) {
    return null;
  }

  const { packedModels, didNotFitModels } = packModelsIntoNestingArea(
    nestingArea,
    modelsToNest,
    options
  );

  model.models = {
    [targetModelId]: nestingArea,
    ...packedModels,
    ...didNotFitModels,
  };

  return {
    packedIds: new Set(Object.keys(packedModels)),
    notFitIds: new Set(Object.keys(didNotFitModels)),
    svgString: makerjs.exporter.toSVG(model, {
      useSvgPathOnly: false,
    }),
  };
}

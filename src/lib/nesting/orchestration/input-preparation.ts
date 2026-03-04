import makerjs, { IModel, IModelMap } from 'makerjs';
import {
  modelMapToNestParts,
  modelToPolygonShape,
} from '@/lib/nesting/polygon/makerjs-to-polygons';
import { NESTING_EPSILON } from '@/lib/nesting/polygon/types';
import type { PreparedNestInput } from '@/lib/nesting/orchestration/runtime-types';
import type { NormalizedPackingOptions } from '@/lib/nesting/orchestration/runtime-types';

export interface PrepareNestInputResult {
  prepared: PreparedNestInput | null;
  didNotFitModels: IModelMap;
}

export const prepareNestInput = (
  sourceModel: IModel,
  targetModelId: string,
  options: NormalizedPackingOptions
): PrepareNestInputResult => {
  if (!sourceModel.models) {
    return {
      prepared: null,
      didNotFitModels: {},
    };
  }

  const nestingArea = sourceModel.models[targetModelId];

  if (!nestingArea) {
    return {
      prepared: null,
      didNotFitModels: {},
    };
  }

  const modelsToNest: IModelMap = {};

  Object.entries(sourceModel.models).forEach(([modelId, candidate]) => {
    if (modelId === targetModelId) {
      return;
    }

    modelsToNest[modelId] = candidate;
  });

  const nestingExtents = makerjs.measure.modelExtents(nestingArea);
  const nestingShape = modelToPolygonShape(nestingArea, options.curveTolerance);

  if (
    !nestingExtents ||
    !nestingShape ||
    nestingShape.area <= NESTING_EPSILON
  ) {
    return {
      prepared: null,
      didNotFitModels: { ...modelsToNest },
    };
  }

  const { parts, invalidModels } = modelMapToNestParts(
    modelsToNest,
    options.curveTolerance
  );

  if (parts.length === 0) {
    return {
      prepared: null,
      didNotFitModels: invalidModels,
    };
  }

  return {
    prepared: {
      nestingArea,
      nestingShape,
      nestingExtents,
      parts,
      invalidModels,
      sourceModel,
      targetModelId,
    },
    didNotFitModels: invalidModels,
  };
};

import makerjs, { IModelMap } from 'makerjs';
import { NESTING_EPSILON } from '@/lib/nesting/polygon/types';
import type {
  AssembledNestResult,
  NestAssemblyContext,
} from '@/lib/nesting/orchestration/runtime-types';

export const applyPlacementToModelMap = ({
  prepared,
  placementResult,
}: NestAssemblyContext): AssembledNestResult => {
  const packedModels: IModelMap = {};
  const didNotFitModels: IModelMap = { ...prepared.invalidModels };
  const partById = new Map(prepared.parts.map((part) => [part.id, part]));

  placementResult.placements.forEach((placement) => {
    const part = partById.get(placement.id);

    if (!part) {
      return;
    }

    const packedModel = makerjs.model.clone(part.sourceModel);

    if (Math.abs(placement.rotation) > NESTING_EPSILON) {
      makerjs.model.rotate(packedModel, placement.rotation, [0, 0]);
    }

    const packedExtents = makerjs.measure.modelExtents(packedModel);

    if (!packedExtents) {
      didNotFitModels[placement.id] = part.sourceModel;
      return;
    }

    const targetX = prepared.nestingExtents.low[0] + placement.x;
    const targetY = prepared.nestingExtents.low[1] + placement.y;

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

  return {
    packedModels,
    didNotFitModels,
  };
};

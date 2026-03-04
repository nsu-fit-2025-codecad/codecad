import makerjs, { IModelMap } from 'makerjs';
import { layoutModelsInOverflowArea } from '@/lib/nesting/orchestration/overflow-layout';
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
  const overflowCandidates: IModelMap = { ...prepared.invalidModels };
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
      overflowCandidates[placement.id] = part.sourceModel;
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

    overflowCandidates[id] = part.sourceModel;
  });

  return {
    packedModels,
    didNotFitModels: layoutModelsInOverflowArea(
      overflowCandidates,
      prepared.nestingExtents
    ),
  };
};

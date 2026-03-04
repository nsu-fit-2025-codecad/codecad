import makerjs, { IModelMap } from 'makerjs';

const OVERFLOW_AREA_GAP = 12;
const OVERFLOW_PART_GAP = 6;

export const layoutModelsInOverflowArea = (
  modelsById: IModelMap,
  nestingExtents: makerjs.IMeasure | null | undefined
): IModelMap => {
  const overflowModels: IModelMap = {};
  const orderedIds = Object.keys(modelsById).sort((left, right) =>
    left.localeCompare(right)
  );
  const overflowOriginX = (nestingExtents?.high[0] ?? 0) + OVERFLOW_AREA_GAP;
  const overflowTopY = nestingExtents?.low[1] ?? 0;
  const maxColumnHeight = Math.max(
    nestingExtents ? nestingExtents.high[1] - nestingExtents.low[1] : 0,
    1
  );
  const maxColumnBottom = overflowTopY + maxColumnHeight;
  let overflowCursorX = overflowOriginX;
  let overflowCursorY = overflowTopY;
  let currentColumnWidth = 0;

  orderedIds.forEach((id) => {
    const sourceModel = modelsById[id];
    const overflowModel = makerjs.model.clone(sourceModel);
    const extents = makerjs.measure.modelExtents(overflowModel);

    if (extents) {
      const modelWidth = extents.high[0] - extents.low[0];
      const modelHeight = extents.high[1] - extents.low[1];
      const wouldOverflowColumn =
        overflowCursorY > overflowTopY &&
        overflowCursorY + modelHeight > maxColumnBottom;

      if (wouldOverflowColumn) {
        overflowCursorX += currentColumnWidth + OVERFLOW_PART_GAP;
        overflowCursorY = overflowTopY;
        currentColumnWidth = 0;
      }

      makerjs.model.moveRelative(overflowModel, [
        overflowCursorX - extents.low[0],
        overflowCursorY - extents.low[1],
      ]);

      currentColumnWidth = Math.max(currentColumnWidth, modelWidth);
      overflowCursorY += modelHeight + OVERFLOW_PART_GAP;
    }

    overflowModels[id] = overflowModel;
  });

  return overflowModels;
};

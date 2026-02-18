import makerjs, { IModelMap } from 'makerjs';

export const mapModelsToSizes = (models: IModelMap) => {
  return Object.entries(models).flatMap(([modelId, model]) => {
    const extents = makerjs.measure.modelExtents(model);

    if (!extents) {
      return [];
    }

    const width = extents.high[0] - extents.low[0];
    const height = extents.high[1] - extents.low[1];

    return [
      {
        id: modelId,
        model,
        width,
        height,
        extents,
        area: width * height,
      },
    ];
  });
};

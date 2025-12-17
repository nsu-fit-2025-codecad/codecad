import makerjs, { IModelMap } from 'makerjs';

export const mapModelsToSizes = (models: IModelMap) => {
  return Object.entries(models).map(([modelId, model]) => {
    const extents = makerjs.measure.modelExtents(model);

    const width = extents.high[0] - extents.low[0];
    const height = extents.high[1] - extents.low[1];

    return {
      id: modelId,
      model: model,
      width: width,
      height: height,
      extents: extents,
      area: width * height,
    };
  });
};

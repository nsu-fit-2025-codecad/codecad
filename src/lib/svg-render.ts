import makerjs, { IModel } from 'makerjs';

export const MODEL_FILL_ATTRIBUTE = 'data-model-fill';
export const MODEL_FILL_FOR_ATTRIBUTE = 'data-model-fill-for';
export const MODEL_FILL_OVERLAY_ATTRIBUTE = 'data-model-fill-overlay';

const ROOT_MODEL_FILL_ID = '__root__';
const MODEL_FILL_RULE = 'evenodd';
const MODEL_FILL_OPACITY = '0.2';
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const ROOT_MODEL_GROUP_SELECTOR = 'g#svgGroup';
const OUTLINE_SVG_OPTIONS = { useSvgPathOnly: false } as const;
const SVG_PATH_DATA_OPTIONS = { fillRule: MODEL_FILL_RULE } as const;
const SVG_PATH_DATA_BY_LAYER_OPTIONS = {
  byLayers: true,
  fillRule: MODEL_FILL_RULE,
} as const;
const INCLUDED_LAYER_PREFIX = 'included::';
const EXCLUDED_LAYER_PREFIX = 'excluded::';

interface ModelFillLayer {
  modelId: string;
  pathData: string;
  color: string;
}

export interface RenderModelToSvgOptions {
  filledModelIds?: Iterable<string>;
  excludedModelIds?: Iterable<string>;
}

export const renderModelToSvg = (
  model: IModel,
  options: RenderModelToSvgOptions = {}
): string => {
  const renderableModel = buildRenderableModel(model, options.excludedModelIds);
  const outlineSvg = makerjs.exporter.toSVG(
    renderableModel,
    OUTLINE_SVG_OPTIONS
  );
  const filledModelIds = resolveFilledModelIds(
    renderableModel,
    options.filledModelIds
  );

  if (filledModelIds.size === 0) {
    return outlineSvg;
  }

  const fillLayers = buildModelFillLayers(renderableModel, filledModelIds);

  if (fillLayers.length === 0) {
    return outlineSvg;
  }

  return injectFillLayers(outlineSvg, fillLayers);
};

export const getStableModelFillColor = (modelId: string): string => {
  const hash = hashString(modelId || ROOT_MODEL_FILL_ID);
  const hue = hash % 360;
  const saturation = 58 + ((hash >>> 8) % 18);
  const lightness = 52 + ((hash >>> 16) % 8);
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

const buildModelFillLayers = (
  model: IModel,
  filledModelIds: Set<string>
): ModelFillLayer[] => {
  if (!model.models || Object.keys(model.models).length === 0) {
    return buildRootFillLayer(model, filledModelIds);
  }

  return buildTopLevelFillLayers(model, filledModelIds);
};

const buildRootFillLayer = (
  model: IModel,
  filledModelIds: Set<string>
): ModelFillLayer[] => {
  if (!filledModelIds.has(ROOT_MODEL_FILL_ID)) {
    return [];
  }

  const pathData = makerjs.exporter.toSVGPathData(model, SVG_PATH_DATA_OPTIONS);

  if (typeof pathData !== 'string') {
    return [];
  }

  const fillLayer = createModelFillLayer(ROOT_MODEL_FILL_ID, pathData);
  return fillLayer ? [fillLayer] : [];
};

const buildTopLevelFillLayers = (
  model: IModel,
  filledModelIds: Set<string>
): ModelFillLayer[] => {
  const topLevelModelIds = Object.keys(model.models ?? {});
  const requestedModelIds = topLevelModelIds.filter((modelId) =>
    filledModelIds.has(modelId)
  );

  if (requestedModelIds.length === 0) {
    return [];
  }

  const layeredModel = makerjs.model.clone(model);
  const layeredModelMap = layeredModel.models ?? {};

  topLevelModelIds.forEach((modelId) => {
    const modelEntry = layeredModelMap[modelId];

    if (!modelEntry) {
      return;
    }

    const layerId = filledModelIds.has(modelId)
      ? toIncludedLayerId(modelId)
      : toExcludedLayerId(modelId);
    applyLayerRecursively(modelEntry, layerId);
  });

  const byLayerPathData = makerjs.exporter.toSVGPathData(
    layeredModel,
    SVG_PATH_DATA_BY_LAYER_OPTIONS
  );

  if (typeof byLayerPathData === 'string') {
    return [];
  }

  return requestedModelIds
    .map((modelId) =>
      createModelFillLayer(modelId, byLayerPathData[toIncludedLayerId(modelId)])
    )
    .flatMap((fillLayer) => (fillLayer ? [fillLayer] : []));
};

const applyLayerRecursively = (model: IModel, layerId: string): void => {
  model.layer = layerId;

  if (model.paths) {
    Object.values(model.paths).forEach((path) => {
      path.layer = layerId;
    });
  }

  if (model.models) {
    Object.values(model.models).forEach((childModel) => {
      applyLayerRecursively(childModel, layerId);
    });
  }
};

const createModelFillLayer = (
  modelId: string,
  pathData: string | undefined
): ModelFillLayer | null => {
  if (typeof pathData !== 'string' || pathData.trim().length === 0) {
    return null;
  }

  return {
    modelId,
    pathData,
    color: getStableModelFillColor(modelId),
  };
};

const normalizeModelIdSet = (
  modelIds: Iterable<string> | undefined
): Set<string> => {
  if (!modelIds) {
    return new Set<string>();
  }

  return new Set(
    Array.from(modelIds).filter(
      (modelId): modelId is string => typeof modelId === 'string'
    )
  );
};

const buildRenderableModel = (
  model: IModel,
  excludedModelIds: Iterable<string> | undefined
): IModel => {
  const excludedModelIdSet = normalizeModelIdSet(excludedModelIds);

  if (
    excludedModelIdSet.size === 0 ||
    !model.models ||
    Object.keys(model.models).length === 0
  ) {
    return model;
  }

  const filteredEntries = Object.entries(model.models).filter(
    ([modelId]) => !excludedModelIdSet.has(modelId)
  );

  if (filteredEntries.length === Object.keys(model.models).length) {
    return model;
  }

  const clonedModel = makerjs.model.clone(model);
  clonedModel.models = Object.fromEntries(
    Object.entries(clonedModel.models ?? {}).filter(
      ([modelId]) => !excludedModelIdSet.has(modelId)
    )
  );
  return clonedModel;
};

const resolveFilledModelIds = (
  model: IModel,
  providedFilledModelIds: Iterable<string> | undefined
): Set<string> => {
  if (providedFilledModelIds !== undefined) {
    return normalizeModelIdSet(providedFilledModelIds);
  }

  if (model.models && Object.keys(model.models).length > 0) {
    return new Set(Object.keys(model.models));
  }

  return new Set([ROOT_MODEL_FILL_ID]);
};

const injectFillLayers = (
  outlineSvg: string,
  fillLayers: ModelFillLayer[]
): string => {
  const domResult = injectFillLayersWithDomParser(outlineSvg, fillLayers);

  if (domResult !== null) {
    return domResult;
  }

  return injectFillLayersWithTagPatch(outlineSvg, fillLayers);
};

const injectFillLayersWithDomParser = (
  outlineSvg: string,
  fillLayers: ModelFillLayer[]
): string | null => {
  if (
    typeof DOMParser === 'undefined' ||
    typeof XMLSerializer === 'undefined'
  ) {
    return null;
  }

  try {
    const parser = new DOMParser();
    const document = parser.parseFromString(outlineSvg, 'image/svg+xml');
    const rootNode = document.documentElement;

    if (
      !rootNode ||
      rootNode.nodeName.toLowerCase() !== 'svg' ||
      document.getElementsByTagName('parsererror').length > 0
    ) {
      return outlineSvg;
    }

    const rootGroup = document.querySelector(ROOT_MODEL_GROUP_SELECTOR);

    if (!rootGroup) {
      return outlineSvg;
    }

    const fillOverlayGroup = document.createElementNS(SVG_NAMESPACE, 'g');
    fillOverlayGroup.setAttribute(MODEL_FILL_OVERLAY_ATTRIBUTE, 'true');
    fillOverlayGroup.setAttribute('pointer-events', 'none');

    fillLayers.forEach((fillLayer) => {
      fillOverlayGroup.appendChild(
        createModelFillLayerElement(document, fillLayer)
      );
    });

    rootGroup.insertBefore(fillOverlayGroup, rootGroup.firstChild);

    return new XMLSerializer().serializeToString(rootNode);
  } catch {
    return null;
  }
};

const injectFillLayersWithTagPatch = (
  outlineSvg: string,
  fillLayers: ModelFillLayer[]
): string => {
  const rootGroupTagMatch = findSvgGroupStartTagMatch(outlineSvg);

  if (!rootGroupTagMatch) {
    return outlineSvg;
  }

  const insertAt = (rootGroupTagMatch.index ?? 0) + rootGroupTagMatch[0].length;

  return (
    outlineSvg.slice(0, insertAt) +
    createFillOverlayMarkup(fillLayers) +
    outlineSvg.slice(insertAt)
  );
};

const createModelFillLayerElement = (
  document: Document,
  fillLayer: ModelFillLayer
): Element => {
  const modelFillGroup = document.createElementNS(SVG_NAMESPACE, 'g');
  modelFillGroup.setAttribute(MODEL_FILL_ATTRIBUTE, 'true');
  modelFillGroup.setAttribute(MODEL_FILL_FOR_ATTRIBUTE, fillLayer.modelId);
  modelFillGroup.setAttribute('pointer-events', 'none');

  const fillPath = document.createElementNS(SVG_NAMESPACE, 'path');
  fillPath.setAttribute('d', fillLayer.pathData);
  fillPath.setAttribute('fill', fillLayer.color);
  fillPath.setAttribute('fill-opacity', MODEL_FILL_OPACITY);
  fillPath.setAttribute('fill-rule', MODEL_FILL_RULE);
  fillPath.setAttribute('stroke', 'none');
  fillPath.setAttribute('pointer-events', 'none');

  modelFillGroup.appendChild(fillPath);

  return modelFillGroup;
};

const createFillOverlayMarkup = (fillLayers: ModelFillLayer[]): string => {
  const modelFillMarkup = fillLayers
    .map((fillLayer) => createModelFillLayerMarkup(fillLayer))
    .join('');

  return `<g ${MODEL_FILL_OVERLAY_ATTRIBUTE}="true" pointer-events="none">${modelFillMarkup}</g>`;
};

const createModelFillLayerMarkup = (fillLayer: ModelFillLayer): string => {
  return `<g ${MODEL_FILL_ATTRIBUTE}="true" ${MODEL_FILL_FOR_ATTRIBUTE}="${escapeAttributeValue(fillLayer.modelId)}" pointer-events="none"><path d="${escapeAttributeValue(fillLayer.pathData)}" fill="${escapeAttributeValue(fillLayer.color)}" fill-opacity="${MODEL_FILL_OPACITY}" fill-rule="${MODEL_FILL_RULE}" stroke="none" pointer-events="none"/></g>`;
};

const findSvgGroupStartTagMatch = (svgString: string): RegExpExecArray | null =>
  /<g\b[^>]*\sid=(['"])svgGroup\1[^>]*>/i.exec(svgString);

const toIncludedLayerId = (modelId: string): string =>
  `${INCLUDED_LAYER_PREFIX}${modelId}`;

const toExcludedLayerId = (modelId: string): string =>
  `${EXCLUDED_LAYER_PREFIX}${modelId}`;

const hashString = (value: string): number => {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

const escapeAttributeValue = (value: string): string => {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
};

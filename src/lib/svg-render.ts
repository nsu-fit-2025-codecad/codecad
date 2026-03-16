import makerjs, { IModel } from 'makerjs';
import { hashString } from '@/lib/nesting/utils/random';

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
  const filledModelIds = resolveFilledModelIds(
    renderableModel,
    options.filledModelIds
  );

  if (hasTopLevelModels(renderableModel)) {
    return renderTopLevelModelsToSvg(renderableModel, filledModelIds);
  }

  const outlineSvg = makerjs.exporter.toSVG(
    renderableModel,
    OUTLINE_SVG_OPTIONS
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

const hasTopLevelModels = (model: IModel): boolean =>
  Boolean(model.models && Object.keys(model.models).length > 0);

const renderTopLevelModelsToSvg = (
  model: IModel,
  filledModelIds: Set<string>
): string => {
  const rootExtents = makerjs.measure.modelExtents(model);

  if (!rootExtents) {
    return makerjs.exporter.toSVG(model, OUTLINE_SVG_OPTIONS);
  }

  const rootOffsetX = -rootExtents.low[0];
  const rootHighY = rootExtents.high[1];
  const width = rootExtents.high[0] - rootExtents.low[0];
  const height = rootExtents.high[1] - rootExtents.low[1];
  const fillLayers = buildTopLevelFillLayers(model, filledModelIds);
  const outlineMarkup = Object.entries(model.models ?? {})
    .map(([modelId, modelEntry]) =>
      createTopLevelOutlineMarkup(modelId, modelEntry, rootOffsetX, rootHighY)
    )
    .join('');
  const fillMarkup =
    fillLayers.length > 0 ? createFillOverlayMarkup(fillLayers) : '';

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="${SVG_NAMESPACE}"><g id="svgGroup" stroke-linecap="round" fill-rule="${MODEL_FILL_RULE}" font-size="9pt" stroke="#000" stroke-width="0.25mm" fill="none" style="stroke:#000;stroke-width:0.25mm;fill:none">${fillMarkup}<g id="0">${outlineMarkup}</g></g></svg>`;
};

const createTopLevelOutlineMarkup = (
  modelId: string,
  modelEntry: IModel,
  rootOffsetX: number,
  rootHighY: number
): string => {
  const pathData = makerjs.exporter.toSVGPathData(
    makerjs.model.clone(modelEntry),
    false,
    [rootOffsetX, rootHighY]
  );

  if (typeof pathData !== 'string' || pathData.trim().length === 0) {
    return `<g id="${escapeAttributeValue(modelId)}"></g>`;
  }

  return `<g id="${escapeAttributeValue(modelId)}"><path d="${escapeAttributeValue(pathData)}" vector-effect="non-scaling-stroke"/></g>`;
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
  const requestedModelIds = Object.keys(model.models ?? {}).filter((modelId) =>
    filledModelIds.has(modelId)
  );
  const rootExtents = makerjs.measure.modelExtents(model);

  if (requestedModelIds.length === 0 || !rootExtents) {
    return [];
  }

  return requestedModelIds
    .map((modelId) =>
      buildTopLevelFillLayer(
        model,
        modelId,
        -rootExtents.low[0],
        rootExtents.high[1]
      )
    )
    .flatMap((fillLayer) => (fillLayer ? [fillLayer] : []));
};

const buildTopLevelFillLayer = (
  model: IModel,
  modelId: string,
  rootOffsetX: number,
  rootHighY: number
): ModelFillLayer | null => {
  const modelEntry = model.models?.[modelId];

  if (!modelEntry) {
    return null;
  }

  const pathData = makerjs.exporter.toSVGPathData(
    makerjs.model.clone(modelEntry),
    false,
    [rootOffsetX, rootHighY]
  );

  return typeof pathData === 'string'
    ? createModelFillLayer(modelId, pathData)
    : null;
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

const escapeAttributeValue = (value: string): string => {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
};

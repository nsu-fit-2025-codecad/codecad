import makerjs, { IModel } from 'makerjs';

export type DxfExportScope =
  | 'all'
  | 'selected'
  | 'packed'
  | 'not-fit'
  | 'custom';

export interface DxfExportRequest {
  model: IModel | null;
  scope: DxfExportScope;
  selectedModelId?: string | null;
  targetModelId?: string | null;
  packedModelIds?: Iterable<string>;
  notFitModelIds?: Iterable<string>;
  customModelIds?: Iterable<string>;
  includeTargetModel?: boolean;
  filenamePrefix?: string;
}

export interface DxfExportValidationResult {
  modelIds: string[];
  selectedCount: number;
  errors: string[];
  warnings: string[];
}

export interface DxfExportResult {
  dxf: string;
  filename: string;
  validation: DxfExportValidationResult;
}

export const DXF_EXPORT_OPTIONS = {
  units: 'Millimeter',
  usePOLYLINE: true,
} as const;

const DEFAULT_FILENAME_PREFIX = 'codecad';

export const getTopLevelModelIds = (model: IModel | null): string[] =>
  Object.keys(model?.models ?? {});

export const resolveDxfExportModelIds = ({
  model,
  scope,
  selectedModelId,
  targetModelId,
  packedModelIds,
  notFitModelIds,
  customModelIds,
  includeTargetModel = false,
}: DxfExportRequest): string[] => {
  const availableModelIds = new Set(getTopLevelModelIds(model));
  const filterExisting = (modelIds: Iterable<string> | undefined) =>
    Array.from(modelIds ?? []).filter((modelId) =>
      availableModelIds.has(modelId)
    );

  let modelIds: string[];

  if (scope === 'selected') {
    modelIds = selectedModelId ? filterExisting([selectedModelId]) : [];
  } else if (scope === 'packed') {
    modelIds = filterExisting(packedModelIds);
  } else if (scope === 'not-fit') {
    modelIds = filterExisting(notFitModelIds);
  } else if (scope === 'custom') {
    modelIds = filterExisting(customModelIds);
  } else {
    modelIds = getTopLevelModelIds(model);
  }

  if (
    includeTargetModel &&
    targetModelId &&
    availableModelIds.has(targetModelId)
  ) {
    modelIds = [...modelIds, targetModelId];
  }

  return Array.from(new Set(modelIds));
};

export const validateDxfExportRequest = (
  request: DxfExportRequest
): DxfExportValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const availableModelIds = getTopLevelModelIds(request.model);
  const modelIds = resolveDxfExportModelIds(request);

  if (!request.model) {
    errors.push('No model is available to export.');
  }

  if (request.model && availableModelIds.length > 0 && modelIds.length === 0) {
    errors.push('No models are selected for export.');
  }

  if (request.scope === 'selected' && !request.selectedModelId) {
    warnings.push('No highlighted model is selected.');
  }

  if (request.scope === 'packed' && modelIds.length === 0) {
    warnings.push('No packed models are available from the last nesting run.');
  }

  if (request.scope === 'not-fit' && modelIds.length > 0) {
    warnings.push(
      'This export contains models that did not fit during nesting.'
    );
  }

  if (request.model && request.includeTargetModel && !request.targetModelId) {
    warnings.push('No nesting target is available to include.');
  }

  if (request.model) {
    const exportModel = createDxfExportModel(request, modelIds);
    const extents = makerjs.measure.modelExtents(exportModel);

    if (!extents) {
      errors.push('Selected models do not contain measurable geometry.');
    }
  }

  return {
    modelIds,
    selectedCount: modelIds.length,
    errors,
    warnings,
  };
};

export const createDxfExport = (request: DxfExportRequest): DxfExportResult => {
  const validation = validateDxfExportRequest(request);

  if (validation.errors.length > 0 || !request.model) {
    throw new Error(validation.errors[0] ?? 'DXF export is not available.');
  }

  const exportModel = createDxfExportModel(request, validation.modelIds);
  const dxf = makerjs.exporter.toDXF(exportModel, DXF_EXPORT_OPTIONS);

  if (dxf.trim().length === 0) {
    throw new Error('DXF export produced an empty file.');
  }

  return {
    dxf,
    filename: createDxfFilename(request),
    validation: {
      ...validation,
      warnings: [
        ...validation.warnings,
        ...(dxf.includes('SECTION')
          ? []
          : ['Generated DXF does not contain the expected SECTION marker.']),
      ],
    },
  };
};

const createDxfExportModel = (
  request: DxfExportRequest,
  modelIds: string[]
): IModel => {
  if (!request.model) {
    return {};
  }

  const topLevelModels = request.model.models ?? {};

  if (Object.keys(topLevelModels).length === 0) {
    return makerjs.model.clone(request.model);
  }

  return {
    models: Object.fromEntries(
      modelIds.flatMap((modelId) => {
        const modelEntry = topLevelModels[modelId];
        return modelEntry ? [[modelId, makerjs.model.clone(modelEntry)]] : [];
      })
    ),
  };
};

const createDxfFilename = ({
  filenamePrefix = DEFAULT_FILENAME_PREFIX,
  scope,
}: DxfExportRequest) => {
  const normalizedPrefix = filenamePrefix.trim() || DEFAULT_FILENAME_PREFIX;
  return `${normalizedPrefix}_${scope}_${Date.now()}.dxf`;
};

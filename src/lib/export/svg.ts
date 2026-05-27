import { renderModelToSvg } from '@/lib/svg-render';
import {
  type DxfExportRequest,
  getTopLevelModelIds,
  resolveDxfExportModelIds,
  validateDxfExportRequest,
  type DxfExportValidationResult,
} from '@/lib/export/dxf';

export interface SvgExportRequest {
  svgString: string;
  filenamePrefix?: string;
  now?: Date;
}

export interface SvgModelExportRequest extends DxfExportRequest {
  now?: Date;
}

export interface SvgExportResult {
  svg: string;
  filename: string;
  validation?: DxfExportValidationResult;
}

const sanitizeFilenamePart = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export const createSvgExport = ({
  svgString,
  filenamePrefix = 'codecad',
  now = new Date(),
}: SvgExportRequest): SvgExportResult => {
  if (!svgString.trim()) {
    throw new Error('No SVG preview to export.');
  }

  if (!/<svg[\s>]/i.test(svgString)) {
    throw new Error('Current preview is not valid SVG.');
  }

  const prefix = sanitizeFilenamePart(filenamePrefix) || 'codecad';
  const timestamp = now.toISOString().replace(/[-:]/g, '').replace(/\..+$/, '');

  return {
    svg: svgString,
    filename: `${prefix}_${timestamp}.svg`,
  };
};

export const createSvgModelExport = (
  request: SvgModelExportRequest
): SvgExportResult => {
  const validation = validateDxfExportRequest(request);

  if (validation.errors.length > 0 || !request.model) {
    throw new Error(validation.errors[0] ?? 'SVG export is not available.');
  }

  const selectedModelIds = new Set(resolveDxfExportModelIds(request));
  const excludedModelIds = getTopLevelModelIds(request.model).filter(
    (modelId) => !selectedModelIds.has(modelId)
  );
  const svgString = renderModelToSvg(request.model, { excludedModelIds });

  return {
    ...createSvgExport({
      svgString,
      filenamePrefix: request.filenamePrefix,
      now: request.now,
    }),
    validation,
  };
};

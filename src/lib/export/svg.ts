export interface SvgExportRequest {
  svgString: string;
  filenamePrefix?: string;
  now?: Date;
}

export interface SvgExportResult {
  svg: string;
  filename: string;
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

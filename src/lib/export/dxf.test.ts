import { describe, expect, it } from 'vitest';
import makerjs, { IModel } from 'makerjs';
import {
  createDxfExport,
  resolveDxfExportModelIds,
  validateDxfExportRequest,
} from '@/lib/export/dxf';

const rectangle = (width = 10, height = 5): IModel =>
  new makerjs.models.Rectangle(width, height);

const createRootModel = (): IModel => ({
  models: {
    sheet: rectangle(100, 60),
    bracket: rectangle(10, 10),
    spacer: rectangle(8, 4),
    overflow: rectangle(12, 12),
  },
});

describe('DXF export', () => {
  it('resolves all top-level models for the default scope', () => {
    expect(
      resolveDxfExportModelIds({
        model: createRootModel(),
        scope: 'all',
      })
    ).toEqual(['sheet', 'bracket', 'spacer', 'overflow']);
  });

  it('resolves the highlighted model for selected exports', () => {
    expect(
      resolveDxfExportModelIds({
        model: createRootModel(),
        scope: 'selected',
        selectedModelId: 'bracket',
      })
    ).toEqual(['bracket']);
  });

  it('resolves packed models with the optional target sheet', () => {
    expect(
      resolveDxfExportModelIds({
        model: createRootModel(),
        scope: 'packed',
        packedModelIds: ['bracket', 'spacer'],
        targetModelId: 'sheet',
        includeTargetModel: true,
      })
    ).toEqual(['bracket', 'spacer', 'sheet']);
  });

  it('rejects missing custom model ids with an empty export selection', () => {
    const validation = validateDxfExportRequest({
      model: createRootModel(),
      scope: 'custom',
      customModelIds: ['missing'],
    });

    expect(validation.errors).toContain('No models are selected for export.');
  });

  it('generates non-empty DXF with current defaults', () => {
    const result = createDxfExport({
      model: createRootModel(),
      scope: 'custom',
      customModelIds: ['bracket'],
      filenamePrefix: 'drawing',
    });

    expect(result.dxf).toContain('SECTION');
    expect(result.dxf).toContain('$INSUNITS');
    expect(result.dxf).toContain('POLYLINE');
    expect(result.filename).toMatch(/^drawing_custom_\d+\.dxf$/);
    expect(result.validation.modelIds).toEqual(['bracket']);
  });

  it('blocks empty geometry', () => {
    const validation = validateDxfExportRequest({
      model: { models: { empty: {} } },
      scope: 'all',
    });

    expect(validation.errors).toContain(
      'Selected models do not contain measurable geometry.'
    );
  });
});

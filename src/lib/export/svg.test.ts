import { describe, expect, it } from 'vitest';
import makerjs, { IModel } from 'makerjs';
import { createSvgExport, createSvgModelExport } from '@/lib/export/svg';

const rectangle = (width = 10, height = 5): IModel =>
  new makerjs.models.Rectangle(width, height);

const createRootModel = (): IModel => ({
  models: {
    sheet: rectangle(100, 60),
    bracket: rectangle(10, 10),
    spacer: rectangle(8, 4),
  },
});

describe('createSvgExport', () => {
  it('creates a stable svg export filename', () => {
    const result = createSvgExport({
      svgString: '<svg viewBox="0 0 10 10"></svg>',
      filenamePrefix: 'My Project!',
      now: new Date('2026-05-12T01:02:03.000Z'),
    });

    expect(result.filename).toBe('my-project_20260512T010203.svg');
    expect(result.svg).toContain('<svg');
  });

  it('rejects empty or non-svg content', () => {
    expect(() => createSvgExport({ svgString: '' })).toThrow(
      'No SVG preview to export.'
    );
    expect(() => createSvgExport({ svgString: '<div />' })).toThrow(
      'Current preview is not valid SVG.'
    );
  });

  it('exports only selected top-level models from custom scope', () => {
    const result = createSvgModelExport({
      model: createRootModel(),
      scope: 'custom',
      customModelIds: ['bracket'],
      filenamePrefix: 'drawing',
      now: new Date('2026-05-12T01:02:03.000Z'),
    });

    expect(result.filename).toBe('drawing_20260512T010203.svg');
    expect(result.validation?.modelIds).toEqual(['bracket']);
    expect(result.svg).toContain('id="bracket"');
    expect(result.svg).not.toContain('id="sheet"');
    expect(result.svg).not.toContain('id="spacer"');
  });

  it('rejects empty model selections', () => {
    expect(() =>
      createSvgModelExport({
        model: createRootModel(),
        scope: 'custom',
        customModelIds: [],
      })
    ).toThrow('No models are selected for export.');
  });
});

import { describe, expect, it } from 'vitest';
import { createSvgExport } from '@/lib/export/svg';

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
});

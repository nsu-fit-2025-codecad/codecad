import { describe, expect, it } from 'vitest';
import makerjs from 'makerjs';
import { createModelDiagnostics } from '@/lib/model-diagnostics';

describe('createModelDiagnostics', () => {
  it('reports closed rectangle geometry as nesting ready', () => {
    const diagnostics = createModelDiagnostics(
      new makerjs.models.Rectangle(100, 50)
    );

    expect(diagnostics.canNest).toBe(true);
    expect(diagnostics.contourCount).toBe(1);
    expect(diagnostics.bounds?.width).toBe(100);
    expect(diagnostics.bounds?.height).toBe(50);
    expect(diagnostics.warnings).toEqual([]);
  });

  it('reports open geometry as not nesting ready', () => {
    const diagnostics = createModelDiagnostics({
      paths: {
        line: new makerjs.paths.Line([0, 0], [100, 0]),
      },
    });

    expect(diagnostics.canNest).toBe(false);
    expect(diagnostics.contourCount).toBe(0);
    expect(diagnostics.warnings).toContain('No closed nesting contour');
  });

  it('collects model and path layers', () => {
    const model = new makerjs.models.Rectangle(20, 20);
    makerjs.model.layer(model, 'cut');
    model.paths!.guide = new makerjs.paths.Line([0, 0], [10, 0]);
    (model.paths!.guide as { layer?: string }).layer = 'etch';

    expect(createModelDiagnostics(model).layers).toEqual(['cut', 'etch']);
  });
});

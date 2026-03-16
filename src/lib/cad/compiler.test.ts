import makerjs from 'makerjs';
import { describe, expect, it } from 'vitest';
import { compileSketchToMaker, compileToMaker } from '@/lib/cad/compiler';
import { cad } from '@/lib/cad/runtime';

describe('compileToMaker', () => {
  it('creates a fresh Maker.js model on every compile', () => {
    const shape = cad.rect(20, 10).translate(5, 6);

    const first = compileToMaker(shape.getNode());
    const second = compileToMaker(shape.getNode());

    makerjs.model.moveRelative(first, [10, 10]);

    const firstExtents = makerjs.measure.modelExtents(first)!;
    const secondExtents = makerjs.measure.modelExtents(second)!;

    expect(first).not.toBe(second);
    expect(firstExtents.low).not.toEqual(secondExtents.low);
  });

  it('applies transforms and layer metadata', () => {
    const shape = cad
      .roundRect(40, 20, 4)
      .translate(15, 10)
      .rotate(90)
      .onLayer('cut');

    const model = compileToMaker(shape.getNode());
    const extents = makerjs.measure.modelExtents(model)!;

    expect(model.layer).toBe('cut');
    expect(extents.low[0]).toBeCloseTo(-30, 6);
    expect(extents.low[1]).toBeCloseTo(15, 6);
    expect(extents.high[0]).toBeCloseTo(-10, 6);
    expect(extents.high[1]).toBeCloseTo(55, 6);
  });

  it('compiles helper shapes and imported Maker.js models without reusing instances', () => {
    const face = cad.clockFace({
      radius: 30,
      rimWidth: 6,
      tickCount: 6,
      centerHole: 4,
    });
    const imported = cad
      .fromSvgPathData('M0 0 L20 0 L10 12 Z')
      .centerAt([0, 0]);
    const combined = cad.sketch({
      face,
      imported,
      gear: cad.gear({
        teeth: 12,
        outerRadius: 22,
        rootRadius: 16,
        bore: 6,
      }),
    });

    const first = compileSketchToMaker(combined.getNode());
    const second = compileSketchToMaker(combined.getNode());

    makerjs.model.moveRelative(first.models!.imported, [10, 0]);

    const firstExtents = makerjs.measure.modelExtents(first.models!.imported)!;
    const secondExtents = makerjs.measure.modelExtents(
      second.models!.imported
    )!;

    expect(first.models?.face).not.toBe(second.models?.face);
    expect(firstExtents.low[0]).not.toBeCloseTo(secondExtents.low[0], 6);
  });
});

describe('compileSketchToMaker', () => {
  it('preserves sketch child ids as top-level Maker.js models', () => {
    const sketch = cad.sketch({
      base: cad.rect(100, 60),
      holeGuide: cad.circle(10).translate(25, 25),
    });

    const model = compileSketchToMaker(sketch.getNode());

    expect(Object.keys(model.models ?? {}).sort()).toEqual([
      'base',
      'holeGuide',
    ]);
  });

  it('preserves nested ids for helper assemblies', () => {
    const sketch = cad.sketch({
      panel: cad.panel({
        width: 100,
        height: 70,
        radius: 10,
        inset: { margin: 12, radius: 6 },
        holes: [{ kind: 'circle', x: 50, y: 35, radius: 5 }],
      }),
      clock: cad.clockFace({
        radius: 30,
        tickCount: 4,
        centerHole: 5,
      }),
    });

    const model = compileSketchToMaker(sketch.getNode());

    expect(Object.keys(model.models ?? {}).sort()).toEqual(['clock', 'panel']);
    expect(Object.keys(model.models?.panel?.models ?? {}).sort()).toEqual([
      'body',
      'inset',
    ]);
    expect(Object.keys(model.models?.clock?.models ?? {}).sort()).toEqual([
      'body',
      'rim',
      'ticks',
    ]);
  });
});

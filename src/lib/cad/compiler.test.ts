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
});

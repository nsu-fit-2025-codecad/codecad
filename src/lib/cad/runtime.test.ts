import makerjs from 'makerjs';
import { describe, expect, it } from 'vitest';
import { DEFAULT_EDITOR_CODE } from '@/store/store';
import {
  Assembly2D,
  cad,
  isMakerModelLike,
  normalizeEditorModelResult,
} from '@/lib/cad/runtime';

describe('normalizeEditorModelResult', () => {
  it('keeps legacy Maker.js models untouched', () => {
    const legacyModel = {
      models: {
        square: new makerjs.models.Rectangle(20, 20),
      },
    };

    const result = normalizeEditorModelResult(legacyModel);

    expect(result).toBe(legacyModel);
    expect(isMakerModelLike(result)).toBe(true);
  });

  it('compiles cad sketches into Maker.js models with stable child ids', () => {
    const sketch = cad.sketch({
      panel: cad.rect(100, 60),
      slot: cad
        .polyline(
          [
            [0, 0],
            [20, 0],
            [20, 5],
            [0, 5],
          ],
          { closed: true }
        )
        .translate(10, 10)
        .onLayer('etch'),
    });

    const model = normalizeEditorModelResult(sketch);
    const slot = model.models?.slot;

    expect(Object.keys(model.models ?? {}).sort()).toEqual(['panel', 'slot']);
    expect(slot?.layer).toBe('etch');
  });

  it('supports the editor runtime shape flow through new Function', () => {
    const createModel = new Function(
      'makerjs',
      'cad',
      `return (function () {
        return cad.sketch({
          outline: cad.rect(50, 30),
          marker: cad.circle(5).translate(10, 10)
        });
      })();`
    );

    const evaluated = createModel(makerjs, cad);
    const model = normalizeEditorModelResult(evaluated);

    expect(Object.keys(model.models ?? {}).sort()).toEqual([
      'marker',
      'outline',
    ]);
  });

  it('supports default busy-board editor example', () => {
    const createModel = new Function(
      'makerjs',
      'cad',
      `return (function () {
        ${DEFAULT_EDITOR_CODE}
      })();`
    );

    const evaluated = createModel(makerjs, cad);
    const model = normalizeEditorModelResult(evaluated);

    expect(Object.keys(model.models ?? {}).sort()).toEqual([
      'clock',
      'door',
      'gear',
      'maze',
    ]);
  });

  it('throws for non-model values', () => {
    expect(() => normalizeEditorModelResult('not-a-model')).toThrow(
      /must return a Maker\.js model/
    );
  });
});

describe('cad shape helpers', () => {
  it('supports booleans, anchors, and alignment helpers', () => {
    const base = cad.rect(100, 80);
    const windowCut = cad.rect(40, 20).centerAt([50, 40]);
    const knob = cad.circle(4).alignTo(base, 'center', 'right');
    const shape = base.cut(windowCut).union(knob);
    const model = normalizeEditorModelResult(shape);
    const extents = makerjs.measure.modelExtents(model)!;

    expect(extents.low[0]).toBeCloseTo(0, 6);
    expect(extents.low[1]).toBeCloseTo(0, 6);
    expect(extents.high[0]).toBeCloseTo(104, 6);
    expect(extents.high[1]).toBeCloseTo(80, 6);
  });

  it('supports pattern helpers and keeps stable child ids', () => {
    const ticks = cad
      .rect(10, 2)
      .moveTo([35, 0], 'center')
      .polarArray(6, 60, { rotateItems: true });
    const grid = cad.circle(3).grid(2, 2, 20, 20);
    const sketch = cad.sketch({
      ticks,
      grid,
    });
    const model = normalizeEditorModelResult(sketch);

    expect(Object.keys(model.models ?? {}).sort()).toEqual(['grid', 'ticks']);
    expect(Object.keys(model.models?.ticks?.models ?? {}).length).toBe(6);
    expect(Object.keys(model.models?.grid?.models ?? {}).length).toBe(4);
  });

  it('centers decorated assemblies by their placement body', () => {
    const decorated = new Assembly2D({
      kind: 'assembly',
      children: {
        body: cad.rect(40, 20).getNode(),
        guide: cad
          .circle(6)
          .moveTo([120, 10], 'center')
          .onLayer('etch')
          .getNode(),
      },
      placementChildId: 'body',
      metadata: {},
    });

    const centeredAt44 = normalizeEditorModelResult(
      decorated.centerAt([44, 45])
    );
    const centeredAt4 = normalizeEditorModelResult(decorated.centerAt([4, 45]));
    const aligned = normalizeEditorModelResult(
      decorated.alignTo(
        cad.rect(20, 20).moveTo([120, 45], 'center'),
        'left',
        'right'
      )
    );

    const centeredBody44 = getChildModelCenter(centeredAt44, 'body');
    const centeredBody4 = getChildModelCenter(centeredAt4, 'body');
    const alignedBody = getChildModelExtents(aligned, 'body');

    expect(centeredBody44[0]).toBeCloseTo(44, 6);
    expect(centeredBody44[1]).toBeCloseTo(45, 6);
    expect(centeredBody4[0]).toBeCloseTo(4, 6);
    expect(centeredBody4[1]).toBeCloseTo(45, 6);
    expect(centeredBody44[0] - centeredBody4[0]).toBeCloseTo(40, 6);
    expect(alignedBody.low[0]).toBeCloseTo(130, 6);
  });

  it('creates gears with non-degenerate tooth valleys', () => {
    const gear = cad.gear({
      teeth: 14,
      outerRadius: 34,
      rootRadius: 25,
    });
    const model = normalizeEditorModelResult(gear);
    const segmentLengths = Object.values(model.paths ?? {}).map((path) =>
      makerjs.measure.pathLength(path)
    );

    expect(Math.min(...segmentLengths)).toBeGreaterThan(0.01);
  });

  it('allows decorative gear fractions to meet exactly at 1', () => {
    const model = normalizeEditorModelResult(
      cad.gear({
        teeth: 12,
        outerRadius: 30,
        rootRadius: 20,
        toothFraction: 0.6,
        rootFraction: 0.4,
      })
    );
    const extents = makerjs.measure.modelExtents(model);

    expect(extents).not.toBeNull();
    expect(extents!.width).toBeGreaterThan(0);
    expect(extents!.height).toBeGreaterThan(0);
  });

  it('rejects decorative gear fractions only when they exceed 1', () => {
    expect(() =>
      cad.gear({
        teeth: 12,
        outerRadius: 30,
        rootRadius: 20,
        toothFraction: 0.71,
        rootFraction: 0.4,
      })
    ).toThrow(/toothFraction \+ rootFraction cannot exceed 1/);
  });
});

const getChildModelExtents = (
  parentModel: makerjs.IModel,
  childId: string
): makerjs.IMeasureWithCenter => {
  const childModel = parentModel.models?.[childId];

  if (!childModel) {
    throw new Error(`Missing child model: ${childId}`);
  }

  const extents = makerjs.measure.modelExtents(childModel)!;
  const origin = parentModel.origin ?? [0, 0];

  return {
    ...extents,
    low: [extents.low[0] + origin[0], extents.low[1] + origin[1]],
    high: [extents.high[0] + origin[0], extents.high[1] + origin[1]],
    center: [extents.center[0] + origin[0], extents.center[1] + origin[1]],
  };
};

const getChildModelCenter = (
  parentModel: makerjs.IModel,
  childId: string
): [number, number] => {
  const extents = getChildModelExtents(parentModel, childId);

  return [extents.center[0], extents.center[1]];
};

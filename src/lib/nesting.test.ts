import { describe, expect, it } from 'vitest';
import makerjs, { IModel } from 'makerjs';
import {
  packModelsIntoNestingArea,
  packModelsIntoTargetModel,
} from '@/lib/nesting';

const getSize = (model: IModel) => {
  const extents = makerjs.measure.modelExtents(model);

  if (!extents) {
    throw new Error('Model has no extents');
  }

  return {
    width: extents.high[0] - extents.low[0],
    height: extents.high[1] - extents.low[1],
  };
};

describe('packModelsIntoNestingArea', () => {
  it('packs with 90 degree rotation when enabled', () => {
    const target = new makerjs.models.Rectangle(100, 80);
    const part = new makerjs.models.Rectangle(70, 90);

    const withoutRotation = packModelsIntoNestingArea(
      target,
      { part },
      { allowRotation: false }
    );

    expect(Object.keys(withoutRotation.packedModels)).toHaveLength(0);
    expect(Object.keys(withoutRotation.didNotFitModels)).toEqual(['part']);

    const withRotation = packModelsIntoNestingArea(
      target,
      { part },
      { allowRotation: true }
    );

    expect(Object.keys(withRotation.packedModels)).toEqual(['part']);
    expect(Object.keys(withRotation.didNotFitModels)).toHaveLength(0);

    const size = getSize(withRotation.packedModels.part);
    expect(size.width).toBeCloseTo(90, 6);
    expect(size.height).toBeCloseTo(70, 6);
  });

  it('respects configured gap between parts', () => {
    const target = new makerjs.models.Rectangle(100, 100);
    const models = {
      a: new makerjs.models.Rectangle(50, 50),
      b: new makerjs.models.Rectangle(50, 50),
    };

    const noGap = packModelsIntoNestingArea(target, models, { gap: 0 });
    expect(Object.keys(noGap.packedModels)).toHaveLength(2);

    const withGap = packModelsIntoNestingArea(target, models, { gap: 1 });
    expect(Object.keys(withGap.packedModels)).toHaveLength(1);
    expect(Object.keys(withGap.didNotFitModels)).toHaveLength(1);
  });

  it('does not mutate source models when packing', () => {
    const target = new makerjs.models.Rectangle(200, 200);
    const source = new makerjs.models.Rectangle(40, 20);

    makerjs.model.moveRelative(source, [30, 45]);
    const before = makerjs.measure.modelExtents(source)!;

    const result = packModelsIntoNestingArea(target, { source });
    const after = makerjs.measure.modelExtents(source)!;

    expect(result.packedModels.source).toBeDefined();
    expect(result.packedModels.source).not.toBe(source);
    expect(after.low[0]).toBeCloseTo(before.low[0], 6);
    expect(after.low[1]).toBeCloseTo(before.low[1], 6);
    expect(after.high[0]).toBeCloseTo(before.high[0], 6);
    expect(after.high[1]).toBeCloseTo(before.high[1], 6);
  });
});

describe('packModelsIntoTargetModel', () => {
  it('keeps models that did not fit in model.models and returns svg', () => {
    const sourceA = new makerjs.models.Rectangle(80, 80);
    const sourceB = new makerjs.models.Rectangle(80, 80);

    const root: IModel = {
      models: {
        target: new makerjs.models.Rectangle(100, 100),
        a: sourceA,
        b: sourceB,
      },
    };

    const beforeA = makerjs.measure.modelExtents(sourceA)!;

    const result = packModelsIntoTargetModel(root, 'target', {
      allowRotation: false,
    });

    expect(result).not.toBeNull();
    expect(result?.packedIds.size).toBe(1);
    expect(result?.notFitIds.size).toBe(1);
    expect(result?.svgString).toContain('<svg');

    expect(root.models).toBeDefined();
    expect(Object.keys(root.models ?? {}).sort()).toEqual(['a', 'b', 'target']);

    const afterA = makerjs.measure.modelExtents(sourceA)!;
    expect(afterA.low[0]).toBeCloseTo(beforeA.low[0], 6);
    expect(afterA.low[1]).toBeCloseTo(beforeA.low[1], 6);
  });
});

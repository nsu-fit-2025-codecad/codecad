import { describe, expect, it } from 'vitest';
import makerjs, { IModel, IModelMap } from 'makerjs';
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

const combinedPackedArea = (models: IModelMap) => {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let found = false;

  Object.values(models).forEach((model) => {
    const extents = makerjs.measure.modelExtents(model);

    if (!extents) {
      return;
    }

    found = true;
    minX = Math.min(minX, extents.low[0]);
    minY = Math.min(minY, extents.low[1]);
    maxX = Math.max(maxX, extents.high[0]);
    maxY = Math.max(maxY, extents.high[1]);
  });

  if (!found) {
    return Number.POSITIVE_INFINITY;
  }

  return (maxX - minX) * (maxY - minY);
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

  it('keeps curved ring placeable with small nonzero gap', () => {
    const target = new makerjs.models.Rectangle(900, 500);
    const models = {
      ring: {
        models: {
          outer: new makerjs.models.Oval(220, 220),
          inner: makerjs.model.move(
            new makerjs.models.Oval(120, 120),
            [50, 50]
          ),
        },
      },
      ovalPart: new makerjs.models.Oval(240, 120),
      capsule: {
        paths: {
          top: new makerjs.paths.Arc([100, 60], 60, 180, 360),
          right: new makerjs.paths.Line([160, 60], [160, 180]),
          bottom: new makerjs.paths.Arc([100, 180], 60, 0, 180),
          left: new makerjs.paths.Line([40, 180], [40, 60]),
        },
      },
      circleA: new makerjs.models.Oval(100, 100),
      circleB: new makerjs.models.Oval(80, 80),
    };

    const result = packModelsIntoNestingArea(target, models, {
      allowRotation: true,
      gap: 1,
    });

    expect(result.packedModels.ring).toBeDefined();
    expect(result.didNotFitModels.ring).toBeUndefined();
  }, 20_000);

  it('GA orchestration improves or preserves deterministic quality', () => {
    const target = new makerjs.models.Rectangle(140, 100);
    const models = {
      concave: {
        paths: {
          a: new makerjs.paths.Line([0, 0], [80, 0]),
          b: new makerjs.paths.Line([80, 0], [80, 40]),
          c: new makerjs.paths.Line([80, 40], [40, 40]),
          d: new makerjs.paths.Line([40, 40], [40, 80]),
          e: new makerjs.paths.Line([40, 80], [0, 80]),
          f: new makerjs.paths.Line([0, 80], [0, 0]),
        },
      },
      plug: new makerjs.models.Rectangle(40, 40),
      barA: new makerjs.models.Rectangle(20, 30),
      barB: new makerjs.models.Rectangle(30, 20),
    };

    const deterministic = packModelsIntoNestingArea(target, models, {
      allowRotation: true,
      useGeneticSearch: false,
    });
    const withGa = packModelsIntoNestingArea(target, models, {
      allowRotation: true,
      useGeneticSearch: true,
      populationSize: 8,
      maxGenerations: 2,
      mutationRate: 0.25,
      crossoverRate: 0.85,
      geneticSeed: 1234,
    });
    const deterministicPackedCount = Object.keys(
      deterministic.packedModels
    ).length;
    const gaPackedCount = Object.keys(withGa.packedModels).length;

    expect(gaPackedCount).toBeGreaterThanOrEqual(deterministicPackedCount);

    if (gaPackedCount === deterministicPackedCount && gaPackedCount > 0) {
      expect(combinedPackedArea(withGa.packedModels)).toBeLessThanOrEqual(
        combinedPackedArea(deterministic.packedModels) + 1e-6
      );
    }
  });

  it('handles malformed GA numeric options without crashing', () => {
    const target = new makerjs.models.Rectangle(120, 80);
    const models = {
      a: new makerjs.models.Rectangle(60, 30),
      b: new makerjs.models.Rectangle(50, 30),
      c: new makerjs.models.Rectangle(20, 20),
    };

    expect(() =>
      packModelsIntoNestingArea(target, models, {
        allowRotation: true,
        useGeneticSearch: true,
        populationSize: Number.NaN,
        maxGenerations: Number.POSITIVE_INFINITY,
        mutationRate: Number.NaN,
        crossoverRate: Number.NEGATIVE_INFINITY,
        eliteCount: Number.NaN,
        geneticSeed: Number.NaN,
      })
    ).not.toThrow();

    const result = packModelsIntoNestingArea(target, models, {
      allowRotation: true,
      useGeneticSearch: true,
      populationSize: Number.NaN,
      maxGenerations: Number.POSITIVE_INFINITY,
      mutationRate: Number.NaN,
      crossoverRate: Number.NEGATIVE_INFINITY,
      eliteCount: Number.NaN,
      geneticSeed: Number.NaN,
    });

    expect(
      Object.keys(result.packedModels).length +
        Object.keys(result.didNotFitModels).length
    ).toBe(Object.keys(models).length);
  });

  it('returns run stats and emits progress updates', () => {
    const target = new makerjs.models.Rectangle(100, 100);
    const models = {
      a: new makerjs.models.Rectangle(45, 45),
      b: new makerjs.models.Rectangle(45, 45),
    };
    const progressEvents: number[] = [];

    const result = packModelsIntoNestingArea(
      target,
      models,
      {
        useGeneticSearch: false,
      },
      {
        onProgress: (progress) => {
          progressEvents.push(progress.progress);
        },
      }
    );

    expect(result.stats.algorithm).toBe('deterministic');
    expect(result.stats.placedCount + result.stats.notFitCount).toBe(
      Object.keys(models).length
    );
    expect(result.stats.durationMs).toBeGreaterThanOrEqual(0);
    expect(progressEvents.length).toBeGreaterThan(0);
    expect(progressEvents[progressEvents.length - 1]).toBe(1);
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

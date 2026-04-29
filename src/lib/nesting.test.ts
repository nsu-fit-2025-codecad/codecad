import { describe, expect, it } from 'vitest';
import makerjs, { IModel, IModelMap } from 'makerjs';
import {
  packModelsIntoNestingArea,
  packModelsIntoTargetModel,
} from '@/lib/nesting';
import { compareFitness } from '@/lib/nesting/genetic/fitness';
import type { FitnessScore } from '@/lib/nesting/genetic/fitness';

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

const getExtentsOrThrow = (model: IModel) => {
  const extents = makerjs.measure.modelExtents(model);

  if (!extents) {
    throw new Error('Model has no extents');
  }

  return extents;
};

const extentsOverlap = (left: makerjs.IMeasure, right: makerjs.IMeasure) => {
  const xOverlap = left.low[0] < right.high[0] && right.low[0] < left.high[0];
  const yOverlap = left.low[1] < right.high[1] && right.low[1] < left.high[1];

  return xOverlap && yOverlap;
};

const extractViewBox = (svgString: string): string => {
  const viewBoxMatch = svgString.match(/\bviewBox="([^"]+)"/i);

  if (!viewBoxMatch) {
    throw new Error('SVG does not contain a viewBox');
  }

  return viewBoxMatch[1];
};

const extractViewBoxSize = (svgString: string) => {
  const values = extractViewBox(svgString)
    .trim()
    .split(/\s+/)
    .map((value) => Number.parseFloat(value));

  if (values.length !== 4 || values.some((value) => Number.isNaN(value))) {
    throw new Error('SVG viewBox is malformed');
  }

  return {
    width: values[2],
    height: values[3],
  };
};

describe('packModelsIntoNestingArea', () => {
  it('packs with 90 degree rotation when enabled', () => {
    const target = new makerjs.models.Rectangle(100, 80);
    const part = new makerjs.models.Rectangle(70, 90);

    const withoutRotation = packModelsIntoNestingArea(
      target,
      { part },
      { allowRotation: false, rotationCount: 4 }
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

  it('resolves rotationCount into discrete orientation sets', () => {
    const target = new makerjs.models.Rectangle(100, 80);
    const part = new makerjs.models.Rectangle(70, 90);

    const oneOrientation = packModelsIntoNestingArea(
      target,
      { part },
      {
        rotationCount: 1,
        useGeneticSearch: false,
      }
    );
    const quarterTurns = packModelsIntoNestingArea(
      target,
      { part },
      {
        rotationCount: 4,
        useGeneticSearch: false,
      }
    );

    expect(Object.keys(oneOrientation.packedModels)).toHaveLength(0);
    expect(Object.keys(oneOrientation.didNotFitModels)).toEqual(['part']);
    expect(Object.keys(quarterTurns.packedModels)).toEqual(['part']);
    expect(Object.keys(quarterTurns.didNotFitModels)).toHaveLength(0);
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

  it('repositions not-fit models into overflow when preparation fails', () => {
    const target: IModel = {
      paths: {
        top: new makerjs.paths.Line([0, 0], [100, 0]),
      },
    };
    const models = {
      a: new makerjs.models.Rectangle(30, 30),
      b: new makerjs.models.Rectangle(20, 20),
    };

    const result = packModelsIntoNestingArea(target, models, {
      useGeneticSearch: false,
    });

    expect(Object.keys(result.packedModels)).toHaveLength(0);
    expect(Object.keys(result.didNotFitModels).sort()).toEqual(['a', 'b']);

    const targetExtents = getExtentsOrThrow(target);
    const overflowA = getExtentsOrThrow(result.didNotFitModels.a);
    const overflowB = getExtentsOrThrow(result.didNotFitModels.b);

    expect(overflowA.low[0]).toBeGreaterThan(targetExtents.high[0]);
    expect(overflowB.low[0]).toBeGreaterThan(targetExtents.high[0]);
    expect(extentsOverlap(overflowA, overflowB)).toBe(false);
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
      useGeneticSearch: false,
    });

    expect(result.packedModels.ring).toBeDefined();
    expect(result.didNotFitModels.ring).toBeUndefined();
  }, 20_000);

  it('GA orchestration improves or preserves deterministic quality', () => {
    const target = new makerjs.models.Rectangle(140, 100);
    const models = {
      a: new makerjs.models.Rectangle(36, 32),
      b: {
        paths: {
          a: new makerjs.paths.Line([0, 0], [75, 0]),
          b: new makerjs.paths.Line([75, 0], [75, 41]),
          c: new makerjs.paths.Line([75, 41], [35, 41]),
          d: new makerjs.paths.Line([35, 41], [35, 79]),
          e: new makerjs.paths.Line([35, 79], [0, 79]),
          f: new makerjs.paths.Line([0, 79], [0, 0]),
        },
      },
      c: new makerjs.models.Rectangle(43, 36),
      d: new makerjs.models.Rectangle(20, 30),
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

  it('emits deterministic incremental progress with partial preview snapshots', () => {
    const target = new makerjs.models.Rectangle(100, 100);
    const sourceA = new makerjs.models.Rectangle(50, 50);
    const sourceB = new makerjs.models.Rectangle(50, 50);

    makerjs.model.moveRelative(sourceA, [12, 8]);
    makerjs.model.moveRelative(sourceB, [32, 14]);
    const beforeA = makerjs.measure.modelExtents(sourceA)!;
    const beforeB = makerjs.measure.modelExtents(sourceB)!;
    const progressEvents: Array<{
      phase: string;
      progress: number;
      previewSvgString?: string;
      previewPackedIds?: string[];
    }> = [];

    const result = packModelsIntoNestingArea(
      target,
      { a: sourceA, b: sourceB },
      {
        gap: 1,
        useGeneticSearch: false,
      },
      {
        onProgress: (progress) => {
          progressEvents.push({
            phase: progress.phase,
            progress: progress.progress,
            previewSvgString: progress.preview?.svgString,
            previewPackedIds: progress.preview?.packedIds,
          });
        },
      }
    );

    const placingEvents = progressEvents.filter(
      (progressEvent) => progressEvent.phase === 'placing'
    );
    expect(placingEvents.length).toBeGreaterThan(1);
    placingEvents.reduce((previous, current) => {
      expect(current.progress).toBeGreaterThanOrEqual(previous);
      return current.progress;
    }, 0);

    const previewEvents = placingEvents.filter(
      (progressEvent) =>
        typeof progressEvent.previewSvgString === 'string' &&
        Array.isArray(progressEvent.previewPackedIds)
    );
    expect(previewEvents.length).toBeGreaterThan(0);
    expect(previewEvents[0].previewSvgString).toContain('<svg');
    expect(previewEvents[previewEvents.length - 1].previewPackedIds).toContain(
      'a'
    );
    expect(Object.keys(result.packedModels).length).toBeGreaterThan(0);

    const afterA = makerjs.measure.modelExtents(sourceA)!;
    const afterB = makerjs.measure.modelExtents(sourceB)!;
    expect(afterA.low[0]).toBeCloseTo(beforeA.low[0], 6);
    expect(afterA.low[1]).toBeCloseTo(beforeA.low[1], 6);
    expect(afterA.high[0]).toBeCloseTo(beforeA.high[0], 6);
    expect(afterA.high[1]).toBeCloseTo(beforeA.high[1], 6);
    expect(afterB.low[0]).toBeCloseTo(beforeB.low[0], 6);
    expect(afterB.low[1]).toBeCloseTo(beforeB.low[1], 6);
    expect(afterB.high[0]).toBeCloseTo(beforeB.high[0], 6);
    expect(afterB.high[1]).toBeCloseTo(beforeB.high[1], 6);
  });

  it('throttles deterministic preview rendering so it is not emitted per part', () => {
    const target = new makerjs.models.Rectangle(160, 160);
    const models: IModelMap = {};

    for (let index = 0; index < 12; index += 1) {
      models[`part-${index}`] = new makerjs.models.Rectangle(20, 20);
    }

    const progressEvents: Array<{
      phase: string;
      message: string;
      previewSvgString?: string;
    }> = [];

    const result = packModelsIntoNestingArea(
      target,
      models,
      {
        useGeneticSearch: false,
      },
      {
        onProgress: (progress) => {
          progressEvents.push({
            phase: progress.phase,
            message: progress.message,
            previewSvgString: progress.preview?.svgString,
          });
        },
      }
    );

    const placingPartEvents = progressEvents.filter(
      (progressEvent) =>
        progressEvent.phase === 'placing' &&
        progressEvent.message.startsWith('Placing parts (')
    );
    const previewEvents = placingPartEvents.filter(
      (progressEvent) => typeof progressEvent.previewSvgString === 'string'
    );

    expect(Object.keys(result.packedModels)).toHaveLength(12);
    expect(previewEvents.length).toBeGreaterThan(0);
    expect(previewEvents.length).toBeLessThan(placingPartEvents.length);
  });

  it('keeps GA previews at or above deterministic baseline and suppresses duplicate preview payloads', () => {
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
    let deterministicBaselinePreviewSvg: string | null = null;
    const deterministic = packModelsIntoNestingArea(
      target,
      models,
      {
        allowRotation: true,
        useGeneticSearch: false,
      },
      {
        onProgress: (progress) => {
          if (progress.phase === 'placing' && progress.preview?.svgString) {
            deterministicBaselinePreviewSvg = progress.preview.svgString;
          }
        },
      }
    );
    const progressEvents: Array<{
      phase: string;
      previewSvgString?: string;
      previewPackedIds?: string[];
      bestFitness?: FitnessScore;
    }> = [];

    const result = packModelsIntoNestingArea(
      target,
      models,
      {
        allowRotation: true,
        useGeneticSearch: true,
        populationSize: 6,
        maxGenerations: 2,
        mutationRate: 0.3,
        crossoverRate: 0.9,
        eliteCount: 2,
        geneticSeed: 17,
      },
      {
        onProgress: (progress) => {
          progressEvents.push({
            phase: progress.phase,
            previewSvgString: progress.preview?.svgString,
            previewPackedIds: progress.preview?.packedIds,
            bestFitness: progress.bestFitness,
          });
        },
      }
    );

    const geneticEvents = progressEvents.filter(
      (progressEvent) => progressEvent.phase === 'genetic'
    );
    const previewEvents = geneticEvents.filter(
      (progressEvent) =>
        typeof progressEvent.previewSvgString === 'string' &&
        Array.isArray(progressEvent.previewPackedIds)
    );
    const regressingPreviewEvents = geneticEvents.filter(
      (progressEvent) =>
        typeof progressEvent.previewSvgString === 'string' &&
        progressEvent.bestFitness !== undefined &&
        compareFitness(
          progressEvent.bestFitness,
          deterministic.stats.fitness
        ) >= 0
    );
    const previewSvgSet = new Set(
      previewEvents.map((progressEvent) => progressEvent.previewSvgString)
    );

    expect(deterministicBaselinePreviewSvg).toContain('<svg');
    expect(geneticEvents.length).toBeGreaterThan(0);
    if (previewEvents.length > 0) {
      expect(previewEvents[0].previewSvgString).toContain('<svg');
    }
    expect(regressingPreviewEvents).toHaveLength(0);
    expect(previewSvgSet.size).toBe(previewEvents.length);
    expect(result.stats.evaluations).toBeGreaterThan(0);
    expect(previewEvents.length).toBeLessThan(result.stats.evaluations ?? 0);
    const expectedAlgorithm =
      compareFitness(result.stats.fitness, deterministic.stats.fitness) < 0
        ? 'genetic'
        : 'deterministic';
    expect(result.stats.algorithm).toBe(expectedAlgorithm);
  });
});

describe('packModelsIntoTargetModel', () => {
  it('keeps overflow models visible with a compact deterministic layout', () => {
    const sourceA = new makerjs.models.Rectangle(80, 80);
    const sourceB = new makerjs.models.Rectangle(80, 80);
    const sourceC = new makerjs.models.Rectangle(80, 80);

    const root: IModel = {
      models: {
        target: new makerjs.models.Rectangle(100, 100),
        a: sourceA,
        b: sourceB,
        c: sourceC,
      },
    };

    const beforeA = getExtentsOrThrow(sourceA);
    const beforeB = getExtentsOrThrow(sourceB);
    const beforeC = getExtentsOrThrow(sourceC);

    const result = packModelsIntoTargetModel(root, 'target', {
      allowRotation: false,
    });

    expect(result).not.toBeNull();
    expect(result?.packedIds.size).toBe(1);
    expect(result?.packedIds.has('a')).toBe(true);
    expect(result?.notFitIds.size).toBe(2);
    expect(result?.notFitIds.has('b')).toBe(true);
    expect(result?.notFitIds.has('c')).toBe(true);
    expect(result?.svgString).toContain('<svg');
    expect(result?.svgString).toContain('data-model-fill-for="target"');
    expect(result?.svgString).toContain('data-model-fill-for="a"');
    expect(result?.svgString).toContain('data-model-fill-for="b"');
    expect(result?.svgString).toContain('data-model-fill-for="c"');

    expect(root.models).toBeDefined();
    expect(Object.keys(root.models ?? {}).sort()).toEqual([
      'a',
      'b',
      'c',
      'target',
    ]);

    const targetExtents = getExtentsOrThrow(root.models!.target);
    const packedExtents = getExtentsOrThrow(root.models!.a);
    const overflowBExtents = getExtentsOrThrow(root.models!.b);
    const overflowCExtents = getExtentsOrThrow(root.models!.c);
    const viewBoxSize = extractViewBoxSize(result!.svgString);

    expect(packedExtents.low[0]).toBeGreaterThanOrEqual(targetExtents.low[0]);
    expect(packedExtents.low[1]).toBeGreaterThanOrEqual(targetExtents.low[1]);
    expect(packedExtents.high[0]).toBeLessThanOrEqual(targetExtents.high[0]);
    expect(packedExtents.high[1]).toBeLessThanOrEqual(targetExtents.high[1]);

    expect(overflowBExtents.low[0]).toBeGreaterThan(targetExtents.high[0]);
    expect(overflowCExtents.low[0]).toBeGreaterThan(targetExtents.high[0]);
    expect(extentsOverlap(overflowBExtents, overflowCExtents)).toBe(false);
    expect(overflowBExtents.low[1]).toBeCloseTo(overflowCExtents.low[1], 6);
    expect(viewBoxSize.width).toBeLessThanOrEqual(targetExtents.width * 3.2);
    expect(viewBoxSize.height).toBeLessThanOrEqual(targetExtents.height * 1.6);

    const afterA = getExtentsOrThrow(sourceA);
    const afterB = getExtentsOrThrow(sourceB);
    const afterC = getExtentsOrThrow(sourceC);
    expect(afterA.low[0]).toBeCloseTo(beforeA.low[0], 6);
    expect(afterA.low[1]).toBeCloseTo(beforeA.low[1], 6);
    expect(afterA.high[0]).toBeCloseTo(beforeA.high[0], 6);
    expect(afterA.high[1]).toBeCloseTo(beforeA.high[1], 6);
    expect(afterB.low[0]).toBeCloseTo(beforeB.low[0], 6);
    expect(afterB.low[1]).toBeCloseTo(beforeB.low[1], 6);
    expect(afterB.high[0]).toBeCloseTo(beforeB.high[0], 6);
    expect(afterB.high[1]).toBeCloseTo(beforeB.high[1], 6);
    expect(afterC.low[0]).toBeCloseTo(beforeC.low[0], 6);
    expect(afterC.low[1]).toBeCloseTo(beforeC.low[1], 6);
    expect(afterC.high[0]).toBeCloseTo(beforeC.high[0], 6);
    expect(afterC.high[1]).toBeCloseTo(beforeC.high[1], 6);
  });
});

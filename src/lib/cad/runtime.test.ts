import makerjs from 'makerjs';
import { describe, expect, it } from 'vitest';
import { DEFAULT_EDITOR_CODE } from '@/store/store';
import {
  CAD_SNIPPETS,
  DEFAULT_EDITOR_SNIPPET_ID,
  getCadSnippetParameters,
  type CadSnippetId,
} from '@/lib/cad/snippets';
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

  it('supports the default editor scene example', () => {
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
      'board',
      'clock',
      'door',
      'maze',
      'rabbit',
    ]);
  });

  it('keeps DEFAULT_EDITOR_CODE in sync with the default snippet registry entry', () => {
    expect(DEFAULT_EDITOR_CODE).toBe(
      CAD_SNIPPETS[DEFAULT_EDITOR_SNIPPET_ID].code
    );
  });

  it('evaluates every cad snippet and the default editor scene with snippet parameters', () => {
    const snippetIds: CadSnippetId[] = Array.from(
      new Set<CadSnippetId>([
        ...(Object.keys(CAD_SNIPPETS) as CadSnippetId[]),
        DEFAULT_EDITOR_SNIPPET_ID,
      ])
    );

    snippetIds.forEach((snippetId) => {
      const snippetParameters = getCadSnippetParameters(snippetId);
      const createModel = new Function(
        'makerjs',
        'cad',
        ...snippetParameters.map((parameter) => parameter.name),
        `return (function () {
          ${CAD_SNIPPETS[snippetId].code}
        })();`
      );
      const evaluated = createModel(
        makerjs,
        cad,
        ...snippetParameters.map((parameter) => parameter.value)
      );
      const model = normalizeEditorModelResult(evaluated);
      const extents = makerjs.measure.modelExtents(model);
      const renderableEntitiesCount =
        Object.keys(model.models ?? {}).length +
        Object.keys(model.paths ?? {}).length;

      expect(renderableEntitiesCount).toBeGreaterThan(0);
      expect(extents).not.toBeNull();
      expect(Number.isFinite(extents!.width)).toBe(true);
      expect(Number.isFinite(extents!.height)).toBe(true);
      expect(extents!.width).toBeGreaterThan(0);
      expect(extents!.height).toBeGreaterThan(0);
    });
  });

  it('throws for non-model values', () => {
    expect(() => normalizeEditorModelResult('not-a-model')).toThrow(
      /must return a Maker\.js model/
    );
  });
});

describe('cad shape helpers', () => {
  it('keeps legacy panel behavior when edges are not provided', () => {
    const panel = normalizeEditorModelResult(
      cad.panel({
        width: 100,
        height: 70,
        radius: 10,
        inset: { margin: 12, radius: 6 },
        holes: [{ kind: 'circle', x: 50, y: 35, radius: 5 }],
      })
    );
    const extents = makerjs.measure.modelExtents(panel)!;

    expect(extents.low[0]).toBeCloseTo(0, 6);
    expect(extents.low[1]).toBeCloseTo(0, 6);
    expect(extents.high[0]).toBeCloseTo(100, 6);
    expect(extents.high[1]).toBeCloseTo(70, 6);
  });

  it('expands panel bounds when edge tabs are applied', () => {
    const panel = normalizeEditorModelResult(
      cad.panel({
        width: 100,
        height: 60,
        thickness: 3,
        edges: {
          left: { kind: 'tabs', count: 2, segmentLength: 16 },
          right: { kind: 'tabs', count: 2, segmentLength: 16 },
        },
      })
    );
    const extents = makerjs.measure.modelExtents(panel)!;

    expect(extents.low[0]).toBeCloseTo(-3, 6);
    expect(extents.high[0]).toBeCloseTo(103, 6);
    expect(extents.low[1]).toBeCloseTo(0, 6);
    expect(extents.high[1]).toBeCloseTo(60, 6);
  });

  it('cuts edge notches from the outer panel boundary', () => {
    const panel = normalizeEditorModelResult(
      cad.panel({
        width: 120,
        height: 70,
        thickness: 3,
        edges: {
          top: { kind: 'notches', count: 2, segmentLength: 20 },
        },
      })
    );
    const extents = makerjs.measure.modelExtents(panel)!;

    expect(extents.low[0]).toBeCloseTo(0, 6);
    expect(extents.low[1]).toBeCloseTo(0, 6);
    expect(extents.high[0]).toBeCloseTo(120, 6);
    expect(extents.high[1]).toBeCloseTo(70, 6);
    expect(makerjs.measure.isPointInsideModel([36.67, 1], panel)).toBe(false);
    expect(makerjs.measure.isPointInsideModel([36.67, 4], panel)).toBe(true);
  });

  it('builds profiled panel bodies from a single normalized outer contour', () => {
    const panelNode = cad
      .panel({
        width: 120,
        height: 70,
        thickness: 3,
        clearance: 0.2,
        edges: {
          top: { kind: 'notches', count: 2, segmentLength: 20 },
          right: { kind: 'tabs', count: 2, segmentLength: 16 },
          bottom: { kind: 'notches', count: 2, segmentLength: 20 },
          left: { kind: 'tabs', count: 2, segmentLength: 16 },
        },
      })
      .getNode();

    expect(panelNode.kind).toBe('assembly');

    if (panelNode.kind !== 'assembly') {
      throw new Error('Expected an assembly panel');
    }

    const bodyNode = panelNode.children.body;

    expect(bodyNode.kind).toBe('polyline');

    if (bodyNode.kind !== 'polyline') {
      throw new Error('Expected a polyline body');
    }

    expect(bodyNode.closed).toBe(true);
    expect(hasConsecutiveDuplicatePoints(bodyNode.points)).toBe(false);
    expect(hasRedundantCollinearPoints(bodyNode.points)).toBe(false);
  });

  it('keeps panel holes as boolean cuts on top of the outer contour', () => {
    const panelNode = cad
      .panel({
        width: 120,
        height: 70,
        thickness: 3,
        edges: {
          left: { kind: 'tabs', count: 2, segmentLength: 16 },
          right: { kind: 'tabs', count: 2, segmentLength: 16 },
        },
        holes: [{ kind: 'circle', x: 60, y: 35, radius: 8 }],
      })
      .getNode();

    expect(panelNode.kind).toBe('assembly');

    if (panelNode.kind !== 'assembly') {
      throw new Error('Expected an assembly panel');
    }

    const bodyNode = panelNode.children.body;

    expect(bodyNode.kind).toBe('boolean');

    if (bodyNode.kind !== 'boolean') {
      throw new Error('Expected a boolean body');
    }

    expect(bodyNode.operation).toBe('cut');
    expect(bodyNode.left.kind).toBe('polyline');
  });

  it('uses clearance to enlarge notch openings', () => {
    const withoutClearance = normalizeEditorModelResult(
      cad.panel({
        width: 120,
        height: 70,
        thickness: 3,
        edges: {
          top: { kind: 'notches', count: 2, segmentLength: 20 },
        },
      })
    );
    const withClearance = normalizeEditorModelResult(
      cad.panel({
        width: 120,
        height: 70,
        thickness: 3,
        clearance: 0.25,
        edges: {
          top: { kind: 'notches', count: 2, segmentLength: 20 },
        },
      })
    );

    expect(
      makerjs.measure.isPointInsideModel([46.74, 1.5], withoutClearance)
    ).toBe(true);
    expect(
      makerjs.measure.isPointInsideModel([46.74, 1.5], withClearance)
    ).toBe(false);
  });

  it('exports profiled panels to DXF without invalid numeric output', () => {
    const model = normalizeEditorModelResult(
      cad.panel({
        width: 120,
        height: 70,
        thickness: 3,
        edges: {
          top: { kind: 'notches', count: 2, segmentLength: 20 },
          left: { kind: 'tabs', count: 2, segmentLength: 16 },
        },
      })
    );
    const dxf = makerjs.exporter.toDXF(model);

    expect(dxf).toContain('ENTITIES');
    expect(dxf).not.toContain('NaN');
    expect(dxf).not.toContain('undefined');
  });

  it('rejects rounded panels when profiled edges are requested', () => {
    expect(() =>
      cad.panel({
        width: 120,
        height: 70,
        radius: 12,
        thickness: 3,
        edges: {
          top: { kind: 'tabs', count: 2, segmentLength: 18 },
        },
      })
    ).toThrow(/do not support radius/);
  });

  it('rejects notch depths that reach or cross the opposite panel side', () => {
    expect(() =>
      cad.panel({
        width: 40,
        height: 20,
        thickness: 3,
        edges: {
          top: { kind: 'notches', count: 1, segmentLength: 10, depth: 20 },
        },
      })
    ).toThrow(/notch depth must be smaller than the panel span/);
  });

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

  it('accepts arrays directly in cad.sketch for multi-part scenes', () => {
    const sketch = cad.sketch([
      cad.rect(30, 10),
      cad.circle(5).centerAt([50, 10]),
    ]);
    const model = normalizeEditorModelResult(sketch);

    expect(Object.keys(model.models ?? {}).sort()).toEqual(['item1', 'item2']);
  });

  it('lays out parts row-by-row with stable ids and expected gaps', () => {
    const sketch = cad.flatLayout(
      {
        first: cad.rect(30, 10),
        second: cad.rect(20, 16),
        third: cad.rect(18, 12),
      },
      { columns: 2, gapX: 10, gapY: 14 }
    );
    const model = normalizeEditorModelResult(sketch);

    expect(Object.keys(model.models ?? {}).sort()).toEqual([
      'first',
      'second',
      'third',
    ]);

    const first = getTopLevelModelExtents(model, 'first');
    const second = getTopLevelModelExtents(model, 'second');
    const third = getTopLevelModelExtents(model, 'third');

    expect(second.low[0] - first.high[0]).toBeCloseTo(10, 6);
    expect(third.low[1] - Math.max(first.high[1], second.high[1])).toBeCloseTo(
      14,
      6
    );
  });

  it('accepts arrays in flatLayout and generates stable part ids', () => {
    const sketch = cad.flatLayout(
      [cad.rect(30, 10), cad.rect(20, 16), cad.rect(18, 12)],
      { columns: 2, gapX: 10, gapY: 14 }
    );
    const model = normalizeEditorModelResult(sketch);

    expect(Object.keys(model.models ?? {}).sort()).toEqual([
      'part1',
      'part2',
      'part3',
    ]);
  });

  it('uses assembly placement bounds for flat layout', () => {
    const decorated = new Assembly2D({
      kind: 'assembly',
      children: {
        body: cad.rect(24, 12).getNode(),
        guide: cad
          .circle(6)
          .moveTo([80, 6], 'center')
          .onLayer('etch')
          .getNode(),
      },
      placementChildId: 'body',
      metadata: {},
    });

    const sketch = cad.flatLayout(
      {
        base: cad.rect(30, 10),
        decorated,
      },
      { columns: 2, gapX: 10, gapY: 12 }
    );
    const model = normalizeEditorModelResult(sketch);
    const decoratedBody = getNestedChildModelExtents(
      model,
      'decorated',
      'body'
    );

    expect(decoratedBody.low[0]).toBeCloseTo(40, 6);
    expect(decoratedBody.low[1]).toBeCloseTo(0, 6);
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

const getTopLevelModelExtents = (
  parentModel: makerjs.IModel,
  childId: string
): makerjs.IMeasureWithCenter => getChildModelExtents(parentModel, childId);

const getNestedChildModelExtents = (
  parentModel: makerjs.IModel,
  parentChildId: string,
  nestedChildId: string
): makerjs.IMeasureWithCenter => {
  const parentChildModel = parentModel.models?.[parentChildId];

  if (!parentChildModel) {
    throw new Error(`Missing child model: ${parentChildId}`);
  }

  const nestedChildModel = parentChildModel.models?.[nestedChildId];

  if (!nestedChildModel) {
    throw new Error(
      `Missing nested child model: ${parentChildId}.${nestedChildId}`
    );
  }

  const extents = makerjs.measure.modelExtents(nestedChildModel)!;
  const parentOrigin = parentChildModel.origin ?? [0, 0];
  const rootOrigin = parentModel.origin ?? [0, 0];

  return {
    ...extents,
    low: [
      extents.low[0] + parentOrigin[0] + rootOrigin[0],
      extents.low[1] + parentOrigin[1] + rootOrigin[1],
    ],
    high: [
      extents.high[0] + parentOrigin[0] + rootOrigin[0],
      extents.high[1] + parentOrigin[1] + rootOrigin[1],
    ],
    center: [
      extents.center[0] + parentOrigin[0] + rootOrigin[0],
      extents.center[1] + parentOrigin[1] + rootOrigin[1],
    ],
  };
};

const PANEL_TEST_EPSILON = 1e-9;

const hasConsecutiveDuplicatePoints = (
  points: readonly (readonly [number, number])[]
): boolean =>
  points.some((point, index) => {
    const next = points[(index + 1) % points.length];

    return (
      Math.abs(point[0] - next[0]) <= PANEL_TEST_EPSILON &&
      Math.abs(point[1] - next[1]) <= PANEL_TEST_EPSILON
    );
  });

const hasRedundantCollinearPoints = (
  points: readonly (readonly [number, number])[]
): boolean =>
  points.some((current, index) => {
    const previous = points[(index - 1 + points.length) % points.length];
    const next = points[(index + 1) % points.length];
    const vectorA: readonly [number, number] = [
      current[0] - previous[0],
      current[1] - previous[1],
    ];
    const vectorB: readonly [number, number] = [
      next[0] - current[0],
      next[1] - current[1],
    ];
    const cross = vectorA[0] * vectorB[1] - vectorA[1] * vectorB[0];
    const dot = vectorA[0] * vectorB[0] + vectorA[1] * vectorB[1];

    return Math.abs(cross) <= PANEL_TEST_EPSILON && dot > PANEL_TEST_EPSILON;
  });

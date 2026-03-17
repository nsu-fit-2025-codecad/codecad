import makerjs, { IModel } from 'makerjs';
import { describe, expect, it } from 'vitest';
import { cad, normalizeEditorModelResult } from '@/lib/cad/runtime';
import { packModelsIntoTargetModel } from '@/lib/nesting';
import { DEFAULT_EDITOR_CODE } from '@/store/store';
import {
  MODEL_FILL_ATTRIBUTE,
  MODEL_FILL_FOR_ATTRIBUTE,
  MODEL_FILL_OVERLAY_ATTRIBUTE,
  getStableModelFillColor,
  renderModelToSvg,
} from '@/lib/svg-render';
import {
  SELECTED_MODEL_ATTRIBUTE,
  highlightSelectedModelInSvg,
} from '@/lib/svg-highlight';

const createMixedFixture = (): IModel => {
  const target = new makerjs.models.Rectangle(260, 180);

  const movedPart = new makerjs.models.Rectangle(32, 20);
  makerjs.model.moveRelative(movedPart, [150, 95]);

  const pathPart: IModel = {
    paths: {
      p1: new makerjs.paths.Line([30, 35], [58, 35]),
      p2: new makerjs.paths.Line([58, 35], [58, 58]),
      p3: new makerjs.paths.Line([58, 58], [30, 58]),
      p4: new makerjs.paths.Line([30, 58], [30, 35]),
    },
  };

  const nestedPart: IModel = {
    models: {
      body: new makerjs.models.Rectangle(36, 24),
      tab: makerjs.model.move(new makerjs.models.Rectangle(10, 8), [12, 24]),
    },
  };
  makerjs.model.moveRelative(nestedPart, [90, 40]);

  const holedPart = new makerjs.models.Ring(22, 9);
  makerjs.model.moveRelative(holedPart, [62, 122]);

  return {
    models: {
      target,
      movedPart,
      pathPart,
      nestedPart,
      holedPart,
    },
  };
};

const createDefaultSceneFixture = (): IModel => {
  const createModel = new Function(
    'makerjs',
    'cad',
    `return (function () {
      ${DEFAULT_EDITOR_CODE}
    })();`
  );

  return normalizeEditorModelResult(createModel(makerjs, cad));
};

const createTranslatedHelperFixture = (): IModel =>
  normalizeEditorModelResult(
    cad.sketch({
      helper: cad
        .panel({
          width: 100,
          height: 70,
          radius: 10,
          inset: { margin: 12, radius: 6 },
          holes: [{ kind: 'circle', x: 50, y: 35, radius: 5 }],
        })
        .translate(85, 45),
      marker: cad.circle(8).centerAt([30, 20]),
    })
  );

const createOffsetViewportFixture = (): IModel => {
  const translatedPanel = cad
    .panel({
      width: 120,
      height: 90,
      radius: 12,
      inset: { margin: 14, radius: 8 },
    })
    .translate(80, 120);
  const translatedGear = cad
    .gear({
      teeth: 12,
      outerRadius: 28,
      rootRadius: 20,
      bore: 8,
    })
    .centerAt([115, 165]);

  return normalizeEditorModelResult(
    cad.sketch({
      panel: translatedPanel,
      gear: translatedGear,
    })
  );
};

const createNotchedPanelFixture = (): IModel =>
  normalizeEditorModelResult(
    cad.sketch({
      panel: cad
        .panel({
          width: 120,
          height: 70,
          thickness: 3,
          clearance: 0.2,
          edges: {
            top: { kind: 'notches', count: 2, segmentLength: 20 },
            bottom: { kind: 'notches', count: 2, segmentLength: 20 },
            left: { kind: 'tabs', count: 2, segmentLength: 16 },
            right: { kind: 'tabs', count: 2, segmentLength: 16 },
          },
        })
        .translate(25, 20),
    })
  );

const createParameterizedTargetFixture = (height: number): IModel =>
  normalizeEditorModelResult(
    cad.sketch({
      door: cad
        .panel({
          width: 120,
          height: 92,
          radius: 14,
          inset: { margin: 16, radius: 8 },
          holes: [
            { kind: 'circle', x: 18, y: 18, radius: 3 },
            { kind: 'circle', x: 102, y: 18, radius: 3 },
            { kind: 'circle', x: 18, y: 74, radius: 3 },
            { kind: 'circle', x: 102, y: 74, radius: 3 },
          ],
        })
        .onLayer('cut'),
      target: cad.roundRect(238, height, 25),
      gear: cad
        .gear({
          teeth: 14,
          outerRadius: 34,
          rootRadius: 25,
          bore: 10,
          rotationDeg: 1,
          rootFraction: 0.01,
          toothFraction: 0.05,
        })
        .centerAt([44, 45])
        .onLayer('cut')
        .translate(0, 130),
      clock: cad.clockFace({
        radius: 42,
        rimWidth: 8,
        tickCount: 12,
        centerHole: 6,
      }),
      maze: cad
        .trackPath(
          [
            [0, 0],
            [60, 0],
            [60, 30],
            [25, 30],
            [25, 65],
            [85, 65],
          ],
          10
        )
        .onLayer('etch')
        .translate(150, 145),
    })
  );

describe('renderModelToSvg', () => {
  it('fills every top-level model in mixed editor fixture', () => {
    const model = createMixedFixture();
    const svg = renderModelToSvg(model);
    const modelIds = Object.keys(model.models ?? {});

    expect(svg).toContain(`${MODEL_FILL_OVERLAY_ATTRIBUTE}="true"`);
    expect(countMatches(svg, `${MODEL_FILL_ATTRIBUTE}="true"`)).toBe(
      modelIds.length
    );

    modelIds.forEach((modelId) => {
      expect(svg).toContain(`${MODEL_FILL_FOR_ATTRIBUTE}="${modelId}"`);
    });
  });

  it('keeps model fills aligned with outlines before nesting', () => {
    const model = createMixedFixture();
    const svg = renderModelToSvg(model);

    expectFillMatchesRootSvgCoordinates(svg, model, 'target');
    expectFillMatchesRootSvgCoordinates(svg, model, 'movedPart');
    expectFillMatchesRootSvgCoordinates(svg, model, 'nestedPart');
  });

  it('keeps model fills aligned and visible after nesting', () => {
    const model = createMixedFixture();
    const result = packModelsIntoTargetModel(model, 'target', {
      useGeneticSearch: false,
      allowRotation: true,
    });

    expect(result).not.toBeNull();

    const svg = result!.svgString;
    const modelIds = Object.keys(model.models ?? {});

    expect(svg).toContain(`${MODEL_FILL_OVERLAY_ATTRIBUTE}="true"`);
    modelIds.forEach((modelId) => {
      expect(svg).toContain(`${MODEL_FILL_FOR_ATTRIBUTE}="${modelId}"`);
    });

    expectFillMatchesRootSvgCoordinates(svg, model, 'target');
    expectFillMatchesRootSvgCoordinates(svg, model, 'movedPart');
    expectFillMatchesRootSvgCoordinates(svg, model, 'nestedPart');
  });

  it('preserves holes inside a model and keeps sibling fills separate', () => {
    const model = createMixedFixture();
    const svg = renderModelToSvg(model);
    const modelIds = Object.keys(model.models ?? {});
    const holedFillLayer = getFillLayer(svg, 'holedPart');
    const holedFillPath = getFirstPathTag(holedFillLayer);
    const holedPathData = readTagAttribute(holedFillPath, 'd') ?? '';
    const targetFillLayer = getFillLayer(svg, 'target');

    expect((holedPathData.match(/\bM\b/g) ?? []).length).toBeGreaterThan(1);
    expect(holedFillPath).toContain('fill-rule="evenodd"');
    expect(targetFillLayer).not.toContain(' a ');
    expect(countMatches(svg, `${MODEL_FILL_FOR_ATTRIBUTE}=`)).toBe(
      modelIds.length
    );
  });

  it('assigns deterministic fill colors per model id', () => {
    const firstSvg = renderModelToSvg(createMixedFixture());
    const secondSvg = renderModelToSvg(createMixedFixture());
    const firstTargetColor = getFillColor(firstSvg, 'target');
    const secondTargetColor = getFillColor(secondSvg, 'target');

    expect(firstTargetColor).toBe(getStableModelFillColor('target'));
    expect(secondTargetColor).toBe(firstTargetColor);
  });

  it('keeps selected-model highlighting compatible', () => {
    const svg = renderModelToSvg(createMixedFixture());
    const highlightedSvg = highlightSelectedModelInSvg(svg, 'movedPart');
    const selectedTag = getTagById(highlightedSvg, 'movedPart');

    expect(selectedTag).toContain(`${SELECTED_MODEL_ATTRIBUTE}="true"`);
    expect(highlightedSvg).toContain(`${MODEL_FILL_FOR_ATTRIBUTE}="movedPart"`);
  });

  it('keeps default scene fills isolated per top-level model', () => {
    const model = createDefaultSceneFixture();
    const svg = renderModelToSvg(model);

    ['board', 'clock', 'door', 'maze', 'rabbit'].forEach((modelId) => {
      expectFillMatchesRootSvgCoordinates(svg, model, modelId);
    });
  });

  it('keeps default scene fills aligned after nesting', () => {
    const model = createDefaultSceneFixture();
    const result = packModelsIntoTargetModel(model, 'board', {
      useGeneticSearch: false,
      allowRotation: true,
    });

    expect(result).not.toBeNull();

    const svg = result!.svgString;

    ['board', 'clock', 'door', 'maze', 'rabbit'].forEach((modelId) => {
      expectFillMatchesRootSvgCoordinates(svg, model, modelId);
    });
  }, 15000);

  it('keeps translated top-level helper fills in root SVG coordinates', () => {
    const model = createTranslatedHelperFixture();
    const svg = renderModelToSvg(model);

    expectFillMatchesRootSvgCoordinates(svg, model, 'helper');
    expectFillMatchesRootSvgCoordinates(svg, model, 'marker');
  });

  it('keeps fills aligned when the root SVG viewBox has non-zero lowX and lowY', () => {
    const model = createOffsetViewportFixture();
    const svg = renderModelToSvg(model);

    expectFillMatchesRootSvgCoordinates(svg, model, 'panel');
    expectFillMatchesRootSvgCoordinates(svg, model, 'gear');
  });

  it('renders profiled panel contours without losing root SVG alignment', () => {
    const model = createNotchedPanelFixture();
    const svg = renderModelToSvg(model);

    expectOutlineMatchesRootSvgCoordinates(svg, model, 'panel');
    expectFillMatchesRootSvgCoordinates(svg, model, 'panel');
  });

  it('keeps target outline and fill in sync across sequential height changes', () => {
    renderModelToSvg(createParameterizedTargetFixture(432));

    const nextModel = createParameterizedTargetFixture(352);
    const nextSvg = renderModelToSvg(nextModel);

    expectOutlineMatchesRootSvgCoordinates(nextSvg, nextModel, 'target');
    expectFillMatchesRootSvgCoordinates(nextSvg, nextModel, 'target');
  });
});

const expectFillMatchesRootSvgCoordinates = (
  svgString: string,
  model: IModel,
  modelId: string
): void => {
  const fillLayer = getFillLayer(svgString, modelId);
  const fillPathTag = getFirstPathTag(fillLayer);
  const fillPathData = readTagAttribute(fillPathTag, 'd') ?? '';
  const modelEntry = model.models?.[modelId];
  const rootExtents = makerjs.measure.modelExtents(model);

  expect(fillLayer).not.toContain('transform=');
  expect(modelEntry).toBeDefined();
  expect(rootExtents).not.toBeNull();

  const expectedPathData = makerjs.exporter.toSVGPathData(
    makerjs.model.clone(modelEntry!),
    false,
    [-rootExtents!.low[0], rootExtents!.high[1]]
  );

  expect(fillPathData).toBe(expectedPathData);
};

const expectOutlineMatchesRootSvgCoordinates = (
  svgString: string,
  model: IModel,
  modelId: string
): void => {
  const outlineGroup = getOutlineGroup(svgString, modelId);
  const outlinePathTag = getFirstPathTag(outlineGroup);
  const outlinePathData = readTagAttribute(outlinePathTag, 'd') ?? '';
  const modelEntry = model.models?.[modelId];
  const rootExtents = makerjs.measure.modelExtents(model);

  expect(modelEntry).toBeDefined();
  expect(rootExtents).not.toBeNull();
  const expectedPathData = makerjs.exporter.toSVGPathData(
    makerjs.model.clone(modelEntry!),
    false,
    [-rootExtents!.low[0], rootExtents!.high[1]]
  );

  expect(outlinePathData).toBe(expectedPathData);
};

const getFillLayer = (svgString: string, modelId: string): string => {
  const escapedModelId = escapeRegularExpression(modelId);
  const match = svgString.match(
    new RegExp(
      `<g[^>]*${MODEL_FILL_FOR_ATTRIBUTE}=(['"])${escapedModelId}\\1[^>]*>[\\s\\S]*?<\\/g>`,
      'i'
    )
  );

  return match?.[0] ?? '';
};

const getFirstPathTag = (svgString: string): string => {
  const match = svgString.match(/<path\b[^>]*>/i);
  return match?.[0] ?? '';
};

const getOutlineGroup = (svgString: string, modelId: string): string => {
  const escapedModelId = escapeRegularExpression(modelId);
  const groupMatch = svgString.match(
    new RegExp(
      `<g[^>]*id=(['"])${escapedModelId}\\1[^>]*>([\\s\\S]*?)<\\/g>`,
      'i'
    )
  );

  return groupMatch?.[0] ?? '';
};

const getFillColor = (svgString: string, modelId: string): string => {
  const fillLayer = getFillLayer(svgString, modelId);
  const fillPath = getFirstPathTag(fillLayer);
  return readTagAttribute(fillPath, 'fill') ?? '';
};

const getTagById = (svgString: string, id: string): string => {
  const escapedId = escapeRegularExpression(id);
  const match = svgString.match(
    new RegExp(`<[^>]+\\sid=(['"])${escapedId}\\1[^>]*>`, 'i')
  );

  return match?.[0] ?? '';
};

const countMatches = (value: string, pattern: string): number => {
  return (value.match(new RegExp(pattern, 'g')) ?? []).length;
};

const readTagAttribute = (
  tag: string,
  attributeName: string
): string | null => {
  const match = tag.match(
    new RegExp(`\\s${attributeName}=(["'])(.*?)\\1`, 'i')
  );
  return match?.[2] ?? null;
};

const escapeRegularExpression = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

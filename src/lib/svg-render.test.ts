import makerjs, { IModel } from 'makerjs';
import { describe, expect, it } from 'vitest';
import { packModelsIntoTargetModel } from '@/lib/nesting';
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
    const svg = renderModelToSvg(createMixedFixture());

    expectFillAlignedToOutline(svg, 'target');
    expectFillAlignedToOutline(svg, 'movedPart');
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

    expectFillAlignedToOutline(svg, 'target');
    expectFillAlignedToOutline(svg, 'movedPart');
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
});

const expectFillAlignedToOutline = (
  svgString: string,
  modelId: string
): void => {
  const modelGroup = getModelGroup(svgString, modelId);
  const fillLayer = getFillLayer(svgString, modelId);
  const fillPathTag = getFirstPathTag(fillLayer);
  const fillPathData = readTagAttribute(fillPathTag, 'd') ?? '';

  expect(fillLayer).not.toContain('transform=');

  const outlineBounds = extractLineBounds(modelGroup);
  const fillBounds = extractPathBounds(fillPathData);

  expect(fillBounds.minX).toBeCloseTo(outlineBounds.minX, 3);
  expect(fillBounds.maxX).toBeCloseTo(outlineBounds.maxX, 3);
  expect(fillBounds.minY).toBeCloseTo(outlineBounds.minY, 3);
  expect(fillBounds.maxY).toBeCloseTo(outlineBounds.maxY, 3);
};

const getModelGroup = (svgString: string, modelId: string): string => {
  const escapedModelId = escapeRegularExpression(modelId);
  const match = svgString.match(
    new RegExp(
      `<g[^>]*\\sid=(['"])${escapedModelId}\\1[^>]*>[\\s\\S]*?<\\/g>`,
      'i'
    )
  );

  return match?.[0] ?? '';
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

const extractLineBounds = (groupMarkup: string) => {
  const lineTags = groupMarkup.match(/<line\b[^>]*>/gi) ?? [];

  if (lineTags.length === 0) {
    throw new Error('No outline line tags found');
  }

  const xValues: number[] = [];
  const yValues: number[] = [];

  lineTags.forEach((lineTag) => {
    xValues.push(
      parseRequiredNumber(readTagAttribute(lineTag, 'x1')),
      parseRequiredNumber(readTagAttribute(lineTag, 'x2'))
    );
    yValues.push(
      parseRequiredNumber(readTagAttribute(lineTag, 'y1')),
      parseRequiredNumber(readTagAttribute(lineTag, 'y2'))
    );
  });

  return {
    minX: Math.min(...xValues),
    maxX: Math.max(...xValues),
    minY: Math.min(...yValues),
    maxY: Math.max(...yValues),
  };
};

const extractPathBounds = (pathData: string) => {
  const values = (pathData.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? []).map(
    Number
  );

  if (values.length < 4) {
    throw new Error('Path data does not contain enough coordinates');
  }

  const xValues: number[] = [];
  const yValues: number[] = [];

  for (let index = 0; index + 1 < values.length; index += 2) {
    xValues.push(values[index]);
    yValues.push(values[index + 1]);
  }

  return {
    minX: Math.min(...xValues),
    maxX: Math.max(...xValues),
    minY: Math.min(...yValues),
    maxY: Math.max(...yValues),
  };
};

const parseRequiredNumber = (value: string | null): number => {
  if (value === null) {
    throw new Error('Missing numeric SVG attribute');
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric SVG attribute: ${value}`);
  }

  return parsed;
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

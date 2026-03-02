import { describe, expect, it } from 'vitest';
import makerjs, { type IModel, type IModelMap } from 'makerjs';
import {
  modelMapToNestParts,
  modelToPolygonShape,
} from '@/lib/nesting/makerjs-to-polygons';

describe('modelToPolygonShape', () => {
  it('converts a rectangle model into a polygon shape', () => {
    const rectangle = new makerjs.models.Rectangle(40, 20);
    const shape = modelToPolygonShape(rectangle, 0.5);

    expect(shape).not.toBeNull();
    expect(shape?.contours).toHaveLength(1);
    expect(shape?.bounds.width).toBeCloseTo(40, 6);
    expect(shape?.bounds.height).toBeCloseTo(20, 6);
    expect(shape?.area).toBeCloseTo(800, 5);
  });

  it('converts rotated geometry and preserves area', () => {
    const rectangle = new makerjs.models.Rectangle(30, 10);
    makerjs.model.rotate(rectangle, 30, [0, 0]);

    const shape = modelToPolygonShape(rectangle, 0.5);

    expect(shape).not.toBeNull();
    expect(shape?.area).toBeCloseTo(300, 2);
    expect(shape?.bounds.width).toBeGreaterThan(30);
  });

  it('returns null for open geometry', () => {
    const openModel: IModel = {
      paths: {
        line: new makerjs.paths.Line([0, 0], [20, 0]),
      },
    };

    const shape = modelToPolygonShape(openModel, 1);
    expect(shape).toBeNull();
  });
});

describe('modelMapToNestParts', () => {
  it('returns nest parts and tracks invalid models', () => {
    const openModel: IModel = {
      paths: {
        line: new makerjs.paths.Line([0, 0], [20, 0]),
      },
    };

    const models: IModelMap = {
      large: new makerjs.models.Rectangle(40, 20),
      small: new makerjs.models.Rectangle(10, 10),
      open: openModel,
    };

    const result = modelMapToNestParts(models, 1);

    expect(result.parts.map((part) => part.id)).toEqual(['large', 'small']);
    expect(Object.keys(result.invalidModels)).toEqual(['open']);
  });
});

import { describe, expect, it } from 'vitest';
import makerjs, { type IModel, type IModelMap } from 'makerjs';
import { pointInPolygon } from '@/lib/nesting/polygon-boolean';
import { polygonArea } from '@/lib/nesting/polygon-math';
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

  it('caps contour density for curved geometry while preserving area', () => {
    const diameter = 220;
    const oval = new makerjs.models.Oval(diameter, diameter);
    const shape = modelToPolygonShape(oval, 1);
    const expectedArea = Math.PI * (diameter / 2) * (diameter / 2);

    expect(shape).not.toBeNull();
    expect(shape?.contours).toHaveLength(1);
    expect(shape?.contours[0].length ?? 0).toBeLessThanOrEqual(120);
    expect(shape?.area ?? 0).toBeGreaterThan(expectedArea * 0.9);
    expect(shape?.area ?? 0).toBeLessThan(expectedArea * 1.1);
  });

  it('does not reduce dense polygonal contours made of line segments', () => {
    const points: makerjs.IPoint[] = [];

    for (let i = 0; i < 160; i += 1) {
      const angle = (Math.PI * 2 * i) / 160;
      const radius = i % 2 === 0 ? 100 : 90;
      points.push([radius * Math.cos(angle), radius * Math.sin(angle)]);
    }

    const densePolygon = new makerjs.models.ConnectTheDots(true, points);
    const shape = modelToPolygonShape(densePolygon, 1);
    const expectedArea = Math.abs(
      polygonArea(points.map((point) => ({ x: point[0], y: point[1] })))
    );

    expect(shape).not.toBeNull();
    expect(shape?.contours).toHaveLength(1);
    expect(shape?.contours[0].length ?? 0).toBeGreaterThanOrEqual(158);
    expect(shape?.area ?? 0).toBeCloseTo(expectedArea, 3);
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

  it('preserves disjoint closed islands as solid geometry', () => {
    const disjointModel: IModel = {
      models: {
        left: new makerjs.models.Rectangle(2, 2),
        right: new makerjs.models.Rectangle(2, 2),
      },
    };

    makerjs.model.moveRelative(disjointModel.models!.right, [5, 0]);

    const shape = modelToPolygonShape(disjointModel, 0.5);

    expect(shape).not.toBeNull();
    expect(shape?.contours).toHaveLength(2);
    expect(shape?.area).toBeCloseTo(8, 6);
    expect(shape?.contours.every((contour) => polygonArea(contour) > 0)).toBe(
      true
    );

    expect(pointInPolygon({ x: 1, y: 1 }, shape!)).toBe(true);
    expect(pointInPolygon({ x: 6, y: 1 }, shape!)).toBe(true);
    expect(pointInPolygon({ x: 3.5, y: 1 }, shape!)).toBe(false);
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

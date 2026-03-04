import { describe, expect, it } from 'vitest';
import {
  createShape,
  polygonArea,
  polygonBounds,
  rotatePoints,
  rotateShape,
  translatePoints,
  translateShape,
} from '@/lib/nesting/polygon/polygon-math';
import type { Contour } from '@/lib/nesting/polygon/types';

const rectangleContour: Contour = [
  { x: 0, y: 0 },
  { x: 10, y: 0 },
  { x: 10, y: 5 },
  { x: 0, y: 5 },
];

describe('polygon math', () => {
  it('computes stable contour area and bounds', () => {
    expect(polygonArea(rectangleContour)).toBeCloseTo(50, 6);

    const bounds = polygonBounds(rectangleContour);
    expect(bounds.minX).toBeCloseTo(0, 6);
    expect(bounds.minY).toBeCloseTo(0, 6);
    expect(bounds.width).toBeCloseTo(10, 6);
    expect(bounds.height).toBeCloseTo(5, 6);
  });

  it('rotates and translates points', () => {
    const rotated = rotatePoints([{ x: 1, y: 0 }], 90);
    expect(rotated[0].x).toBeCloseTo(0, 6);
    expect(rotated[0].y).toBeCloseTo(1, 6);

    const translated = translatePoints(rotated, 5, -2);
    expect(translated[0].x).toBeCloseTo(5, 6);
    expect(translated[0].y).toBeCloseTo(-1, 6);
  });

  it('rotates and translates polygon shapes while preserving area', () => {
    const shape = createShape([rectangleContour]);
    const rotated = rotateShape(shape, 90);

    expect(rotated.area).toBeCloseTo(shape.area, 6);
    expect(rotated.bounds.width).toBeCloseTo(5, 6);
    expect(rotated.bounds.height).toBeCloseTo(10, 6);

    const moved = translateShape(rotated, 5, 7);
    expect(moved.area).toBeCloseTo(shape.area, 6);
    expect(moved.bounds.minX).toBeCloseTo(0, 6);
    expect(moved.bounds.minY).toBeCloseTo(7, 6);
  });
});

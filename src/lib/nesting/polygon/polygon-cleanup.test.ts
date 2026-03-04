import { describe, expect, it } from 'vitest';
import {
  dedupePoints,
  normalizeContour,
  normalizeShape,
  removeCollinearPoints,
} from '@/lib/nesting/polygon/polygon-cleanup';
import { createShape, polygonArea } from '@/lib/nesting/polygon/polygon-math';
import type { Contour } from '@/lib/nesting/polygon/types';

describe('polygon cleanup', () => {
  it('removes duplicate points', () => {
    const contour: Contour = [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
      { x: 0, y: 0 },
    ];

    const deduped = dedupePoints(contour);
    expect(deduped).toHaveLength(4);
  });

  it('removes collinear points', () => {
    const contour: Contour = [
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];

    const cleaned = removeCollinearPoints(contour);
    expect(cleaned).toHaveLength(4);
    expect(cleaned.some((point) => point.x === 5 && point.y === 0)).toBe(false);
  });

  it('normalizes contour winding to counter-clockwise', () => {
    const clockwiseRectangle: Contour = [
      { x: 0, y: 0 },
      { x: 0, y: 10 },
      { x: 10, y: 10 },
      { x: 10, y: 0 },
    ];

    const normalized = normalizeContour(clockwiseRectangle);
    expect(polygonArea(normalized)).toBeGreaterThan(0);
  });

  it('normalizes shape with outer contour first and holes reversed', () => {
    const outerClockwise: Contour = [
      { x: 0, y: 0 },
      { x: 0, y: 10 },
      { x: 10, y: 10 },
      { x: 10, y: 0 },
    ];
    const innerClockwise: Contour = [
      { x: 2, y: 2 },
      { x: 2, y: 4 },
      { x: 4, y: 4 },
      { x: 4, y: 2 },
    ];

    const normalized = normalizeShape(
      createShape([innerClockwise, outerClockwise])
    );

    expect(normalized.contours).toHaveLength(2);
    expect(polygonArea(normalized.contours[0])).toBeGreaterThan(0);
    expect(polygonArea(normalized.contours[1])).toBeLessThan(0);
    expect(normalized.area).toBeCloseTo(96, 6);
  });
});

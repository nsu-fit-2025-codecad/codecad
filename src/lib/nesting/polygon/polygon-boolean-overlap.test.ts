import { describe, expect, it } from 'vitest';
import {
  isShapeInsideBin,
  polygonsOverlap,
  pointInPolygon,
} from '@/lib/nesting/polygon/polygon-boolean';
import { normalizeShape } from '@/lib/nesting/polygon/polygon-cleanup';
import {
  createShape,
  translateShape,
} from '@/lib/nesting/polygon/polygon-math';
import type { PolygonShape } from '@/lib/nesting/polygon/types';

const rectangleShape = (width: number, height: number): PolygonShape =>
  normalizeShape(
    createShape([
      [
        { x: 0, y: 0 },
        { x: width, y: 0 },
        { x: width, y: height },
        { x: 0, y: height },
      ],
    ])
  );

const cShapeContour = (
  width: number,
  height: number,
  notchLeft: number,
  notchTop: number,
  notchRight: number,
  notchBottom: number
) => [
  { x: 0, y: 0 },
  { x: width, y: 0 },
  { x: width, y: notchTop },
  { x: notchLeft, y: notchTop },
  { x: notchLeft, y: notchBottom },
  { x: width, y: notchBottom },
  { x: width, y: height },
  { x: 0, y: height },
];

const frameShape = (
  outerW: number,
  outerH: number,
  holeX: number,
  holeY: number,
  holeW: number,
  holeH: number
): PolygonShape =>
  normalizeShape(
    createShape([
      [
        { x: 0, y: 0 },
        { x: outerW, y: 0 },
        { x: outerW, y: outerH },
        { x: 0, y: outerH },
      ],
      [
        { x: holeX, y: holeY },
        { x: holeX + holeW, y: holeY },
        { x: holeX + holeW, y: holeY + holeH },
        { x: holeX, y: holeY + holeH },
      ],
    ])
  );

describe('polygonsOverlap with concave/holed shapes', () => {
  it('detects overlap when C-shape edges are collinear with frame boundaries', () => {
    const cShape = normalizeShape(
      createShape([cShapeContour(100, 100, 30, 30, 100, 70)])
    );

    const frame = frameShape(100, 100, 30, 30, 70, 40);

    expect(pointInPolygon({ x: 15, y: 15 }, cShape)).toBe(true);
    expect(pointInPolygon({ x: 15, y: 15 }, frame)).toBe(true);
    expect(pointInPolygon({ x: 50, y: 50 }, cShape)).toBe(false); // in notch
    expect(pointInPolygon({ x: 50, y: 50 }, frame)).toBe(false); // in hole

    expect(polygonsOverlap(cShape, frame, 0)).toBe(true);
  });

  it('detects overlap when C-shape material extends into frame material through shared boundary', () => {
    const cShape = normalizeShape(
      createShape([cShapeContour(80, 100, 30, 30, 80, 70)])
    );

    const frame = frameShape(100, 100, 30, 30, 50, 40);

    expect(pointInPolygon({ x: 10, y: 50 }, cShape)).toBe(true);
    expect(pointInPolygon({ x: 10, y: 50 }, frame)).toBe(true);

    expect(polygonsOverlap(cShape, frame, 0)).toBe(true);
  });

  it('detects overlap when two frames with partially shared hole boundaries overlap', () => {
    const frameA = frameShape(100, 100, 20, 20, 60, 60);

    const frameB = frameShape(80, 80, 10, 10, 60, 60);

    expect(polygonsOverlap(frameA, frameB, 0)).toBe(true);
  });

  it('correctly returns false when shapes do not overlap material', () => {
    const frame = frameShape(100, 100, 30, 30, 40, 40);
    const rect = normalizeShape(
      createShape([
        [
          { x: 0, y: 0 },
          { x: 20, y: 0 },
          { x: 20, y: 20 },
          { x: 0, y: 20 },
        ],
      ])
    );

    const placed = translateShape(rect, 40, 40);
    expect(polygonsOverlap(placed, frame, 0)).toBe(false);
  });

  it('rejects candidate shapes that cover a target hole with their interior', () => {
    const target = frameShape(100, 100, 30, 30, 40, 40);
    const candidate = translateShape(rectangleShape(50, 50), 25, 25);

    expect(isShapeInsideBin(candidate, target, 0)).toBe(false);
  });

  it('allows candidate shapes that stay outside the target hole', () => {
    const target = frameShape(100, 100, 30, 30, 40, 40);
    const candidate = translateShape(rectangleShape(20, 20), 5, 5);

    expect(isShapeInsideBin(candidate, target, 0)).toBe(true);
  });

  it('shrinks usable space near target holes when gap increases', () => {
    const target = frameShape(100, 100, 30, 30, 40, 40);
    const candidate = translateShape(rectangleShape(10, 10), 19, 35);

    expect(isShapeInsideBin(candidate, target, 0)).toBe(true);
    expect(isShapeInsideBin(candidate, target, 2)).toBe(false);
  });

  it('allows placement on a material island nested inside a target hole', () => {
    const target = normalizeShape(
      createShape([
        [
          { x: 0, y: 0 },
          { x: 200, y: 0 },
          { x: 200, y: 200 },
          { x: 0, y: 200 },
        ],
        [
          { x: 20, y: 20 },
          { x: 180, y: 20 },
          { x: 180, y: 180 },
          { x: 20, y: 180 },
        ],
        [
          { x: 70, y: 70 },
          { x: 130, y: 70 },
          { x: 130, y: 130 },
          { x: 70, y: 130 },
        ],
      ])
    );
    const candidate = translateShape(rectangleShape(20, 20), 90, 90);

    expect(isShapeInsideBin(candidate, target, 0)).toBe(true);
  });
});

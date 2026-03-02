import { describe, expect, it } from 'vitest';
import makerjs from 'makerjs';
import {
  isShapeInsideBin,
  polygonsOverlap,
} from '@/lib/nesting/polygon-boolean';
import { normalizeShape } from '@/lib/nesting/polygon-cleanup';
import { createShape } from '@/lib/nesting/polygon-math';
import { placePartsGreedy } from '@/lib/nesting/place';
import type { NestPart, PolygonShape } from '@/lib/nesting/types';

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

const rectanglePart = (
  id: string,
  width: number,
  height: number
): NestPart => ({
  id,
  sourceModel: new makerjs.models.Rectangle(width, height),
  shape: rectangleShape(width, height),
});

describe('placePartsGreedy', () => {
  it('places non-overlapping parts inside the bin', () => {
    const bin = rectangleShape(100, 100);
    const parts = [
      rectanglePart('a', 60, 40),
      rectanglePart('b', 40, 40),
      rectanglePart('c', 20, 30),
    ];

    const result = placePartsGreedy(parts, bin, {
      gap: 0,
      rotations: [0, 90],
      curveTolerance: 1,
      searchStep: 1,
    });

    expect(result.notPlacedIds).toHaveLength(0);
    expect(result.placements).toHaveLength(3);

    result.placements.forEach((placement) => {
      expect(isShapeInsideBin(placement.shape, bin, 0)).toBe(true);
    });

    for (let i = 0; i < result.placements.length; i += 1) {
      for (let j = i + 1; j < result.placements.length; j += 1) {
        expect(
          polygonsOverlap(
            result.placements[i].shape,
            result.placements[j].shape,
            0
          )
        ).toBe(false);
      }
    }
  });

  it('uses allowed rotations to fit otherwise unplaceable parts', () => {
    const bin = rectangleShape(100, 80);
    const part = rectanglePart('part', 70, 90);

    const withoutRotation = placePartsGreedy([part], bin, {
      gap: 0,
      rotations: [0],
      curveTolerance: 1,
      searchStep: 1,
    });
    expect(withoutRotation.notPlacedIds).toEqual(['part']);

    const withRotation = placePartsGreedy([part], bin, {
      gap: 0,
      rotations: [0, 90],
      curveTolerance: 1,
      searchStep: 1,
    });
    expect(withRotation.notPlacedIds).toHaveLength(0);
    expect(withRotation.placements.map((placement) => placement.id)).toEqual([
      'part',
    ]);
  });

  it('honors configured gap in placement results', () => {
    const bin = rectangleShape(100, 100);
    const parts = [rectanglePart('a', 50, 50), rectanglePart('b', 50, 50)];

    const noGap = placePartsGreedy(parts, bin, {
      gap: 0,
      rotations: [0],
      curveTolerance: 1,
      searchStep: 1,
    });
    expect(noGap.notPlacedIds).toHaveLength(0);
    expect(noGap.placements).toHaveLength(2);

    const withGap = placePartsGreedy(parts, bin, {
      gap: 1,
      rotations: [0],
      curveTolerance: 1,
      searchStep: 1,
    });
    expect(withGap.placements).toHaveLength(1);
    expect(withGap.notPlacedIds).toEqual(['b']);
  });
});

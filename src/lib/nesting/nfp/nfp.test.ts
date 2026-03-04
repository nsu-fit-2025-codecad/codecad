import { describe, expect, it } from 'vitest';
import { NfpCache } from '@/lib/nesting/nfp/nfp-cache';
import { buildInnerFitPolygon, buildNoFitPolygon } from '@/lib/nesting/nfp/nfp';
import {
  isShapeInsideBin,
  polygonsOverlap,
} from '@/lib/nesting/polygon/polygon-boolean';
import { normalizeShape } from '@/lib/nesting/polygon/polygon-cleanup';
import {
  createShape,
  polygonArea,
  translateShape,
} from '@/lib/nesting/polygon/polygon-math';
import { insetShape, offsetShape } from '@/lib/nesting/polygon/polygon-offset';
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

const contourBounds = (shape: PolygonShape, contourAreaSign: 1 | -1) => {
  const contour = shape.contours.find(
    (candidate) => Math.sign(polygonArea(candidate)) === contourAreaSign
  );

  if (!contour) {
    throw new Error(`Expected contour with sign ${contourAreaSign}`);
  }

  return {
    minX: Math.min(...contour.map((point) => point.x)),
    minY: Math.min(...contour.map((point) => point.y)),
    maxX: Math.max(...contour.map((point) => point.x)),
    maxY: Math.max(...contour.map((point) => point.y)),
  };
};

const ringShape = (
  outerSize: number,
  holeInset: number,
  holeSize: number
): PolygonShape =>
  normalizeShape(
    createShape([
      [
        { x: 0, y: 0 },
        { x: outerSize, y: 0 },
        { x: outerSize, y: outerSize },
        { x: 0, y: outerSize },
      ],
      [
        { x: holeInset, y: holeInset },
        { x: holeInset + holeSize, y: holeInset },
        { x: holeInset + holeSize, y: holeInset + holeSize },
        { x: holeInset, y: holeInset + holeSize },
      ],
    ])
  );

describe('polygon offset helpers', () => {
  it('offsets and insets rectangles predictably', () => {
    const rectangle = rectangleShape(10, 5);
    const expanded = offsetShape(rectangle, 1);
    const inset = insetShape(rectangle, 1);

    expect(expanded.bounds.minX).toBeCloseTo(-1, 6);
    expect(expanded.bounds.minY).toBeCloseTo(-1, 6);
    expect(expanded.bounds.maxX).toBeCloseTo(11, 6);
    expect(expanded.bounds.maxY).toBeCloseTo(6, 6);

    expect(inset.bounds.minX).toBeCloseTo(1, 6);
    expect(inset.bounds.minY).toBeCloseTo(1, 6);
    expect(inset.bounds.maxX).toBeCloseTo(9, 6);
    expect(inset.bounds.maxY).toBeCloseTo(4, 6);
  });

  it('offsets outer and hole contours in opposite directions', () => {
    const ring = ringShape(20, 6, 8);
    const expanded = offsetShape(ring, 1);
    const inset = insetShape(ring, 1);

    const expandedOuterBounds = contourBounds(expanded, 1);
    const expandedHoleBounds = contourBounds(expanded, -1);
    const insetOuterBounds = contourBounds(inset, 1);
    const insetHoleBounds = contourBounds(inset, -1);

    expect(expandedOuterBounds.minX).toBeCloseTo(-1, 6);
    expect(expandedOuterBounds.maxX).toBeCloseTo(21, 6);
    expect(expandedHoleBounds.minX).toBeCloseTo(7, 6);
    expect(expandedHoleBounds.maxX).toBeCloseTo(13, 6);

    expect(insetOuterBounds.minX).toBeCloseTo(1, 6);
    expect(insetOuterBounds.maxX).toBeCloseTo(19, 6);
    expect(insetHoleBounds.minX).toBeCloseTo(5, 6);
    expect(insetHoleBounds.maxX).toBeCloseTo(15, 6);
  });
});

describe('NFP builders', () => {
  it('builds inner-fit candidates that stay inside the bin', () => {
    const bin = rectangleShape(100, 60);
    const part = rectangleShape(30, 20);
    const innerFit = buildInnerFitPolygon(bin, part, 0);

    expect(innerFit.points.length).toBeGreaterThan(0);
    expect(innerFit.polygon).not.toBeNull();

    innerFit.points.forEach((point) => {
      const translated = translateShape(part, point.x, point.y);
      expect(isShapeInsideBin(translated, bin, 0)).toBe(true);
    });
  });

  it('builds no-fit contact candidates that avoid overlap', () => {
    const stationary = rectangleShape(40, 20);
    const moving = rectangleShape(10, 10);
    const noFit = buildNoFitPolygon(stationary, moving, 0);

    expect(noFit.points.length).toBeGreaterThan(0);
    expect(noFit.polygon).not.toBeNull();

    const hasRightContact = noFit.points.some(
      (point) => Math.abs(point.x - 40) <= 1e-6 && Math.abs(point.y) <= 1e-6
    );
    expect(hasRightContact).toBe(true);

    noFit.points.forEach((point) => {
      const translated = translateShape(moving, point.x, point.y);
      expect(polygonsOverlap(stationary, translated, 0)).toBe(false);
    });
  });

  it('pushes no-fit boundary outward when gap increases', () => {
    const stationary = rectangleShape(10, 10);
    const moving = rectangleShape(10, 10);

    const noGap = buildNoFitPolygon(stationary, moving, 0);
    const withGap = buildNoFitPolygon(stationary, moving, 1);

    const maxX = (points: Array<{ x: number; y: number }>) =>
      Math.max(...points.map((point) => point.x));

    expect(maxX(noGap.points)).toBeCloseTo(10, 6);
    expect(maxX(withGap.points)).toBeCloseTo(11, 6);
  });
});

describe('NfpCache', () => {
  it('reuses matching entries and differentiates key dimensions', () => {
    const cache = new NfpCache();
    const region = buildNoFitPolygon(
      rectangleShape(20, 20),
      rectangleShape(10, 5),
      0
    );
    let buildCount = 0;

    const key = {
      stationaryId: 'a',
      movingId: 'b',
      inside: false,
      stationaryRotation: 0,
      movingRotation: 0,
      gap: 0,
    };

    const first = cache.getOrBuild(key, () => {
      buildCount += 1;
      return region;
    });
    const second = cache.getOrBuild(key, () => {
      buildCount += 1;
      return region;
    });

    expect(first).toBe(second);
    expect(buildCount).toBe(1);

    cache.getOrBuild({ ...key, movingRotation: 90 }, () => {
      buildCount += 1;
      return region;
    });
    cache.getOrBuild({ ...key, inside: true }, () => {
      buildCount += 1;
      return region;
    });

    expect(buildCount).toBe(3);
    expect(cache.size).toBe(3);
  });
});

import { describe, expect, it } from 'vitest';
import makerjs from 'makerjs';
import {
  isShapeInsideBin,
  polygonsOverlap,
} from '@/lib/nesting/polygon-boolean';
import { normalizeShape } from '@/lib/nesting/polygon-cleanup';
import {
  createShape,
  rotateShape,
  shapeBounds,
  translateShape,
} from '@/lib/nesting/polygon-math';
import { placePartsGreedy } from '@/lib/nesting/place';
import type { NestPart, PolygonShape } from '@/lib/nesting/types';
import { NESTING_EPSILON } from '@/lib/nesting/types';

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

const customPart = (id: string, shape: PolygonShape): NestPart => ({
  id,
  sourceModel: new makerjs.models.Rectangle(1, 1),
  shape,
});

const circularContour = (
  radius: number,
  segments: number,
  centerX = radius,
  centerY = radius
) =>
  Array.from({ length: segments }, (_, index) => {
    const angle = (Math.PI * 2 * index) / segments;
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  });

const circularShape = (radius: number, segments = 48): PolygonShape =>
  normalizeShape(createShape([circularContour(radius, segments)]));

const circularRingShape = (
  outerRadius: number,
  innerRadius: number,
  segments = 64
): PolygonShape =>
  normalizeShape(
    createShape([
      circularContour(outerRadius, segments),
      circularContour(innerRadius, segments, outerRadius, outerRadius),
    ])
  );

const frameShape = (
  outerWidth: number,
  outerHeight: number,
  holeX: number,
  holeY: number,
  holeWidth: number,
  holeHeight: number
): PolygonShape =>
  normalizeShape(
    createShape([
      [
        { x: 0, y: 0 },
        { x: outerWidth, y: 0 },
        { x: outerWidth, y: outerHeight },
        { x: 0, y: outerHeight },
      ],
      [
        { x: holeX, y: holeY },
        { x: holeX + holeWidth, y: holeY },
        { x: holeX + holeWidth, y: holeY + holeHeight },
        { x: holeX, y: holeY + holeHeight },
      ],
    ])
  );

const multiIslandShape = (
  islands: Array<{ x: number; y: number; width: number; height: number }>
): PolygonShape =>
  normalizeShape(
    createShape(
      islands.map(({ x, y, width, height }) => [
        { x, y },
        { x: x + width, y },
        { x: x + width, y: y + height },
        { x, y: y + height },
      ])
    )
  );

const multiIslandPart = (
  id: string,
  islands: Array<{ x: number; y: number; width: number; height: number }>
): NestPart => ({
  id,
  sourceModel: {
    models: Object.fromEntries(
      islands.map(({ x, y, width, height }, index) => {
        const rect = new makerjs.models.Rectangle(width, height);
        makerjs.model.moveRelative(rect, [x, y]);
        return [`island-${index}`, rect];
      })
    ),
  },
  shape: multiIslandShape(islands),
});

const normalizeRotation = (rotation: number) => {
  const mod = rotation % 360;
  return mod >= 0 ? mod : mod + 360;
};

const normalizeShapeForRotation = (
  shape: PolygonShape,
  rotation: number
): PolygonShape => {
  const rotatedShape = rotateShape(shape, rotation);

  return translateShape(
    rotatedShape,
    -rotatedShape.bounds.minX,
    -rotatedShape.bounds.minY
  );
};

const axisValues = (min: number, max: number, step: number): number[] => {
  if (max < min - NESTING_EPSILON) {
    return [];
  }

  const values: number[] = [];
  const count = Math.floor((max - min) / step + NESTING_EPSILON);

  for (let i = 0; i <= count; i += 1) {
    values.push(min + i * step);
  }

  if (
    values.length === 0 ||
    Math.abs(values[values.length - 1] - max) > NESTING_EPSILON
  ) {
    values.push(max);
  }

  return values;
};

const placePartsScanBaseline = (
  parts: NestPart[],
  bin: PolygonShape,
  gap = 0,
  step = 1
) => {
  const rotations = [0];
  const placements: Array<{
    id: string;
    x: number;
    y: number;
    rotation: number;
    shape: PolygonShape;
  }> = [];
  const placedShapes: PolygonShape[] = [];
  const notPlacedIds: string[] = [];
  const orderedParts = [...parts].sort((a, b) => b.shape.area - a.shape.area);

  orderedParts.forEach((part) => {
    let placed = false;

    for (const rotation of rotations.map(normalizeRotation)) {
      const normalizedShape = normalizeShapeForRotation(part.shape, rotation);
      const maxX = bin.bounds.maxX - normalizedShape.bounds.width;
      const maxY = bin.bounds.maxY - normalizedShape.bounds.height;
      const xCandidates = axisValues(bin.bounds.minX, maxX, step);
      const yCandidates = axisValues(bin.bounds.minY, maxY, step);

      for (const y of yCandidates) {
        for (const x of xCandidates) {
          const candidate = translateShape(normalizedShape, x, y);

          if (!isShapeInsideBin(candidate, bin, gap)) {
            continue;
          }

          if (
            placedShapes.some((placedShape) =>
              polygonsOverlap(candidate, placedShape, gap)
            )
          ) {
            continue;
          }

          placements.push({
            id: part.id,
            x,
            y,
            rotation,
            shape: candidate,
          });
          placedShapes.push(candidate);
          placed = true;
          break;
        }

        if (placed) {
          break;
        }
      }

      if (placed) {
        break;
      }
    }

    if (!placed) {
      notPlacedIds.push(part.id);
    }
  });

  return { placements, notPlacedIds };
};

const combinedBoundsArea = (shapes: PolygonShape[]) => {
  const bounds = shapeBounds(shapes.flatMap((shape) => shape.contours));
  return bounds.width * bounds.height;
};

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

  it('finds decimal-fit placements with default search step', () => {
    const bin = rectangleShape(10, 1);
    const parts = [
      rectanglePart('a', 3.4, 1),
      rectanglePart('b', 3.3, 1),
      rectanglePart('c', 3.3, 1),
    ];

    const result = placePartsGreedy(parts, bin, {
      gap: 0,
      rotations: [0],
      curveTolerance: 1,
    });

    expect(result.notPlacedIds).toHaveLength(0);
    expect(result.placements).toHaveLength(3);

    const byId = new Map(
      result.placements.map((placement) => [placement.id, placement])
    );
    expect(byId.get('a')?.x).toBeCloseTo(0, 6);
    expect(byId.get('b')?.x).toBeCloseTo(3.4, 6);
    expect(byId.get('c')?.x).toBeCloseTo(6.7, 6);
  });

  it('treats multi-island parts as solid islands during placement', () => {
    const bin = rectangleShape(250, 100);
    const composite = multiIslandPart('composite', [
      { x: 0, y: 0, width: 100, height: 80 },
      { x: 140, y: 20, width: 30, height: 30 },
    ]);
    const blocker = rectanglePart('blocker', 40, 40);
    const blockerTooWide = rectanglePart('blocker-too-wide', 80, 40);

    const fitsInGap = placePartsGreedy([composite, blocker], bin, {
      gap: 0,
      rotations: [0, 90],
      curveTolerance: 1,
      searchStep: 1,
    });

    expect(fitsInGap.notPlacedIds).toHaveLength(0);
    expect(fitsInGap.placements).toHaveLength(2);

    const compositePlacement = fitsInGap.placements.find(
      (placement) => placement.id === 'composite'
    );
    const blockerPlacement = fitsInGap.placements.find(
      (placement) => placement.id === 'blocker'
    );

    expect(compositePlacement).toBeDefined();
    expect(blockerPlacement).toBeDefined();
    expect(
      polygonsOverlap(compositePlacement!.shape, blockerPlacement!.shape, 0)
    ).toBe(false);

    const tooWideForGap = placePartsGreedy([composite, blockerTooWide], bin, {
      gap: 0,
      rotations: [0],
      curveTolerance: 1,
      searchStep: 1,
    });

    const compositePlacement2 = tooWideForGap.placements.find(
      (placement) => placement.id === 'composite'
    );
    const widePlacement = tooWideForGap.placements.find(
      (placement) => placement.id === 'blocker-too-wide'
    );

    expect(compositePlacement2).toBeDefined();
    expect(widePlacement).toBeDefined();
    expect(
      polygonsOverlap(compositePlacement2!.shape, widePlacement!.shape, 0)
    ).toBe(false);

    const occupiesInterIslandGap = !(
      widePlacement!.x + 80 <= 100 ||
      widePlacement!.x >= 140 ||
      widePlacement!.y + 40 <= 20 ||
      widePlacement!.y >= 50
    );
    expect(occupiesInterIslandGap).toBe(false);
  });

  it('packs a concave fixture tighter than the legacy scan baseline', () => {
    const bin = rectangleShape(140, 100);
    const concavePart: NestPart = {
      id: 'concave',
      sourceModel: new makerjs.models.Rectangle(1, 1),
      shape: normalizeShape(
        createShape([
          [
            { x: 0, y: 0 },
            { x: 80, y: 0 },
            { x: 80, y: 40 },
            { x: 40, y: 40 },
            { x: 40, y: 80 },
            { x: 0, y: 80 },
          ],
        ])
      ),
    };
    const plugPart = rectanglePart('plug', 40, 40);
    const parts = [concavePart, plugPart];
    const interlockedPlug = translateShape(plugPart.shape, 40, 40);

    expect(polygonsOverlap(concavePart.shape, interlockedPlug, 0)).toBe(false);

    const baseline = placePartsScanBaseline(parts, bin, 0, 1);
    const nfpResult = placePartsGreedy(parts, bin, {
      gap: 0,
      rotations: [0],
      curveTolerance: 1,
      searchStep: 1,
    });

    expect(baseline.notPlacedIds).toHaveLength(0);
    expect(nfpResult.notPlacedIds).toHaveLength(0);

    const baselineArea = combinedBoundsArea(
      baseline.placements.map((placement) => placement.shape)
    );
    const nfpArea = combinedBoundsArea(
      nfpResult.placements.map((placement) => placement.shape)
    );

    expect(nfpArea).toBeLessThan(baselineArea);

    const baselinePlug = baseline.placements.find(
      (placement) => placement.id === 'plug'
    );
    const nfpPlug = nfpResult.placements.find(
      (placement) => placement.id === 'plug'
    );

    expect(baselinePlug).toBeDefined();
    expect(nfpPlug).toBeDefined();
    expect(baselinePlug!.x).toBeCloseTo(80, 6);
    expect(baselinePlug!.y).toBeCloseTo(0, 6);
    expect(nfpPlug!.x).toBeCloseTo(40, 6);
    expect(nfpPlug!.y).toBeCloseTo(40, 6);
  });

  it('places a circle inside a ring hole when it fits', () => {
    const bin = rectangleShape(160, 160);
    const ring = customPart('ring', circularRingShape(60, 30));
    const circle = customPart('circle', circularShape(14));

    const result = placePartsGreedy([ring, circle], bin, {
      gap: 0,
      rotations: [0],
      curveTolerance: 1,
    });

    expect(result.notPlacedIds).toHaveLength(0);

    const ringPlacement = result.placements.find(
      (placement) => placement.id === 'ring'
    );
    const circlePlacement = result.placements.find(
      (placement) => placement.id === 'circle'
    );

    expect(ringPlacement).toBeDefined();
    expect(circlePlacement).toBeDefined();
    expect(
      polygonsOverlap(ringPlacement!.shape, circlePlacement!.shape, 0)
    ).toBe(false);

    const ringCenter = {
      x: ringPlacement!.x + 60,
      y: ringPlacement!.y + 60,
    };
    const circleCenter = {
      x:
        circlePlacement!.shape.bounds.minX +
        circlePlacement!.shape.bounds.width / 2,
      y:
        circlePlacement!.shape.bounds.minY +
        circlePlacement!.shape.bounds.height / 2,
    };

    expect(
      Math.hypot(circleCenter.x - ringCenter.x, circleCenter.y - ringCenter.y)
    ).toBeLessThanOrEqual(16.01);
  });

  it('places a rectangle inside a frame hole when it fits', () => {
    const bin = rectangleShape(100, 100);
    const frame = customPart('frame', frameShape(100, 100, 30, 30, 40, 40));
    const insert = rectanglePart('insert', 20, 20);

    const result = placePartsGreedy([frame, insert], bin, {
      gap: 0,
      rotations: [0],
      curveTolerance: 1,
    });

    expect(result.notPlacedIds).toHaveLength(0);

    const framePlacement = result.placements.find(
      (placement) => placement.id === 'frame'
    );
    const insertPlacement = result.placements.find(
      (placement) => placement.id === 'insert'
    );

    expect(framePlacement).toBeDefined();
    expect(insertPlacement).toBeDefined();

    const relativeBounds = {
      minX: insertPlacement!.shape.bounds.minX - framePlacement!.x,
      maxX: insertPlacement!.shape.bounds.maxX - framePlacement!.x,
      minY: insertPlacement!.shape.bounds.minY - framePlacement!.y,
      maxY: insertPlacement!.shape.bounds.maxY - framePlacement!.y,
    };

    expect(relativeBounds.minX).toBeGreaterThanOrEqual(30 - 1e-6);
    expect(relativeBounds.maxX).toBeLessThanOrEqual(70 + 1e-6);
    expect(relativeBounds.minY).toBeGreaterThanOrEqual(30 - 1e-6);
    expect(relativeBounds.maxY).toBeLessThanOrEqual(70 + 1e-6);
  });

  it('rejects a part that is too large for a hole', () => {
    const bin = rectangleShape(100, 100);
    const frame = customPart('frame', frameShape(100, 100, 30, 30, 40, 40));
    const tooLarge = rectanglePart('too-large', 45, 45);

    const result = placePartsGreedy([frame, tooLarge], bin, {
      gap: 0,
      rotations: [0],
      curveTolerance: 1,
    });

    expect(
      result.placements.some((placement) => placement.id === 'frame')
    ).toBe(true);
    expect(
      result.placements.some((placement) => placement.id === 'too-large')
    ).toBe(false);
    expect(result.notPlacedIds).toEqual(['too-large']);
  });

  it('shrinks usable hole area when gap increases', () => {
    const bin = rectangleShape(124, 124);
    const frame = customPart('frame', frameShape(120, 120, 30, 30, 60, 60));
    const insert = rectanglePart('insert', 58, 58);

    const noGap = placePartsGreedy([frame, insert], bin, {
      gap: 0,
      rotations: [0],
      curveTolerance: 1,
    });
    const withGap = placePartsGreedy([frame, insert], bin, {
      gap: 2,
      rotations: [0],
      curveTolerance: 1,
    });

    expect(noGap.notPlacedIds).toHaveLength(0);
    expect(
      withGap.placements.some((placement) => placement.id === 'frame')
    ).toBe(true);
    expect(withGap.notPlacedIds).toEqual(['insert']);
  });

  it('still places ordinary non-hole rectangular fixtures', () => {
    const bin = rectangleShape(100, 50);
    const parts = [rectanglePart('a', 60, 50), rectanglePart('b', 40, 50)];

    const result = placePartsGreedy(parts, bin, {
      gap: 0,
      rotations: [0],
      curveTolerance: 1,
    });

    expect(result.notPlacedIds).toHaveLength(0);
    expect(result.placements).toHaveLength(2);
  });

  it('places insert in diamond-shaped hole using interior anchor when boundary candidates are taken', () => {
    // Diamond holes produce very few vertex-alignment candidates from buildInnerFitPolygon
    // because most corner positions fall outside the diamond shape.
    // A blocker occupies the first valid boundary candidate (e.g. (80,80)).
    // holeInteriorAnchors adds a center candidate (95,95) and quarter-point anchors,
    // giving the insert a valid position without relying on pairwise or boundary candidates.
    const bin = rectangleShape(200, 200);
    const diamondFrame = customPart(
      'diamond-frame',
      normalizeShape(
        createShape([
          [
            { x: 0, y: 0 },
            { x: 200, y: 0 },
            { x: 200, y: 200 },
            { x: 0, y: 200 },
          ],
          // diamond hole: center (100,100), L1-radius 40
          [
            { x: 60, y: 100 },
            { x: 100, y: 60 },
            { x: 140, y: 100 },
            { x: 100, y: 140 },
          ],
        ])
      )
    );
    // blocker and insert are the same size; both must fit inside the diamond hole
    const blocker = customPart('blocker', rectangleShape(10, 10));
    const insert = customPart('insert', rectangleShape(10, 10));

    const result = placePartsGreedy([diamondFrame, blocker, insert], bin, {
      gap: 0,
      rotations: [0],
      curveTolerance: 1,
    });

    expect(result.notPlacedIds).toHaveLength(0);
    expect(result.placements).toHaveLength(3);

    // both blocker and insert must be inside the diamond hole
    for (const id of ['blocker', 'insert']) {
      const p = result.placements.find((pl) => pl.id === id);
      expect(p).toBeDefined();
      // check all four corners of the 10x10 placed part are inside the diamond
      const corners = [
        { x: p!.x, y: p!.y },
        { x: p!.x + 10, y: p!.y },
        { x: p!.x + 10, y: p!.y + 10 },
        { x: p!.x, y: p!.y + 10 },
      ];
      for (const c of corners) {
        expect(Math.abs(c.x - 100) + Math.abs(c.y - 100)).toBeLessThanOrEqual(
          40 + NESTING_EPSILON
        );
      }
    }

    // the two placed parts must not overlap
    const bPlacement = result.placements.find((pl) => pl.id === 'blocker')!;
    const iPlacement = result.placements.find((pl) => pl.id === 'insert')!;
    const blockerShape = translateShape(
      rectangleShape(10, 10),
      bPlacement.x,
      bPlacement.y
    );
    const insertShape = translateShape(
      rectangleShape(10, 10),
      iPlacement.x,
      iPlacement.y
    );
    expect(polygonsOverlap(blockerShape, insertShape, 0)).toBe(false);
  });
});

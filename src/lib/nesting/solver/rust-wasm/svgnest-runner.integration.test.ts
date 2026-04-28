import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type {
  NormalizedPackingOptions,
  PreparedNestInput,
} from '@/lib/nesting/orchestration/runtime-types';
import type { NestPart, PolygonShape } from '@/lib/nesting/polygon/types';
import { runSvgNest } from '@/lib/nesting/solver/rust-wasm/svgnest-runner';

const wasmPath = resolve('public/nesting/polygon-packer.wasm');
const shouldRun =
  existsSync(wasmPath) || process.env.SVGNEST_WASM_REQUIRED === 'true';
const describeIfWasm = shouldRun ? describe : describe.skip;

const rectangleShape = (width: number, height: number): PolygonShape => ({
  contours: [
    [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width, y: height },
      { x: 0, y: height },
    ],
  ],
  bounds: {
    minX: 0,
    minY: 0,
    maxX: width,
    maxY: height,
    width,
    height,
  },
  area: width * height,
});

const shapeWithHole = (
  width: number,
  height: number,
  holeMinX: number,
  holeMinY: number,
  holeWidth: number,
  holeHeight: number
): PolygonShape => ({
  contours: [
    rectangleShape(width, height).contours[0],
    [
      { x: holeMinX, y: holeMinY },
      { x: holeMinX, y: holeMinY + holeHeight },
      { x: holeMinX + holeWidth, y: holeMinY + holeHeight },
      { x: holeMinX + holeWidth, y: holeMinY },
    ],
  ],
  bounds: {
    minX: 0,
    minY: 0,
    maxX: width,
    maxY: height,
    width,
    height,
  },
  area: width * height - holeWidth * holeHeight,
});

const part = (id: string, shape: PolygonShape): NestPart => ({
  id,
  shape,
  sourceModel: {},
});

const preparedInput = (
  target: PolygonShape,
  parts: NestPart[]
): PreparedNestInput =>
  ({
    nestingArea: {},
    nestingShape: target,
    nestingExtents: {
      low: [0, 0],
      high: [target.bounds.width, target.bounds.height],
    },
    parts,
    invalidModels: {},
    sourceModel: {},
    targetModelId: '__target__',
  }) as PreparedNestInput;

const options: NormalizedPackingOptions = {
  nestingEngine: 'rust-wasm',
  gap: 0,
  allowRotation: false,
  rotations: [0],
  curveTolerance: 1,
  useGeneticSearch: false,
  populationSize: 24,
  maxGenerations: 1,
  mutationRate: 0.1,
  crossoverRate: 0.85,
  eliteCount: 1,
};

const wasmBytes = () => {
  if (!existsSync(wasmPath)) {
    throw new Error(`Missing SVGnest WASM artifact: ${wasmPath}`);
  }

  const bytes = readFileSync(wasmPath);

  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  );
};

describeIfWasm('SVGnest WASM runner', () => {
  it('places a rectangle in a rectangle target', async () => {
    const result = await runSvgNest(
      preparedInput(rectangleShape(100, 80), [
        part('part-a', rectangleShape(30, 20)),
      ]),
      options,
      wasmBytes()
    );

    expect(result.placements).toHaveLength(1);
    expect(result.placements[0]?.id).toBe('part-a');
    expect(result.notPlacedIds).toEqual([]);
  });

  it('reports an oversized rectangle as not placed', async () => {
    const result = await runSvgNest(
      preparedInput(rectangleShape(100, 80), [
        part('too-large', rectangleShape(200, 200)),
      ]),
      options,
      wasmBytes()
    );

    expect(result.placements).toEqual([]);
    expect(result.notPlacedIds).toEqual(['too-large']);
  });

  it('does not place parts inside target holes', async () => {
    const result = await runSvgNest(
      preparedInput(shapeWithHole(120, 100, 0, 0, 70, 70), [
        part('part-a', rectangleShape(30, 30)),
      ]),
      options,
      wasmBytes()
    );

    expect(result.placements).toHaveLength(1);
    expect(result.placements[0]?.x >= 70 || result.placements[0]?.y >= 70).toBe(
      true
    );
  });

  it('supports integer spacing', async () => {
    const result = await runSvgNest(
      preparedInput(rectangleShape(100, 80), [
        part('part-a', rectangleShape(30, 20)),
      ]),
      { ...options, gap: 1 },
      wasmBytes()
    );

    expect(result.placements).toHaveLength(1);
    expect(result.notPlacedIds).toEqual([]);
  });
});

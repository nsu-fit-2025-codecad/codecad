import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import makerjs from 'makerjs';
import { describe, expect, it } from 'vitest';
import { CAD_SNIPPETS, getCadSnippetParameters } from '@/lib/cad/snippets';
import { cad, normalizeEditorModelResult } from '@/lib/cad/runtime';
import { prepareNestInput } from '@/lib/nesting/orchestration/input-preparation';
import type {
  NormalizedPackingOptions,
  PreparedNestInput,
} from '@/lib/nesting/orchestration/runtime-types';
import type { NestPart, PolygonShape } from '@/lib/nesting/polygon/types';
import {
  buildSvgNestPolygons,
  runSvgNest,
  runSvgNestRaw,
} from '@/lib/nesting/solver/rust-wasm/svgnest-runner';

const wasmPath = resolve('public/nesting/polygon-packer.wasm');
const shouldRunWasm = process.env.SVGNEST_WASM_REQUIRED === 'true';
const describeIfWasm = shouldRunWasm ? describe : describe.skip;

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
  wasmSearchMode: 'single',
  wasmAttempts: 1,
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

describe('SVGnest WASM input conversion', () => {
  it('passes part holes as staged child contours and keeps target holes as bin holes', () => {
    const prepared = preparedInput(shapeWithHole(120, 100, 10, 10, 20, 20), [
      part('frame', shapeWithHole(80, 60, 20, 15, 40, 30)),
      part('insert', rectangleShape(30, 20)),
    ]);

    const input = buildSvgNestPolygons(prepared, options);

    expect(input.binHoleCount).toBe(1);
    expect(input.polygons).toHaveLength(5);
    expect(input.sourceMap).toEqual([
      { partIndex: 0, isRoot: true },
      { partIndex: 1, isRoot: true },
      { partIndex: 0, isRoot: false },
    ]);

    const frameOuterX = input.polygons[0][0];
    const insertX = input.polygons[1][0];
    const frameHoleX = input.polygons[2][0];

    expect(frameHoleX).toBeGreaterThan(frameOuterX);
    expect(insertX).toBeGreaterThan(frameOuterX + 100);
  });
});

describe('SVGnest vendor patches', () => {
  it('keeps the part-in-part child NFP size check patched', () => {
    const pairFlow = readFileSync(
      resolve('vendor/svgnest/polygon-packer-algo/src/nesting/pair_flow.rs'),
      'utf8'
    );

    expect(pairFlow).toContain('let size_b = polygon_b.size();');
    expect(pairFlow).not.toContain('let size_b = child.size();');
  });
});

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

  it('places a smaller part inside a placed part hole', async () => {
    const result = await runSvgNest(
      preparedInput(rectangleShape(130, 70), [
        part('frame', shapeWithHole(80, 60, 20, 15, 40, 30)),
        part('insert', rectangleShape(30, 20)),
      ]),
      options,
      wasmBytes()
    );

    expect(result.placements.map((placement) => placement.id).sort()).toEqual([
      'frame',
      'insert',
    ]);
    expect(result.notPlacedIds).toEqual([]);

    const frame = result.placements.find(
      (placement) => placement.id === 'frame'
    );
    const insert = result.placements.find(
      (placement) => placement.id === 'insert'
    );

    expect(insert!.x).toBeGreaterThanOrEqual(frame!.x + 20);
    expect(insert!.x + 30).toBeLessThanOrEqual(frame!.x + 60);
    expect(insert!.y).toBeGreaterThanOrEqual(frame!.y + 15);
    expect(insert!.y + 20).toBeLessThanOrEqual(frame!.y + 45);
  });

  it('can place a smaller part inside a placed part hole before TS postprocess', async () => {
    const result = await runSvgNestRaw(
      preparedInput(rectangleShape(130, 70), [
        part('frame', shapeWithHole(80, 60, 20, 15, 40, 30)),
        part('insert', rectangleShape(30, 20)),
      ]),
      options,
      wasmBytes()
    );

    expect(result.placements.map((placement) => placement.id).sort()).toEqual([
      'frame',
      'insert',
    ]);

    const frame = result.placements.find(
      (placement) => placement.id === 'frame'
    );
    const insert = result.placements.find(
      (placement) => placement.id === 'insert'
    );

    expect(insert!.x).toBeGreaterThanOrEqual(frame!.x + 20);
    expect(insert!.x + 30).toBeLessThanOrEqual(frame!.x + 60);
    expect(insert!.y).toBeGreaterThanOrEqual(frame!.y + 15);
    expect(insert!.y + 20).toBeLessThanOrEqual(frame!.y + 45);
  });

  it.each([
    'demoFrameInsert',
    'demoPerforatedSheet',
    'demoRoundedMix',
  ] as const)(
    'runs the %s CAD snippet without panicking',
    async (snippetId) => {
      const snippet = CAD_SNIPPETS[snippetId];
      const snippetParameters = getCadSnippetParameters(snippetId);
      const createModel = new Function(
        'makerjs',
        'cad',
        ...snippetParameters.map((parameter) => parameter.name),
        `return (function () {
          ${snippet.code}
        })();`
      );
      const model = normalizeEditorModelResult(
        createModel(
          makerjs,
          cad,
          ...snippetParameters.map((parameter) => parameter.value)
        )
      );
      const targetId = 'target';
      const { prepared } = prepareNestInput(model, targetId, options);

      expect(prepared).not.toBeNull();
      const result = await runSvgNest(prepared!, options, wasmBytes());

      expect(result.placements.length + result.notPlacedIds.length).toBe(
        prepared!.parts.length
      );
    }
  );
});

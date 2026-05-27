import { describe, expect, it } from 'vitest';
import { evaluateCadSource } from '@/lib/cad/evaluation';

describe('evaluateCadSource', () => {
  it('evaluates source code into a model, model list, and SVG', () => {
    const result = evaluateCadSource({
      sourceCode: `
        return cad.sketch({
          plate: cad.rect(width, 20),
          hole: cad.circle(radius).centerAt([width / 2, 10])
        });
      `,
      parameters: [
        { name: 'width', value: 80 },
        { name: 'radius', value: 4 },
      ],
    });

    expect(Object.keys(result.model.models ?? {}).sort()).toEqual([
      'hole',
      'plate',
    ]);
    expect(result.modelSizes.map((model) => model.id).sort()).toEqual([
      'hole',
      'plate',
    ]);
    expect(result.svgString).toContain('<svg');
    expect(result.svgString).toContain('id="plate"');
  });

  it('passes runtime parameters into user code', () => {
    const result = evaluateCadSource({
      sourceCode: 'return cad.rect(size, size / 2);',
      parameters: [{ name: 'size', value: 42 }],
    });

    expect(result.svgString).toContain('width="42"');
    expect(result.svgString).toContain('height="21"');
  });

  it('throws user code errors for caller normalization', () => {
    expect(() =>
      evaluateCadSource({
        sourceCode: 'throw new Error("boom");',
        parameters: [],
      })
    ).toThrow('boom');
  });
});

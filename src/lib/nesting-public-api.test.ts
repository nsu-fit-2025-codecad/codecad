import { describe, expect, it } from 'vitest';
import makerjs from 'makerjs';
import {
  runNestingInArea,
  type NestingRunStats,
  type PackingOptions,
} from '@/lib/nesting';

describe('public nesting API', () => {
  it('can be imported from the consumer-facing barrel', () => {
    const options: PackingOptions = {
      allowRotation: false,
      useGeneticSearch: false,
    };
    const result = runNestingInArea({
      nestingArea: new makerjs.models.Rectangle(120, 80),
      modelsToNest: {
        bracket: new makerjs.models.Rectangle(30, 20),
      },
      options,
    });
    const stats: NestingRunStats = result.stats;

    expect(Object.keys(result.packedModels)).toEqual(['bracket']);
    expect(stats.placedCount).toBe(1);
  });
});

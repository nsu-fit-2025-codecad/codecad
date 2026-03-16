import makerjs from 'makerjs';
import { describe, expect, it } from 'vitest';
import {
  cad,
  isMakerModelLike,
  normalizeEditorModelResult,
} from '@/lib/cad/runtime';

describe('normalizeEditorModelResult', () => {
  it('keeps legacy Maker.js models untouched', () => {
    const legacyModel = {
      models: {
        square: new makerjs.models.Rectangle(20, 20),
      },
    };

    const result = normalizeEditorModelResult(legacyModel);

    expect(result).toBe(legacyModel);
    expect(isMakerModelLike(result)).toBe(true);
  });

  it('compiles cad sketches into Maker.js models with stable child ids', () => {
    const sketch = cad.sketch({
      panel: cad.rect(100, 60),
      slot: cad
        .polyline(
          [
            [0, 0],
            [20, 0],
            [20, 5],
            [0, 5],
          ],
          { closed: true }
        )
        .translate(10, 10)
        .onLayer('etch'),
    });

    const model = normalizeEditorModelResult(sketch);
    const slot = model.models?.slot;

    expect(Object.keys(model.models ?? {}).sort()).toEqual(['panel', 'slot']);
    expect(slot?.layer).toBe('etch');
  });

  it('supports the editor runtime shape flow through new Function', () => {
    const createModel = new Function(
      'makerjs',
      'cad',
      `return (function () {
        return cad.sketch({
          outline: cad.rect(50, 30),
          marker: cad.circle(5).translate(10, 10)
        });
      })();`
    );

    const evaluated = createModel(makerjs, cad);
    const model = normalizeEditorModelResult(evaluated);

    expect(Object.keys(model.models ?? {}).sort()).toEqual([
      'marker',
      'outline',
    ]);
  });

  it('throws for non-model values', () => {
    expect(() => normalizeEditorModelResult('not-a-model')).toThrow(
      /must return a Maker\.js model/
    );
  });
});

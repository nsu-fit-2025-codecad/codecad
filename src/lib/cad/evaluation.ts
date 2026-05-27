import makerjs, { type IModel } from 'makerjs';
import { mapModelsToSizes } from '@/lib/geometry';
import { renderModelToSvg } from '@/lib/svg-render';
import { cad, normalizeEditorModelResult } from '@/lib/cad/runtime';
import type { Parameter } from '@/store/store';
import type { Model } from '@/store/models-store';

export interface EvaluateCadSourceInput {
  sourceCode: string;
  parameters: readonly Parameter[];
}

export interface EvaluateCadSourceResult {
  model: IModel;
  modelSizes: Model[];
  svgString: string;
}

export const evaluateCadSource = ({
  sourceCode,
  parameters,
}: EvaluateCadSourceInput): EvaluateCadSourceResult => {
  const createModel = new Function(
    'makerjs',
    'cad',
    ...parameters.map((parameter) => parameter.name),
    `return (function() {
      ${sourceCode}
    })();`
  );

  const executionResult = createModel(
    makerjs,
    cad,
    ...parameters.map((parameter) => parameter.value)
  );
  const model: IModel = normalizeEditorModelResult(executionResult);

  return {
    model,
    modelSizes: model.models ? mapModelsToSizes(model.models) : [],
    svgString: renderModelToSvg(model),
  };
};

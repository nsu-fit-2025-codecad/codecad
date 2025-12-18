import React, { useCallback, useEffect, useState } from 'react';
import makerjs, { IModel } from 'makerjs';
import { ParametersPane } from '@/components/parameters-pane';
import { useEditorStore, useParametersStore } from '@/store/store';
import { CodeEditor } from '@/components/code-editor';
import { VisualizationArea } from '@/components/visualization-area';
import { mapModelsToSizes } from '@/lib/geometry';
import { useModelsStore } from '@/store/models-store';
import { ModelsPane } from '@/components/models-pane';
import { packModelsIntoNestingArea } from '@/lib/nesting';

export const HomePage = () => {
  const [svg, setSvg] = useState<string>('');
  const [model, setModel] = useState<IModel | null>(null);

  const { parameters } = useParametersStore();
  const { update, updateFitStatus } = useModelsStore();
  const { code, settings } = useEditorStore();

  const evalInput = useCallback(() => {
    if (!code) {
      return;
    }
    try {
      const createModel = new Function(
        'makerjs',
        ...parameters.map((p) => p.name),
        `return (function() {
          ${code}
        })();`
      );

      const model: IModel = createModel(
        makerjs,
        ...parameters.map((p) => p.value)
      );

      setModel(model);
      if (model.models) {
        update(mapModelsToSizes(model.models));
      }

      const svgString = makerjs.exporter.toSVG(model);
      setSvg(svgString);
    } catch (error) {
      console.error('Error:', error);
      setSvg('');
    }
  }, [update, code, parameters]);

  useEffect(() => {
    if (!settings.autorun) {
      return;
    }
    evalInput();
  }, [evalInput, settings.autorun, code, parameters]);

  const runNesting = () => {
    if (!model) {
      return;
    }

    if (model.models) {
      const { nestingArea, ...modelsToNest } = model.models;

      if (nestingArea && Object.keys(modelsToNest).length > 0) {
        const { packedModels, didNotFitModels } = packModelsIntoNestingArea(
          nestingArea,
          modelsToNest
        );

        const packed = model;

        packed.models = {
          nestingArea,
          ...packedModels,
        };

        const packedIds = new Set(Object.keys(packedModels));
        const notFitIds = new Set(Object.keys(didNotFitModels));

        updateFitStatus(packedIds, notFitIds);

        const svgString = makerjs.exporter.toSVG(packed);
        setSvg(svgString);
      }
    }
  };

  return (
    <div className="relative h-screen w-screen bg-gray-50">
      <VisualizationArea svgString={svg} />
      <ModelsPane
        className="fixed left-4 w-80 top-4 h-[calc(100vh-2rem)]"
        onRunNesting={runNesting}
      />
      <CodeEditor
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-10"
        onExecuteCode={evalInput}
      />
      <ParametersPane
        className="fixed right-4 w-80 top-4 h-[calc(100vh-2rem)] z-10"
        onParametersEdit={() => {}}
        //parameters={parameters}
      />
    </div>
  );
};

import React, { useCallback, useEffect, useState } from 'react';
import makerjs, { IModel } from 'makerjs';
import { ParametersPane } from '@/components/parameters-pane';
import { useEditorStore, useParametersStore } from '@/store/store';
import { mapModelsToSizes } from '@/lib/geometry';
import { useModelsStore } from '@/store/models-store';
import { ModelsPane } from '@/components/models-pane';
import { packModelsIntoNestingArea } from '@/lib/nesting';
import { Toolbar } from '@/components/toolbar';
import { usePanesStore } from '@/store/panes-store';
import { WorkbenchLayout } from '@/components/workbench-layout';

export const HomePage = () => {
  const [svg, setSvg] = useState<string>('');
  const [model, setModel] = useState<IModel | null>(null);

  const { parameters } = useParametersStore();
  const { update, updateFitStatus, selectedModelId } = useModelsStore();
  const { code, settings } = useEditorStore();
  const {
    isModelsPaneOpen,
    isParametersPaneOpen,
    closeModelsPane,
    closeParametersPane,
  } = usePanesStore();

  const exportDXF = () => {
    if (!model) {
      alert('No model to export');
      return;
    }

    try {
      const dxf = makerjs.exporter.toDXF(model, {
        units: 'Millimeter',
        usePOLYLINE: true,
      });

      const blob = new Blob([dxf], {
        type: 'application/dxf',
      });

      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `drawing_${Date.now()}.dxf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('DXF export error:', error);
    }
  };

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

      const svgString = makerjs.exporter.toSVG(model, {
        useSvgPathOnly: false,
      });
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

        const svgString = makerjs.exporter.toSVG(packed, {
          useSvgPathOnly: false,
        });
        setSvg(svgString);
      }
    }
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-gray-50">
      <WorkbenchLayout
        svgString={svg}
        selectedModelId={selectedModelId}
        onExecuteCode={evalInput}
      />
      <Toolbar className="fixed top-14 left-1/2 -translate-x-1/2 z-30" />
      {isModelsPaneOpen && (
        <ModelsPane
          className="fixed left-4 w-80 top-4 h-[calc(100vh-2rem)] z-10"
          onRunNesting={runNesting}
          onExportDXF={exportDXF}
          onClose={closeModelsPane}
        />
      )}
      {isParametersPaneOpen && (
        <ParametersPane
          className="fixed right-4 w-80 top-4 h-[calc(100vh-2rem)] z-10"
          onParametersEdit={() => {}}
          onClose={closeParametersPane}
        />
      )}
    </div>
  );
};

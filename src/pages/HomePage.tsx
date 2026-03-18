import React, { useCallback, useRef, useState } from 'react';
import makerjs, { IModel } from 'makerjs';
import { ParametersPane } from '@/components/parameters-pane';
import { useEditorStore, useParametersStore } from '@/store/store';
import { mapModelsToSizes } from '@/lib/geometry';
import { useModelsStore } from '@/store/models-store';
import { ModelsPane } from '@/components/models-pane';
import { Toolbar } from '@/components/toolbar';
import { usePanesStore } from '@/store/panes-store';
import { WorkbenchLayout } from '@/components/workbench-layout';
import { NestingTargetDialog } from '@/components/nesting-target-dialog';
import { NestingStatus } from '@/components/nesting-status';
import { useNestingController } from '@/lib/nesting/controller/use-nesting-controller';
import { renderModelToSvg } from '@/lib/svg-render';

interface ResolveDisplayedSvgInput {
  committedSvg: string;
  previewSvg: string | null;
  isNestingRunning: boolean;
}

export const resolveDisplayedSvg = ({
  committedSvg,
  previewSvg,
  isNestingRunning,
}: ResolveDisplayedSvgInput) =>
  isNestingRunning && typeof previewSvg === 'string'
    ? previewSvg
    : committedSvg;

export const HomePage = () => {
  const [svg, setSvg] = useState<string>('');
  const [model, setModel] = useState<IModel | null>(null);
  const modelRevisionRef = useRef(0);

  const { parameters } = useParametersStore();
  const {
    update,
    updateFitStatus,
    selectedModelId,
    models: availableModels,
  } = useModelsStore();
  const { code, settings } = useEditorStore();
  const {
    isModelsPaneOpen,
    isParametersPaneOpen,
    closeModelsPane,
    closeParametersPane,
  } = usePanesStore();

  const bumpModelRevision = () => {
    modelRevisionRef.current += 1;
  };

  const getModelRevision = () => modelRevisionRef.current;

  const {
    nestingOptions,
    setNestingOptions,
    isDialogOpen,
    setIsDialogOpen,
    isRunning,
    progress,
    previewSvg,
    stats,
    error,
    isStatusVisible,
    runNestingForTarget,
    cancelNestingRun,
    dismissNestingStatus,
  } = useNestingController({
    model,
    updateFitStatus,
    setModel,
    setSvg,
    getModelRevision,
    bumpModelRevision,
  });

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
    } catch (nextError) {
      console.error('DXF export error:', nextError);
    }
  };

  const evalInput = useCallback(() => {
    if (!code) {
      return;
    }

    try {
      const createModel = new Function(
        'makerjs',
        ...parameters.map((parameter) => parameter.name),
        `return (function() {
          ${code}
        })();`
      );

      const nextModel: IModel = createModel(
        makerjs,
        ...parameters.map((parameter) => parameter.value)
      );

      setModel(nextModel);
      if (nextModel.models) {
        update(mapModelsToSizes(nextModel.models));
      }

      setSvg(renderModelToSvg(nextModel));
      bumpModelRevision();
    } catch (nextError) {
      console.error('Error:', nextError);
      setSvg('');
      bumpModelRevision();
    }
  }, [code, parameters, update]);

  React.useEffect(() => {
    if (!settings.autorun) {
      return;
    }

    evalInput();
  }, [evalInput, settings.autorun, code, parameters]);

  const runNesting = () => {
    if (!model || !model.models || isRunning) {
      return;
    }

    setIsDialogOpen(true);
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background text-foreground">
      <WorkbenchLayout
        svgString={resolveDisplayedSvg({
          committedSvg: svg,
          previewSvg,
          isNestingRunning: isRunning,
        })}
        selectedModelId={selectedModelId}
        onExecuteCode={evalInput}
      />
      <Toolbar
        className="fixed bottom-5 left-1/2 z-30 -translate-x-1/2"
        onRunNesting={runNesting}
        isNesting={isRunning}
      />
      <NestingTargetDialog
        open={isDialogOpen}
        models={availableModels}
        initialTargetModelId={selectedModelId}
        initialOptions={nestingOptions}
        isNesting={isRunning}
        onOpenChange={setIsDialogOpen}
        onConfirm={async (targetModelId, options) => {
          setNestingOptions(options);
          await runNestingForTarget(targetModelId, options);
        }}
      />
      {isStatusVisible && (
        <NestingStatus
          className="fixed top-4 left-1/2 z-20 -translate-x-1/2"
          isRunning={isRunning}
          progress={progress}
          stats={stats}
          error={error}
          onCancel={cancelNestingRun}
          onDismiss={dismissNestingStatus}
        />
      )}
      {isModelsPaneOpen && (
        <ModelsPane
          className="fixed left-4 top-4 z-10 h-[calc(100vh-2rem)] w-80"
          onExportDXF={exportDXF}
          onClose={closeModelsPane}
        />
      )}
      {isParametersPaneOpen && (
        <ParametersPane
          className="fixed right-4 top-4 z-10 h-[calc(100vh-2rem)] w-80"
          onClose={closeParametersPane}
        />
      )}
    </div>
  );
};

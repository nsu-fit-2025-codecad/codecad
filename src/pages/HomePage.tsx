import React, { useCallback, useEffect, useRef, useState } from 'react';
import makerjs, { IModel } from 'makerjs';
import { toast } from 'sonner';
import { ParametersPane } from '@/components/parameters-pane';
import { useEditorStore, useParametersStore } from '@/store/store';
import { cad, normalizeEditorModelResult } from '@/lib/cad';
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
import { MvpDemoPanel } from '@/components/mvp-demo-panel';
import {
  getMvpDemoNestingPreset,
  getMvpDemoScene,
  type MvpDemoNestingPresetId,
  type MvpDemoSceneId,
} from '@/lib/demo/mvp-demo';
import { hydrateProjectState } from '@/lib/project-state/hydrate';
import {
  createProjectStateSnapshot,
  type ProjectStateInput,
  type ProjectStateSnapshot,
} from '@/lib/project-state/contract';
import {
  createProjectShareUrl,
  readProjectStateFromUrl,
  removeProjectStateFromUrl,
} from '@/lib/project-state/share-url';
import {
  createProjectHistory,
  type ProjectHistory,
} from '@/lib/project-history';
import {
  createProjectHistoryCaptureScheduler,
  type ProjectHistoryCaptureScheduler,
} from '@/lib/project-history/capture-scheduler';
import { getProjectHistoryHotkeyAction } from '@/lib/project-history/hotkeys';
import { cn } from '@/lib/utils';

const AUTORUN_EVALUATION_DELAY_MS = 180;
const CODE_HISTORY_CAPTURE_DELAY_MS = 600;

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
  const [activeDemoSceneId, setActiveDemoSceneId] =
    useState<MvpDemoSceneId | null>(null);
  const [historyAvailability, setHistoryAvailability] = useState({
    canUndo: false,
    canRedo: false,
  });
  const modelRevisionRef = useRef(0);
  const projectHistoryRef = useRef<ProjectHistory | null>(null);
  const isApplyingHistoryRef = useRef(false);
  const commitProjectSnapshotRef = useRef<() => void>(() => {});
  const codeHistorySchedulerRef = useRef<ProjectHistoryCaptureScheduler | null>(
    null
  );

  if (!projectHistoryRef.current) {
    projectHistoryRef.current = createProjectHistory();
  }

  if (!codeHistorySchedulerRef.current) {
    codeHistorySchedulerRef.current = createProjectHistoryCaptureScheduler({
      delayMs: CODE_HISTORY_CAPTURE_DELAY_MS,
      capture: () => commitProjectSnapshotRef.current(),
    });
  }

  useEffect(
    () => () => {
      codeHistorySchedulerRef.current?.cancel();
    },
    []
  );

  const { parameters, replaceAll: replaceAllParameters } = useParametersStore();
  const {
    update,
    updateFitStatus,
    selectedModelId,
    models: availableModels,
    selectModel,
    clearSelectedModel,
  } = useModelsStore();
  const { code, editCode, settings, editSettings } = useEditorStore();
  const {
    isModelsPaneOpen,
    isParametersPaneOpen,
    isDemoPaneOpen,
    closeModelsPane,
    closeParametersPane,
    closeDemoPane,
    openParametersPane,
    toggleDemoPane,
  } = usePanesStore();

  const bumpModelRevision = useCallback(() => {
    modelRevisionRef.current += 1;
  }, []);

  const getModelRevision = useCallback(() => modelRevisionRef.current, []);

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
  const nestingOptionsRef = useRef(nestingOptions);

  useEffect(() => {
    nestingOptionsRef.current = nestingOptions;
  }, [nestingOptions]);

  const updateProjectHistoryAvailability = useCallback(() => {
    const history = projectHistoryRef.current;

    setHistoryAvailability({
      canUndo: history?.canUndo() ?? false,
      canRedo: history?.canRedo() ?? false,
    });
  }, []);

  const createCurrentProjectSnapshot = useCallback(
    (overrides: Partial<ProjectStateInput> = {}) => {
      const editorState = useEditorStore.getState();

      return createProjectStateSnapshot({
        code: editorState.code ?? '',
        parameters: useParametersStore.getState().parameters,
        editorSettings: {
          autorun: editorState.settings.autorun,
        },
        nestingOptions: nestingOptionsRef.current,
        selectedTargetModelId: useModelsStore.getState().selectedModelId,
        ...overrides,
      });
    },
    []
  );

  const pushProjectSnapshot = useCallback(
    (snapshot: ProjectStateInput | ProjectStateSnapshot) => {
      if (isApplyingHistoryRef.current) {
        return false;
      }

      const didPush = projectHistoryRef.current?.push(snapshot) ?? false;

      if (didPush) {
        updateProjectHistoryAvailability();
      }

      return didPush;
    },
    [updateProjectHistoryAvailability]
  );

  const commitCurrentProjectSnapshot = useCallback(
    (overrides: Partial<ProjectStateInput> = {}) =>
      pushProjectSnapshot(createCurrentProjectSnapshot(overrides)),
    [createCurrentProjectSnapshot, pushProjectSnapshot]
  );

  commitProjectSnapshotRef.current = () => {
    commitCurrentProjectSnapshot();
  };

  const flushPendingCodeSnapshot = useCallback(() => {
    codeHistorySchedulerRef.current?.flush();
  }, []);

  const setTrackedNestingOptions = useCallback(
    (options: typeof nestingOptions) => {
      nestingOptionsRef.current = options;
      setNestingOptions(options);
    },
    [setNestingOptions]
  );

  const evaluateSourceCode = useCallback(
    (
      sourceCode: string,
      runtimeParameters = useParametersStore.getState().parameters
    ) => {
      if (!sourceCode) {
        return;
      }

      try {
        const createModel = new Function(
          'makerjs',
          'cad',
          ...runtimeParameters.map((parameter) => parameter.name),
          `return (function() {
          ${sourceCode}
        })();`
        );

        const executionResult = createModel(
          makerjs,
          cad,
          ...runtimeParameters.map((parameter) => parameter.value)
        );
        const nextModel: IModel = normalizeEditorModelResult(executionResult);

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
    },
    [bumpModelRevision, update]
  );

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

    flushPendingCodeSnapshot();
    evaluateSourceCode(code);
  }, [code, evaluateSourceCode, flushPendingCodeSnapshot]);

  const applyHistorySnapshot = useCallback(
    (snapshot: ProjectStateSnapshot) => {
      codeHistorySchedulerRef.current?.cancel();
      isApplyingHistoryRef.current = true;

      try {
        hydrateProjectState({
          state: snapshot,
          replaceParameters: replaceAllParameters,
          editCode,
          editSettings,
          setNestingOptions: setTrackedNestingOptions,
          evaluateSourceCode,
          selectTargetModel: selectModel,
          clearSelectedTargetModel: clearSelectedModel,
        });
      } finally {
        isApplyingHistoryRef.current = false;
        updateProjectHistoryAvailability();
      }
    },
    [
      clearSelectedModel,
      editCode,
      editSettings,
      evaluateSourceCode,
      replaceAllParameters,
      selectModel,
      setTrackedNestingOptions,
      updateProjectHistoryAvailability,
    ]
  );

  const undoProject = useCallback(() => {
    flushPendingCodeSnapshot();

    const snapshot = projectHistoryRef.current?.undo();

    if (snapshot) {
      applyHistorySnapshot(snapshot);
      return;
    }

    updateProjectHistoryAvailability();
  }, [
    applyHistorySnapshot,
    flushPendingCodeSnapshot,
    updateProjectHistoryAvailability,
  ]);

  const redoProject = useCallback(() => {
    flushPendingCodeSnapshot();

    const snapshot = projectHistoryRef.current?.redo();

    if (snapshot) {
      applyHistorySnapshot(snapshot);
      return;
    }

    updateProjectHistoryAvailability();
  }, [
    applyHistorySnapshot,
    flushPendingCodeSnapshot,
    updateProjectHistoryAvailability,
  ]);

  const handleCodeChange = useCallback(
    (nextCode?: string) => {
      editCode(nextCode);

      if (!isApplyingHistoryRef.current) {
        codeHistorySchedulerRef.current?.schedule();
      }
    },
    [editCode]
  );

  const handleAutorunChange = useCallback(
    (autorun: boolean) => {
      flushPendingCodeSnapshot();
      editSettings({ autorun });
      commitCurrentProjectSnapshot({
        editorSettings: { autorun },
      });
    },
    [commitCurrentProjectSnapshot, editSettings, flushPendingCodeSnapshot]
  );

  useEffect(() => {
    if (!settings.autorun || !code) {
      return;
    }

    const timeoutId = setTimeout(() => {
      evaluateSourceCode(code);
    }, AUTORUN_EVALUATION_DELAY_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [code, evaluateSourceCode, settings.autorun]);

  useEffect(() => {
    const sharedState = readProjectStateFromUrl();

    projectHistoryRef.current?.push(createCurrentProjectSnapshot());

    if (sharedState) {
      applyHistorySnapshot(sharedState);
      projectHistoryRef.current?.push(sharedState);

      window.history.replaceState(
        null,
        '',
        removeProjectStateFromUrl(window.location.href)
      );
    }

    updateProjectHistoryAvailability();
    // Import runs once on mount; the URL cleanup prevents StrictMode remounts
    // from applying the same share payload twice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copyShareUrl = useCallback(async () => {
    flushPendingCodeSnapshot();

    const shareUrl = createProjectShareUrl({
      code: code ?? '',
      parameters,
      editorSettings: {
        autorun: settings.autorun,
      },
      nestingOptions,
      selectedTargetModelId: selectedModelId,
    });

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Share URL copied');
    } catch (nextError) {
      console.error('Failed to copy share URL:', nextError);
      toast.error('Could not copy Share URL');
    }
  }, [
    code,
    flushPendingCodeSnapshot,
    nestingOptions,
    parameters,
    selectedModelId,
    settings.autorun,
  ]);

  const handleLoadDemoScene = useCallback(
    (sceneId: MvpDemoSceneId) => {
      const scene = getMvpDemoScene(sceneId);

      flushPendingCodeSnapshot();
      // Demo loads replace the whole parameter set so the pane matches the scene.
      replaceAllParameters(scene.parameters);
      openParametersPane();
      setActiveDemoSceneId(sceneId);
      editCode(scene.code);

      if (!settings.autorun) {
        evaluateSourceCode(scene.code, scene.parameters);
      }

      commitCurrentProjectSnapshot({
        code: scene.code,
        parameters: scene.parameters,
      });
    },
    [
      commitCurrentProjectSnapshot,
      editCode,
      evaluateSourceCode,
      flushPendingCodeSnapshot,
      openParametersPane,
      replaceAllParameters,
      settings.autorun,
    ]
  );

  const applyDemoNestingPreset = useCallback(
    (_sceneId: MvpDemoSceneId, presetId: MvpDemoNestingPresetId) => {
      const preset = getMvpDemoNestingPreset(presetId);

      flushPendingCodeSnapshot();
      setTrackedNestingOptions(preset.options);
      setIsDialogOpen(true);
      commitCurrentProjectSnapshot({
        nestingOptions: preset.options,
      });
    },
    [
      commitCurrentProjectSnapshot,
      flushPendingCodeSnapshot,
      setIsDialogOpen,
      setTrackedNestingOptions,
    ]
  );

  const handleSelectModel = useCallback(
    (modelId: string) => {
      flushPendingCodeSnapshot();
      selectModel(modelId);
      commitCurrentProjectSnapshot({
        selectedTargetModelId: modelId,
      });
    },
    [commitCurrentProjectSnapshot, flushPendingCodeSnapshot, selectModel]
  );

  const handleClearSelectedModel = useCallback(() => {
    flushPendingCodeSnapshot();
    clearSelectedModel();
    commitCurrentProjectSnapshot({
      selectedTargetModelId: null,
    });
  }, [
    clearSelectedModel,
    commitCurrentProjectSnapshot,
    flushPendingCodeSnapshot,
  ]);

  const evaluateCurrentProjectIfAutorun = useCallback(() => {
    const editorState = useEditorStore.getState();

    if (!editorState.settings.autorun || !editorState.code) {
      return;
    }

    evaluateSourceCode(
      editorState.code,
      useParametersStore.getState().parameters
    );
  }, [evaluateSourceCode]);

  const handleParameterValueChange = useCallback(
    (name: string, value: number) => {
      useParametersStore.getState().updateValue(name, value);
      evaluateCurrentProjectIfAutorun();
    },
    [evaluateCurrentProjectIfAutorun]
  );

  const handleParameterCommit = useCallback(() => {
    commitCurrentProjectSnapshot();
    evaluateCurrentProjectIfAutorun();
  }, [commitCurrentProjectSnapshot, evaluateCurrentProjectIfAutorun]);

  useEffect(() => {
    const handleProjectHistoryHotkey = (event: KeyboardEvent) => {
      const action = getProjectHistoryHotkeyAction(event);

      if (!action) {
        return;
      }

      event.preventDefault();

      if (action === 'undo') {
        undoProject();
        return;
      }

      redoProject();
    };

    window.addEventListener('keydown', handleProjectHistoryHotkey);

    return () => {
      window.removeEventListener('keydown', handleProjectHistoryHotkey);
    };
  }, [redoProject, undoProject]);

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
        onCodeChange={handleCodeChange}
        onAutorunChange={handleAutorunChange}
      />
      <Toolbar
        className="fixed bottom-5 left-1/2 z-30 -translate-x-1/2"
        onRunNesting={runNesting}
        onCopyShareUrl={copyShareUrl}
        onUndoProject={undoProject}
        onRedoProject={redoProject}
        onToggleDemoGuide={toggleDemoPane}
        canUndoProject={historyAvailability.canUndo}
        canRedoProject={historyAvailability.canRedo}
        isNesting={isRunning}
        isDemoGuideOpen={isDemoPaneOpen}
      />
      <NestingTargetDialog
        open={isDialogOpen}
        models={availableModels}
        initialTargetModelId={selectedModelId}
        initialOptions={nestingOptions}
        isNesting={isRunning}
        onOpenChange={setIsDialogOpen}
        onConfirm={async (targetModelId, options) => {
          flushPendingCodeSnapshot();
          setTrackedNestingOptions(options);
          selectModel(targetModelId);
          commitCurrentProjectSnapshot({
            nestingOptions: options,
            selectedTargetModelId: targetModelId,
          });
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
      {isDemoPaneOpen && (
        <MvpDemoPanel
          activeSceneId={activeDemoSceneId}
          className={cn(
            'fixed top-4 z-20 h-[calc(100vh-7rem)] w-[min(26rem,calc(100vw-2rem))]',
            isParametersPaneOpen ? 'right-4 lg:right-[22rem]' : 'right-4'
          )}
          onClose={closeDemoPane}
          onLoadScene={handleLoadDemoScene}
          onPrepareNestingPreset={applyDemoNestingPreset}
        />
      )}
      {isModelsPaneOpen && (
        <ModelsPane
          className="fixed left-4 top-4 z-10 h-[calc(100vh-2rem)] w-80"
          onExportDXF={exportDXF}
          onClose={closeModelsPane}
          onSelectModel={handleSelectModel}
          onClearSelectedModel={handleClearSelectedModel}
        />
      )}
      {isParametersPaneOpen && (
        <ParametersPane
          className="fixed right-4 top-4 z-10 h-[calc(100vh-2rem)] w-80"
          onClose={closeParametersPane}
          onParameterValueChange={handleParameterValueChange}
          onBeforeParameterCommit={flushPendingCodeSnapshot}
          onParameterCommit={handleParameterCommit}
        />
      )}
    </div>
  );
};

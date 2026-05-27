import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { IModel } from 'makerjs';
import { toast } from 'sonner';
import { EditorErrorStatus } from '@/components/editor-error-status';
import { ParametersPane } from '@/components/parameters-pane';
import {
  DEFAULT_EDITOR_CODE,
  useEditorStore,
  useParametersStore,
} from '@/store/store';
import { useModelsStore } from '@/store/models-store';
import { ModelsPane } from '@/components/models-pane';
import {
  ExportDxfDialog,
  type NestingExportContext,
} from '@/components/export-dxf-dialog';
import { Toolbar } from '@/components/toolbar';
import { usePanesStore } from '@/store/panes-store';
import { WorkbenchLayout } from '@/components/workbench-layout';
import { NestingTargetDialog } from '@/components/nesting-target-dialog';
import { NestingStatus } from '@/components/nesting-status';
import { useNestingController } from '@/lib/nesting/controller/use-nesting-controller';
import { MvpDemoPanel } from '@/components/mvp-demo-panel';
import { ProjectLibraryDialog } from '@/components/project-library-dialog';
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
import { createDxfExport, type DxfExportRequest } from '@/lib/export/dxf';
import { createSvgModelExport } from '@/lib/export/svg';
import {
  createNestingRunReport,
  type NestingRunReport,
} from '@/lib/nesting/report';
import {
  addEditorRecoverySnapshot,
  createEditorRecoverySnapshot,
  type EditorEvaluationError,
  type EditorRecoverySnapshot,
} from '@/lib/editor-recovery';
import {
  DEFAULT_EDITOR_SNIPPET_ID,
  getCadSnippet,
  getCadSnippetParameters,
  type CadSnippetId,
} from '@/lib/cad/snippets';
import {
  createLocalProjectRecord,
  deleteLocalProject,
  duplicateLocalProject,
  parseLocalProjectFile,
  readLocalProjects,
  renameLocalProject,
  serializeLocalProject,
  updateLocalProjectState,
  upsertLocalProject,
  writeLocalProjects,
  type LocalProjectRecord,
} from '@/lib/project-library/local-projects';
import { cn } from '@/lib/utils';
import {
  CAD_EVALUATION_CANCELLED_MESSAGE,
  CadEvaluationWorkerClient,
} from '@/lib/cad/worker';

const AUTORUN_EVALUATION_DELAY_MS = 180;
const CODE_HISTORY_CAPTURE_DELAY_MS = 600;

const isEditableDebugShortcutTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.closest('input, textarea, select, [contenteditable="true"]')
  );
};

const downloadTextFile = ({
  content,
  filename,
  type,
}: {
  content: string;
  filename: string;
  type: string;
}) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const toProjectFilename = (name: string) =>
  `${
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'codecad-project'
  }.codecad.json`;

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
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isProjectLibraryOpen, setIsProjectLibraryOpen] = useState(false);
  const [nestingExportContext, setNestingExportContext] =
    useState<NestingExportContext | null>(null);
  const [lastNestingReport, setLastNestingReport] =
    useState<NestingRunReport | null>(null);
  const [localProjects, setLocalProjects] = useState<LocalProjectRecord[]>(() =>
    readLocalProjects()
  );
  const [activeLocalProjectId, setActiveLocalProjectId] = useState<
    string | null
  >(null);
  const [editorError, setEditorError] = useState<EditorEvaluationError | null>(
    null
  );
  const [isRenderingCad, setIsRenderingCad] = useState(false);
  const [editorRecoverySnapshots, setEditorRecoverySnapshots] = useState<
    EditorRecoverySnapshot[]
  >([]);
  const [historyAvailability, setHistoryAvailability] = useState({
    canUndo: false,
    canRedo: false,
  });
  const modelRevisionRef = useRef(0);
  const projectHistoryRef = useRef<ProjectHistory | null>(null);
  const cadEvaluationWorkerRef = useRef<CadEvaluationWorkerClient | null>(null);
  const cadEvaluationSequenceRef = useRef(0);
  const autorunEvaluationTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
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

  if (!cadEvaluationWorkerRef.current) {
    cadEvaluationWorkerRef.current = new CadEvaluationWorkerClient();
  }

  useEffect(
    () => () => {
      codeHistorySchedulerRef.current?.cancel();
      if (autorunEvaluationTimeoutRef.current) {
        clearTimeout(autorunEvaluationTimeoutRef.current);
      }
      cadEvaluationWorkerRef.current?.dispose();
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
    openModelsPane,
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
    const handleDebugDemoShortcut = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        !event.ctrlKey ||
        !event.altKey ||
        event.shiftKey ||
        event.metaKey ||
        event.key.toLowerCase() !== 'd' ||
        isEditableDebugShortcutTarget(event.target)
      ) {
        return;
      }

      event.preventDefault();
      toggleDemoPane();
    };

    window.addEventListener('keydown', handleDebugDemoShortcut);

    return () => {
      window.removeEventListener('keydown', handleDebugDemoShortcut);
    };
  }, [toggleDemoPane]);

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

  const persistLocalProjects = useCallback((projects: LocalProjectRecord[]) => {
    setLocalProjects(projects);
    writeLocalProjects(projects);
  }, []);

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

  const clearScheduledAutorunEvaluation = useCallback(() => {
    if (!autorunEvaluationTimeoutRef.current) {
      return;
    }

    clearTimeout(autorunEvaluationTimeoutRef.current);
    autorunEvaluationTimeoutRef.current = null;
  }, []);

  const setTrackedNestingOptions = useCallback(
    (options: typeof nestingOptions) => {
      nestingOptionsRef.current = options;
      setNestingOptions(options);
    },
    [setNestingOptions]
  );

  const evaluateSourceCode = useCallback(
    async (
      sourceCode: string,
      runtimeParameters = useParametersStore.getState().parameters
    ) => {
      if (!sourceCode) {
        return false;
      }

      const worker = cadEvaluationWorkerRef.current;

      if (!worker) {
        return false;
      }

      cadEvaluationSequenceRef.current += 1;
      const evaluationSequence = cadEvaluationSequenceRef.current;
      setIsRenderingCad(true);

      try {
        const result = await worker.run({
          sourceCode,
          parameters: runtimeParameters,
        });

        if (evaluationSequence !== cadEvaluationSequenceRef.current) {
          return false;
        }

        setModel(result.model);
        update(result.modelSizes);
        setSvg(result.svgString);
        bumpModelRevision();
        setEditorError(null);
        setEditorRecoverySnapshots((snapshots) =>
          addEditorRecoverySnapshot({
            snapshots,
            snapshot: createEditorRecoverySnapshot({
              code: sourceCode,
              parameters: runtimeParameters,
            }),
          })
        );
        return true;
      } catch (nextError) {
        const nextEvaluationError =
          nextError &&
          typeof nextError === 'object' &&
          'message' in nextError &&
          typeof nextError.message === 'string'
            ? (nextError as EditorEvaluationError)
            : { message: String(nextError) };

        if (
          nextEvaluationError.message === CAD_EVALUATION_CANCELLED_MESSAGE ||
          evaluationSequence !== cadEvaluationSequenceRef.current
        ) {
          return false;
        }

        console.error('Error:', nextEvaluationError);
        setEditorError(nextEvaluationError);
        return false;
      } finally {
        if (evaluationSequence === cadEvaluationSequenceRef.current) {
          setIsRenderingCad(false);
        }
      }
    },
    [bumpModelRevision, update]
  );

  const exportDXF = () => {
    setIsExportDialogOpen(true);
  };

  const handleExportSvg = useCallback((request: DxfExportRequest) => {
    try {
      const result = createSvgModelExport(request);

      downloadTextFile({
        content: result.svg,
        filename: result.filename,
        type: 'image/svg+xml',
      });
      setIsExportDialogOpen(false);
      toast.success(
        `SVG exported (${result.validation?.selectedCount ?? 0} model${
          result.validation?.selectedCount === 1 ? '' : 's'
        })`
      );
    } catch (nextError) {
      console.error('SVG export error:', nextError);
      toast.error(
        nextError instanceof Error ? nextError.message : 'SVG export failed'
      );
    }
  }, []);

  const handleExportDxf = useCallback((request: DxfExportRequest) => {
    try {
      const result = createDxfExport(request);
      const blob = new Blob([result.dxf], {
        type: 'application/dxf',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setIsExportDialogOpen(false);
      toast.success(
        `DXF exported (${result.validation.selectedCount} model${
          result.validation.selectedCount === 1 ? '' : 's'
        })`
      );
    } catch (nextError) {
      console.error('DXF export error:', nextError);
      toast.error(
        nextError instanceof Error ? nextError.message : 'DXF export failed'
      );
    }
  }, []);

  const evalInput = useCallback(async () => {
    if (!code) {
      return;
    }

    flushPendingCodeSnapshot();
    clearScheduledAutorunEvaluation();
    const didEvaluate = await evaluateSourceCode(code);

    if (!didEvaluate) {
      toast.error('Code did not run. Showing the last valid preview.');
    }
  }, [
    clearScheduledAutorunEvaluation,
    code,
    evaluateSourceCode,
    flushPendingCodeSnapshot,
  ]);

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

  const saveCurrentProjectAs = useCallback(
    (name: string) => {
      flushPendingCodeSnapshot();
      const project = createLocalProjectRecord({
        name,
        state: createCurrentProjectSnapshot(),
      });

      persistLocalProjects(upsertLocalProject(localProjects, project));
      setActiveLocalProjectId(project.id);
      toast.success(`Saved "${project.name}"`);
    },
    [
      createCurrentProjectSnapshot,
      flushPendingCodeSnapshot,
      localProjects,
      persistLocalProjects,
    ]
  );

  const overwriteLocalProject = useCallback(
    (project: LocalProjectRecord) => {
      flushPendingCodeSnapshot();
      persistLocalProjects(
        updateLocalProjectState({
          projects: localProjects,
          projectId: project.id,
          state: createCurrentProjectSnapshot(),
        })
      );
      setActiveLocalProjectId(project.id);
      toast.success(`Saved "${project.name}"`);
    },
    [
      createCurrentProjectSnapshot,
      flushPendingCodeSnapshot,
      localProjects,
      persistLocalProjects,
    ]
  );

  const loadLocalProject = useCallback(
    (project: LocalProjectRecord) => {
      flushPendingCodeSnapshot();
      applyHistorySnapshot(project.state);
      pushProjectSnapshot(project.state);
      setActiveLocalProjectId(project.id);
      setIsProjectLibraryOpen(false);
      toast.success(`Loaded "${project.name}"`);
    },
    [applyHistorySnapshot, flushPendingCodeSnapshot, pushProjectSnapshot]
  );

  const duplicateProject = useCallback(
    (project: LocalProjectRecord) => {
      const duplicate = duplicateLocalProject({ project });

      persistLocalProjects(upsertLocalProject(localProjects, duplicate));
      toast.success(`Duplicated "${project.name}"`);
    },
    [localProjects, persistLocalProjects]
  );

  const renameProject = useCallback(
    (project: LocalProjectRecord, name: string) => {
      persistLocalProjects(
        renameLocalProject({
          projects: localProjects,
          projectId: project.id,
          name,
        })
      );
    },
    [localProjects, persistLocalProjects]
  );

  const removeProject = useCallback(
    (project: LocalProjectRecord) => {
      persistLocalProjects(deleteLocalProject(localProjects, project.id));
      if (activeLocalProjectId === project.id) {
        setActiveLocalProjectId(null);
      }
      toast.success(`Deleted "${project.name}"`);
    },
    [activeLocalProjectId, localProjects, persistLocalProjects]
  );

  const exportProjectFile = useCallback((project: LocalProjectRecord) => {
    downloadTextFile({
      content: serializeLocalProject(project),
      filename: toProjectFilename(project.name),
      type: 'application/json',
    });
  }, []);

  const importProjectFile = useCallback(
    (content: string) => {
      const parsed = parseLocalProjectFile(content);

      if (!parsed) {
        toast.error('Invalid Code CAD project file');
        return;
      }

      const hasConflict = localProjects.some(
        (project) => project.id === parsed.project.id
      );
      const project = hasConflict
        ? duplicateLocalProject({
            project: parsed.project,
            name: `${parsed.project.name} import`,
          })
        : parsed.project;

      persistLocalProjects(upsertLocalProject(localProjects, project));
      toast.success(`Imported "${project.name}"`);
    },
    [localProjects, persistLocalProjects]
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

  const evaluateCurrentProjectIfAutorun = useCallback(() => {
    const editorState = useEditorStore.getState();

    if (!editorState.settings.autorun || !editorState.code) {
      return;
    }

    void evaluateSourceCode(
      editorState.code,
      useParametersStore.getState().parameters
    );
  }, [evaluateSourceCode]);

  const scheduleCurrentProjectEvaluation = useCallback(
    (delayMs = AUTORUN_EVALUATION_DELAY_MS) => {
      clearScheduledAutorunEvaluation();

      const editorState = useEditorStore.getState();

      if (!editorState.settings.autorun || !editorState.code) {
        cadEvaluationSequenceRef.current += 1;
        cadEvaluationWorkerRef.current?.cancelRun();
        setIsRenderingCad(false);
        return;
      }

      cadEvaluationSequenceRef.current += 1;
      cadEvaluationWorkerRef.current?.cancelRun();
      setIsRenderingCad(true);

      autorunEvaluationTimeoutRef.current = setTimeout(() => {
        autorunEvaluationTimeoutRef.current = null;
        evaluateCurrentProjectIfAutorun();
      }, delayMs);
    },
    [clearScheduledAutorunEvaluation, evaluateCurrentProjectIfAutorun]
  );

  const flushCurrentProjectEvaluation = useCallback(() => {
    clearScheduledAutorunEvaluation();
    evaluateCurrentProjectIfAutorun();
  }, [clearScheduledAutorunEvaluation, evaluateCurrentProjectIfAutorun]);

  useEffect(() => {
    scheduleCurrentProjectEvaluation();
  }, [code, scheduleCurrentProjectEvaluation, settings.autorun]);

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
        void evaluateSourceCode(scene.code, scene.parameters);
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

  const handleLoadSnippet = useCallback(
    (snippetId: CadSnippetId) => {
      const snippet = getCadSnippet(snippetId);
      const snippetParameters = getCadSnippetParameters(snippetId);

      flushPendingCodeSnapshot();
      replaceAllParameters(snippetParameters);
      openParametersPane();
      setActiveDemoSceneId(null);
      editCode(snippet.code);

      if (!settings.autorun) {
        void evaluateSourceCode(snippet.code, snippetParameters);
      }

      commitCurrentProjectSnapshot({
        code: snippet.code,
        parameters: snippetParameters,
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

  const handleParameterValueChange = useCallback(
    (name: string, value: number) => {
      useParametersStore.getState().updateValue(name, value);
      scheduleCurrentProjectEvaluation();
    },
    [scheduleCurrentProjectEvaluation]
  );

  const handleParameterCommit = useCallback(() => {
    commitCurrentProjectSnapshot();
    flushCurrentProjectEvaluation();
  }, [commitCurrentProjectSnapshot, flushCurrentProjectEvaluation]);

  const restoreEditorSnapshot = useCallback(
    (snapshot: EditorRecoverySnapshot) => {
      flushPendingCodeSnapshot();
      replaceAllParameters(snapshot.parameters);
      editCode(snapshot.code);
      void evaluateSourceCode(snapshot.code, snapshot.parameters);
      commitCurrentProjectSnapshot({
        code: snapshot.code,
        parameters: snapshot.parameters,
      });
    },
    [
      commitCurrentProjectSnapshot,
      editCode,
      evaluateSourceCode,
      flushPendingCodeSnapshot,
      replaceAllParameters,
    ]
  );

  const resetDefaultScene = useCallback(() => {
    const defaultParameters = getCadSnippetParameters(
      DEFAULT_EDITOR_SNIPPET_ID
    );

    flushPendingCodeSnapshot();
    replaceAllParameters(defaultParameters);
    editCode(DEFAULT_EDITOR_CODE);
    void evaluateSourceCode(DEFAULT_EDITOR_CODE, defaultParameters);
    commitCurrentProjectSnapshot({
      code: DEFAULT_EDITOR_CODE,
      parameters: defaultParameters,
    });
  }, [
    commitCurrentProjectSnapshot,
    editCode,
    evaluateSourceCode,
    flushPendingCodeSnapshot,
    replaceAllParameters,
  ]);

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

  const runTrackedNesting = useCallback(
    async (targetModelId: string, options: typeof nestingOptions) => {
      flushPendingCodeSnapshot();
      setTrackedNestingOptions(options);
      selectModel(targetModelId);
      commitCurrentProjectSnapshot({
        nestingOptions: options,
        selectedTargetModelId: targetModelId,
      });
      const result = await runNestingForTarget(targetModelId, options);

      if (!result) {
        return;
      }

      setNestingExportContext({
        ...result,
        modelRevision: getModelRevision(),
      });
      setLastNestingReport(
        createNestingRunReport({
          targetModelId,
          options: result.options,
          packedIds: result.packedIds,
          notFitIds: result.notFitIds,
          stats: result.stats,
          modelRevision: getModelRevision(),
        })
      );
    },
    [
      commitCurrentProjectSnapshot,
      flushPendingCodeSnapshot,
      getModelRevision,
      runNestingForTarget,
      selectModel,
      setTrackedNestingOptions,
    ]
  );

  const repeatLastNestingRun = useCallback(() => {
    if (!lastNestingReport || isRunning) {
      return;
    }

    void runTrackedNesting(
      lastNestingReport.targetModelId,
      lastNestingReport.options
    );
  }, [isRunning, lastNestingReport, runTrackedNesting]);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background text-foreground">
      <WorkbenchLayout
        svgString={resolveDisplayedSvg({
          committedSvg: svg,
          previewSvg,
          isNestingRunning: isRunning,
        })}
        selectedModelId={selectedModelId}
        isRendering={isRenderingCad}
        onExecuteCode={evalInput}
        onCodeChange={handleCodeChange}
        onAutorunChange={handleAutorunChange}
        isModelsPaneOpen={isModelsPaneOpen}
        isParametersPaneOpen={isParametersPaneOpen}
        onOpenModelsPane={openModelsPane}
        onOpenParametersPane={openParametersPane}
        modelsPane={
          <ModelsPane
            className="rounded-2xl border-border/70 bg-card/95 shadow-sm"
            onClose={closeModelsPane}
            onSelectModel={handleSelectModel}
            onClearSelectedModel={handleClearSelectedModel}
          />
        }
        parametersPane={
          <ParametersPane
            className="rounded-2xl border-border/70 bg-card/95 shadow-sm"
            onClose={closeParametersPane}
            onParameterValueChange={handleParameterValueChange}
            onBeforeParameterCommit={flushPendingCodeSnapshot}
            onParameterCommit={handleParameterCommit}
          />
        }
      />
      <Toolbar
        className="fixed bottom-5 left-1/2 z-30 -translate-x-1/2"
        onRunNesting={runNesting}
        onCopyShareUrl={copyShareUrl}
        onExport={exportDXF}
        onOpenProjectLibrary={() => setIsProjectLibraryOpen(true)}
        onUndoProject={undoProject}
        onRedoProject={redoProject}
        canUndoProject={historyAvailability.canUndo}
        canRedoProject={historyAvailability.canRedo}
        canExport={model !== null || svg.trim().length > 0}
        isNesting={isRunning}
      />
      <NestingTargetDialog
        open={isDialogOpen}
        models={availableModels}
        initialTargetModelId={selectedModelId}
        initialOptions={nestingOptions}
        isNesting={isRunning}
        onOpenChange={setIsDialogOpen}
        onConfirm={runTrackedNesting}
      />
      <ExportDxfDialog
        open={isExportDialogOpen}
        model={model}
        models={availableModels}
        selectedModelId={selectedModelId}
        currentModelRevision={getModelRevision()}
        nestingExportContext={nestingExportContext}
        onOpenChange={setIsExportDialogOpen}
        onExportDxf={handleExportDxf}
        onExportSvg={handleExportSvg}
      />
      <ProjectLibraryDialog
        open={isProjectLibraryOpen}
        projects={localProjects}
        currentProjectId={activeLocalProjectId}
        onOpenChange={setIsProjectLibraryOpen}
        onSaveAs={saveCurrentProjectAs}
        onOverwrite={overwriteLocalProject}
        onLoad={loadLocalProject}
        onDuplicate={duplicateProject}
        onRename={renameProject}
        onDelete={removeProject}
        onExport={exportProjectFile}
        onImport={importProjectFile}
      />
      {isStatusVisible && (
        <NestingStatus
          className="fixed top-4 left-1/2 z-20 -translate-x-1/2"
          isRunning={isRunning}
          progress={progress}
          stats={stats}
          error={error}
          onCancel={cancelNestingRun}
          onRepeatLastRun={lastNestingReport ? repeatLastNestingRun : undefined}
          onDismiss={dismissNestingStatus}
        />
      )}
      {editorError && (
        <EditorErrorStatus
          className="fixed top-4 left-1/2 z-20 -translate-x-1/2"
          error={editorError}
          latestSnapshot={editorRecoverySnapshots[0] ?? null}
          onRestoreSnapshot={restoreEditorSnapshot}
          onResetDefaultScene={resetDefaultScene}
          onDismiss={() => setEditorError(null)}
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
          onLoadSnippet={handleLoadSnippet}
          onPrepareNestingPreset={applyDemoNestingPreset}
        />
      )}
    </div>
  );
};

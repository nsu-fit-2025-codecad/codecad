import {
  getCadSnippet,
  getCadSnippetEditorCode,
  getCadSnippetParameters,
  type CadSnippetId,
} from '@/lib/cad/snippets';
import {
  getMvpDemoNestingPreset,
  MVP_DEMO_NESTING_PRESET_IDS,
  MVP_DEMO_SCENES,
  type MvpDemoNestingPresetId,
  type MvpDemoSceneId,
} from '@/lib/demo/mvp-demo';

export interface CadContentPlugin {
  id: string;
  title: string;
  description: string;
  snippetIds: CadSnippetId[];
  demoSceneIds?: MvpDemoSceneId[];
}

export interface CadSnippetCompletionDefinition {
  label: string;
  detail: string;
  documentation: string;
  insertText: string;
  snippetId: CadSnippetId;
}

export interface CadExample {
  id: string;
  pluginId: string;
  pluginTitle: string;
  title: string;
  description: string;
  snippetId: CadSnippetId;
  sceneId?: MvpDemoSceneId;
  kind: 'snippet' | 'demo' | 'nesting';
  tags: string[];
  nestingPresetIds: MvpDemoNestingPresetId[];
}

export const CAD_CONTENT_PLUGINS: readonly CadContentPlugin[] = [
  {
    id: 'core-primitives',
    title: 'Core Primitives',
    description: 'Starter shapes and base sketch patterns.',
    snippetIds: [
      'quickStart',
      'primitiveRect',
      'primitiveCircle',
      'primitiveRing',
      'primitiveRoundRect',
      'primitiveCapsule',
      'primitiveSlot',
      'primitivePolyline',
      'primitiveTrackPath',
      'editorFlatScene',
      'defaultEditorScene',
    ],
  },
  {
    id: 'cad-transforms',
    title: 'CAD Transforms',
    description: 'Move, rotate, mirror, align, and pattern examples.',
    snippetIds: [
      'transformTranslate',
      'transformRotate',
      'transformScale',
      'transformMirror',
      'transformMoveTo',
      'transformCenterAt',
      'transformAlignTo',
      'patternArray',
      'patternGrid',
      'patternPolarArray',
    ],
  },
  {
    id: 'laser-cut-panels',
    title: 'Laser Cut Panels',
    description: 'Panel, frame, and flat-layout fabrication helpers.',
    snippetIds: [
      'helperPanel',
      'helperFlatLayout',
      'helperFrame',
      'compositionAssembly',
      'compositionSketch',
      'compositionCompileToMaker',
      'booleanUnion',
      'booleanCut',
      'booleanIntersect',
    ],
  },
  {
    id: 'mechanical-shapes',
    title: 'Mechanical Shapes',
    description: 'Decorative and mechanical helper geometry.',
    snippetIds: [
      'helperGear',
      'helperClockFace',
      'helperSpokeWheel',
      'helperFromSvgPathData',
    ],
  },
  {
    id: 'nesting-demos',
    title: 'Nesting Demos',
    description: 'Parameterized scenes for nesting, reports, and export flows.',
    snippetIds: [
      'demoMountingPlate',
      'demoBoxParts',
      'demoRailPack',
      'demoTrayInserts',
      'demoFrameInsert',
      'demoPerforatedSheet',
      'demoRoundedMix',
    ],
    demoSceneIds: MVP_DEMO_SCENES.map((scene) => scene.id),
  },
];

const completionSnippetIds: CadSnippetId[] = [
  'quickStart',
  'editorFlatScene',
  'helperPanel',
  'helperFlatLayout',
  'demoMountingPlate',
  'demoBoxParts',
  'demoRailPack',
  'demoTrayInserts',
  'demoFrameInsert',
  'demoPerforatedSheet',
  'demoRoundedMix',
  'helperGear',
  'helperClockFace',
  'primitiveTrackPath',
];

const completionDetails: Partial<
  Record<
    CadSnippetId,
    Pick<CadSnippetCompletionDefinition, 'label' | 'detail' | 'documentation'>
  >
> = {
  quickStart: {
    label: 'cad sketch',
    detail: 'Минимальный sketch',
    documentation: 'Быстрый старт с cad.sketch и одной базовой деталью.',
  },
  editorFlatScene: {
    label: 'cad scene',
    detail: 'Небольшая раскладка',
    documentation:
      'Вставляет компактную раскладку нескольких деталей через cad.flatLayout.',
  },
  helperPanel: {
    label: 'cad panel',
    detail: 'Пример панели',
    documentation: 'Вставляет панель с кромками типа tabs/notches.',
  },
  helperFlatLayout: {
    label: 'cad flat layout',
    detail: 'Раскладка деталей',
    documentation:
      'Вставляет набор согласованных панелей и раскладывает их на листе.',
  },
  demoMountingPlate: {
    label: 'cad demo mounting plate',
    detail: 'MVP scene: single part',
    documentation:
      'Inserts a compact fabrication plate with holes, a slot, and a cutout.',
  },
  demoBoxParts: {
    label: 'cad demo box parts',
    detail: 'MVP scene: flat box layout',
    documentation:
      'Inserts a simple six-part box layout with tabs, notches, and a lid handle.',
  },
  demoRailPack: {
    label: 'cad demo rail pack',
    detail: 'MVP scene: rotation matters',
    documentation:
      'Inserts a narrow-stock nesting scene with long rails that benefit from rotation.',
  },
  demoTrayInserts: {
    label: 'cad demo tray inserts',
    detail: 'MVP scene: concave parts',
    documentation:
      'Inserts a nesting scene with concave tray inserts and filler parts.',
  },
  demoFrameInsert: {
    label: 'cad demo frame insert',
    detail: 'MVP scene: part in hole',
    documentation:
      'Inserts a nesting scene where one part can fit inside another part opening.',
  },
  demoPerforatedSheet: {
    label: 'cad demo perforated sheet',
    detail: 'MVP scene: target holes',
    documentation:
      'Inserts a perforated stock sheet where target holes must stay forbidden.',
  },
  demoRoundedMix: {
    label: 'cad demo rounded mix',
    detail: 'MVP scene: curved parts',
    documentation:
      'Inserts a curved mixed-parts nesting scene in a rounded target.',
  },
  helperGear: {
    label: 'cad gear',
    detail: 'Пример шестерни',
    documentation: 'Вставляет декоративную шестерню и ставит её по центру.',
  },
  helperClockFace: {
    label: 'cad clock',
    detail: 'Пример циферблата',
    documentation:
      'Вставляет циферблат с ободом, делениями и центральным отверстием.',
  },
  primitiveTrackPath: {
    label: 'cad track',
    detail: 'Пример дорожки',
    documentation: 'Вставляет простую дорожку для лабиринтов и треков.',
  },
};

export const getCadEditorSnippetCompletions =
  (): CadSnippetCompletionDefinition[] =>
    completionSnippetIds.map((snippetId) => {
      const snippet = getCadSnippet(snippetId);
      const metadata = completionDetails[snippetId];

      return {
        label: metadata?.label ?? `cad ${snippet.title.toLowerCase()}`,
        detail: metadata?.detail ?? snippet.title,
        documentation: metadata?.documentation ?? `Insert ${snippet.title}.`,
        insertText: getCadSnippetEditorCode(snippetId),
        snippetId,
      };
    });

export const getContentPluginById = (pluginId: string) =>
  CAD_CONTENT_PLUGINS.find((plugin) => plugin.id === pluginId) ?? null;

export const getCadExamples = (): CadExample[] =>
  CAD_CONTENT_PLUGINS.flatMap((plugin) =>
    plugin.snippetIds.map((snippetId): CadExample => {
      const scene = MVP_DEMO_SCENES.find(
        (candidate) => candidate.snippetId === snippetId
      );

      return {
        id: scene?.id ?? snippetId,
        pluginId: plugin.id,
        pluginTitle: plugin.title,
        title: scene?.title ?? getCadSnippet(snippetId).title,
        description: plugin.description,
        snippetId,
        sceneId: scene?.id,
        kind:
          scene?.kind === 'nesting' ? 'nesting' : scene ? 'demo' : 'snippet',
        tags: [plugin.title, scene?.kind ?? 'snippet'].filter(Boolean),
        nestingPresetIds:
          scene?.kind === 'nesting' ? [...MVP_DEMO_NESTING_PRESET_IDS] : [],
      };
    })
  );

export const getCadExampleGroups = (query = '') => {
  const normalizedQuery = query.trim().toLowerCase();
  const examples = getCadExamples().filter((example) => {
    if (!normalizedQuery) {
      return true;
    }

    return [example.title, example.description, ...example.tags]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery);
  });

  return CAD_CONTENT_PLUGINS.map((plugin) => ({
    plugin,
    examples: examples.filter((example) => example.pluginId === plugin.id),
  })).filter((group) => group.examples.length > 0);
};

export const validateContentRegistry = () => {
  const pluginIds = new Set<string>();
  const snippetIds = new Set<string>();

  CAD_CONTENT_PLUGINS.forEach((plugin) => {
    if (pluginIds.has(plugin.id)) {
      throw new Error(`Duplicate content plugin id: ${plugin.id}`);
    }
    pluginIds.add(plugin.id);

    plugin.snippetIds.forEach((snippetId) => {
      if (snippetIds.has(snippetId)) {
        throw new Error(`Duplicate snippet id in registry: ${snippetId}`);
      }
      snippetIds.add(snippetId);
      getCadSnippet(snippetId);
    });

    plugin.demoSceneIds?.forEach((sceneId) => {
      const scene = MVP_DEMO_SCENES.find(
        (candidate) => candidate.id === sceneId
      );

      if (!scene) {
        throw new Error(`Unknown demo scene id in registry: ${sceneId}`);
      }
    });
  });
};

export { getMvpDemoNestingPreset, getCadSnippetParameters };

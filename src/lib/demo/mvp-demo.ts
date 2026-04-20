import {
  getCadSnippet,
  getCadSnippetParameters,
  type CadSnippetId,
} from '@/lib/cad/snippets';
import type { PackingOptions } from '@/lib/nesting';
import type { Parameter } from '@/store/store';

export type MvpDemoSceneId =
  | 'mountingPlate'
  | 'boxParts'
  | 'railPack'
  | 'trayInserts'
  | 'frameInsert'
  | 'perforatedSheet'
  | 'roundedMix';

export type MvpDemoSceneKind = 'dsl' | 'nesting';

export type MvpDemoNestingPresetId =
  | 'standard'
  | 'genetic'
  | 'rotationOff'
  | 'wideGap';

interface MvpDemoSceneBase {
  id: MvpDemoSceneId;
  title: string;
  snippetId: CadSnippetId;
  code: string;
  parameters: Parameter[];
  kind: MvpDemoSceneKind;
}

export interface MvpDemoDslScene extends MvpDemoSceneBase {
  kind: 'dsl';
}

export interface MvpDemoNestingScene extends MvpDemoSceneBase {
  kind: 'nesting';
  recommendedTargetModelId: string;
}

export type MvpDemoScene = MvpDemoDslScene | MvpDemoNestingScene;

export interface MvpDemoNestingPreset {
  title: string;
  options: PackingOptions;
}

const createDslScene = (
  id: MvpDemoSceneId,
  title: string,
  snippetId: CadSnippetId
): MvpDemoDslScene => ({
  id,
  title,
  snippetId,
  code: getCadSnippet(snippetId).code,
  parameters: getCadSnippetParameters(snippetId),
  kind: 'dsl',
});

const createNestingScene = (
  id: MvpDemoSceneId,
  title: string,
  snippetId: CadSnippetId,
  recommendedTargetModelId = 'target'
): MvpDemoNestingScene => ({
  id,
  title,
  snippetId,
  code: getCadSnippet(snippetId).code,
  parameters: getCadSnippetParameters(snippetId),
  kind: 'nesting',
  recommendedTargetModelId,
});

export const MVP_DEMO_SCENES: MvpDemoScene[] = [
  createDslScene('mountingPlate', 'Mounting Plate', 'demoMountingPlate'),
  createDslScene('boxParts', 'Box Parts', 'demoBoxParts'),
  createNestingScene('railPack', 'Rail Pack', 'demoRailPack'),
  createNestingScene('trayInserts', 'Tray Inserts', 'demoTrayInserts'),
  createNestingScene('frameInsert', 'Frame Insert', 'demoFrameInsert'),
  createNestingScene(
    'perforatedSheet',
    'Perforated Sheet',
    'demoPerforatedSheet'
  ),
  createNestingScene('roundedMix', 'Rounded Mix', 'demoRoundedMix'),
];

export const MVP_DEMO_NESTING_PRESET_IDS = [
  'standard',
  'genetic',
  'rotationOff',
  'wideGap',
] as const satisfies readonly MvpDemoNestingPresetId[];

export const MVP_DEMO_NESTING_PRESETS: Record<
  MvpDemoNestingPresetId,
  MvpDemoNestingPreset
> = {
  standard: {
    title: 'Standard',
    options: {
      allowRotation: true,
      rotationCount: 4,
      gap: 0,
      curveTolerance: 1,
      useGeneticSearch: false,
      populationSize: 8,
      maxGenerations: 2,
      mutationRate: 0.2,
      crossoverRate: 0.85,
      eliteCount: 2,
    },
  },
  genetic: {
    title: 'Genetic',
    options: {
      allowRotation: true,
      rotationCount: 4,
      gap: 0,
      curveTolerance: 1,
      useGeneticSearch: true,
      populationSize: 8,
      maxGenerations: 2,
      mutationRate: 0.2,
      crossoverRate: 0.85,
      eliteCount: 2,
    },
  },
  rotationOff: {
    title: 'No Rot',
    options: {
      allowRotation: false,
      rotationCount: 1,
      gap: 0,
      curveTolerance: 1,
      useGeneticSearch: false,
      populationSize: 8,
      maxGenerations: 2,
      mutationRate: 0.2,
      crossoverRate: 0.85,
      eliteCount: 2,
    },
  },
  wideGap: {
    title: 'Wide Gap',
    options: {
      allowRotation: true,
      rotationCount: 4,
      gap: 10,
      curveTolerance: 1,
      useGeneticSearch: false,
      populationSize: 8,
      maxGenerations: 2,
      mutationRate: 0.2,
      crossoverRate: 0.85,
      eliteCount: 2,
    },
  },
};

export const getMvpDemoScene = (sceneId: MvpDemoSceneId): MvpDemoScene => {
  const scene = MVP_DEMO_SCENES.find((candidate) => candidate.id === sceneId);

  if (!scene) {
    throw new Error(`Unknown MVP demo scene: ${sceneId}`);
  }

  return scene;
};

export const getMvpDemoNestingPreset = (
  presetId: MvpDemoNestingPresetId
): MvpDemoNestingPreset => {
  const preset = MVP_DEMO_NESTING_PRESETS[presetId];

  if (!preset) {
    throw new Error(`Unknown MVP demo nesting preset: ${presetId}`);
  }

  return preset;
};

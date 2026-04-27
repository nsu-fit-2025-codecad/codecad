import { z } from 'zod';
import type { PackingOptions } from '@/lib/nesting';
import { normalizePackingOptions } from '@/lib/nesting/orchestration/options';
import type { Parameter } from '@/store/store';

export const PROJECT_STATE_VERSION = 1;

export const parameterSchema = z
  .object({
    name: z.string(),
    value: z.number(),
    min: z.number().optional(),
    max: z.number().optional(),
    step: z.number().optional(),
  })
  .transform((parameter): Parameter => {
    const normalized: Parameter = {
      name: parameter.name,
      value: parameter.value,
    };

    if (parameter.min !== undefined) {
      normalized.min = parameter.min;
    }
    if (parameter.max !== undefined) {
      normalized.max = parameter.max;
    }
    if (parameter.step !== undefined) {
      normalized.step = parameter.step;
    }

    return normalized;
  });

export const packingOptionsSchema = z
  .object({
    nestingEngine: z.enum(['typescript', 'rust-wasm']).optional(),
    gap: z.number().optional(),
    allowRotation: z.boolean().optional(),
    rotationCount: z.number().optional(),
    rotations: z.array(z.number()).optional(),
    curveTolerance: z.number().optional(),
    searchStep: z.number().optional(),
    useGeneticSearch: z.boolean().optional(),
    populationSize: z.number().optional(),
    maxGenerations: z.number().optional(),
    mutationRate: z.number().optional(),
    crossoverRate: z.number().optional(),
    eliteCount: z.number().optional(),
    geneticSeed: z.number().optional(),
  })
  .transform((options): PackingOptions => normalizePackingOptions(options));

export interface ProjectStateSnapshot {
  version: typeof PROJECT_STATE_VERSION;
  code: string;
  parameters: Parameter[];
  editorSettings: {
    autorun: boolean;
  };
  nestingOptions?: PackingOptions;
  selectedTargetModelId?: string | null;
}

export interface ProjectStateInput {
  code: string;
  parameters: readonly Parameter[];
  editorSettings: {
    autorun: boolean;
  };
  nestingOptions?: PackingOptions;
  selectedTargetModelId?: string | null;
}

export const projectStateSchema = z
  .object({
    version: z.literal(PROJECT_STATE_VERSION),
    code: z.string(),
    parameters: z.array(parameterSchema),
    editorSettings: z.object({
      autorun: z.boolean(),
    }),
    nestingOptions: packingOptionsSchema.optional(),
    selectedTargetModelId: z.string().nullable().optional(),
  })
  .transform((state): ProjectStateSnapshot => {
    const normalized: ProjectStateSnapshot = {
      version: PROJECT_STATE_VERSION,
      code: state.code,
      parameters: state.parameters,
      editorSettings: {
        autorun: state.editorSettings.autorun,
      },
    };

    if (state.nestingOptions !== undefined) {
      normalized.nestingOptions = state.nestingOptions;
    }
    if ('selectedTargetModelId' in state) {
      normalized.selectedTargetModelId = state.selectedTargetModelId;
    }

    return normalized;
  });

export const projectStateInputSchema = z
  .object({
    code: z.string(),
    parameters: z.array(parameterSchema),
    editorSettings: z.object({
      autorun: z.boolean(),
    }),
    nestingOptions: packingOptionsSchema.optional(),
    selectedTargetModelId: z.string().nullable().optional(),
  })
  .transform(
    (state): ProjectStateSnapshot =>
      projectStateSchema.parse({
        version: PROJECT_STATE_VERSION,
        ...state,
      })
  );

export const createProjectStateSnapshot = (
  input: ProjectStateInput | ProjectStateSnapshot
): ProjectStateSnapshot =>
  'version' in input
    ? projectStateSchema.parse(input)
    : projectStateInputSchema.parse(input);

export const parseProjectStateSnapshot = (
  value: unknown
): ProjectStateSnapshot | null => {
  const parsed = projectStateSchema.safeParse(value);

  return parsed.success ? parsed.data : null;
};

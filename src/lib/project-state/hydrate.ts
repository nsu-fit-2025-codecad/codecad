import type { PackingOptions } from '@/lib/nesting';
import type { ProjectStateSnapshot } from '@/lib/project-state/contract';
import type { Parameter } from '@/store/store';

export interface HydrateProjectStateInput {
  state: ProjectStateSnapshot;
  replaceParameters: (parameters: readonly Parameter[]) => void;
  editCode: (code: string) => void;
  editSettings: (settings: { autorun: boolean }) => void;
  setNestingOptions: (options: PackingOptions) => void;
  evaluateSourceCode: (code: string, parameters: Parameter[]) => void;
  selectTargetModel: (modelId: string) => void;
  clearSelectedTargetModel: () => void;
}

export const hydrateProjectState = ({
  state,
  replaceParameters,
  editCode,
  editSettings,
  setNestingOptions,
  evaluateSourceCode,
  selectTargetModel,
  clearSelectedTargetModel,
}: HydrateProjectStateInput) => {
  replaceParameters(state.parameters);
  editSettings({ autorun: state.editorSettings.autorun });

  if (state.nestingOptions) {
    setNestingOptions(state.nestingOptions);
  }

  editCode(state.code);
  evaluateSourceCode(state.code, state.parameters);

  if (!Object.hasOwn(state, 'selectedTargetModelId')) {
    return;
  }

  if (state.selectedTargetModelId) {
    selectTargetModel(state.selectedTargetModelId);
    return;
  }

  clearSelectedTargetModel();
};

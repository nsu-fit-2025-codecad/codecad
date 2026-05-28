import { create } from 'zustand';
import type { ModelDiagnostics } from '@/lib/model-diagnostics';

export interface Model {
  id: string;
  width: number;
  height: number;
  area?: number;
  diagnostics?: ModelDiagnostics;
  fit?: boolean;
}

interface ModelsState {
  models: Model[];
  selectedModelId: string | null;
  update: (models: Model[]) => void;
  updateFitStatus: (packedIds: Set<string>, notFitIds: Set<string>) => void;
  selectModel: (modelId: string) => void;
  clearSelectedModel: () => void;
  hoveredModelId: string | null;
  setHoveredModelId: (id: string | null) => void;
}

export const useModelsStore = create<ModelsState>()((set) => ({
  models: [],
  selectedModelId: null,
  hoveredModelId: null,
  setHoveredModelId: (id) => set({ hoveredModelId: id }),
  update: (models) =>
    set((state) => ({
      models,
      selectedModelId: models.some(
        (model) => model.id === state.selectedModelId
      )
        ? state.selectedModelId
        : null,
    })),
  updateFitStatus: (packedIds, notFitIds) =>
    set((state) => ({
      models: state.models.map((model) => {
        if (packedIds.has(model.id)) {
          return { ...model, fit: true };
        }
        if (notFitIds.has(model.id)) {
          return { ...model, fit: false };
        }
        return model;
      }),
    })),
  selectModel: (modelId) =>
    set((state) =>
      state.models.some((model) => model.id === modelId)
        ? { selectedModelId: modelId }
        : {}
    ),
  clearSelectedModel: () => set({ selectedModelId: null }),
}));

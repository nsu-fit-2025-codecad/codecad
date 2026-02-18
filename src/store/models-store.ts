import { create } from 'zustand';

export interface Model {
  id: string;
  width: number;
  height: number;
  fit?: boolean;
}

interface ModelsState {
  models: Model[];
  update: (models: Model[]) => void;
  updateFitStatus: (packedIds: Set<string>, notFitIds: Set<string>) => void;
}

export const useModelsStore = create<ModelsState>()((set) => ({
  models: [],
  update: (models) => set((state) => ({ ...state, models: models })),
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
}));

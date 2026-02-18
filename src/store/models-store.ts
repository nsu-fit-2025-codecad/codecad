import { create } from 'zustand';
import { IModel } from "makerjs";

export interface Model {
  id: string;
  width: number;
  height: number;
  fit?: boolean;
}

interface ModelsState {
  models: Model[];
  finalModel?: IModel;
  update: (models: Model[]) => void;
  updateFitStatus: (packedIds: Set<string>, notFitIds: Set<string>) => void;
  setFinalModel: (model: IModel) => void;
}

export const useModelsStore = create<ModelsState>()((set) => ({
  models: [],
  finalModel: undefined,

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

    setFinalModel: (model) => set({ finalModel: model }),
}));

export interface Model {
  id: string;
  width: number;
  height: number;
  fit?: boolean;
  makerModel?: IModel;
}
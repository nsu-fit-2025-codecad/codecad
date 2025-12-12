import { create } from 'zustand';

export interface Parameter {
  name: string;
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

interface ParametersState {
  parameters: Parameter[];
  add: (parameter: Parameter) => void;
  edit: (name: string, updates: Partial<Parameter>) => void;
  remove: (name: string) => void;
}

export const useParametersStore = create<ParametersState>()((set) => ({
  parameters: [],
  add: (parameter) =>
    set((state) => ({ parameters: [...state.parameters, parameter] })),
  edit: (name, updates) =>
    set((state) => ({
      parameters: state.parameters.map((param) =>
        param.name === name ? { ...param, ...updates } : param
      ),
    })),
  remove: (name) =>
    set((state) => ({
      parameters: state.parameters.filter((param) => param.name !== name),
    })),
}));

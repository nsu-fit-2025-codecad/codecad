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

interface EditorSettings {
  autorun: boolean;
}

interface EditorState {
  code?: string;
  editCode: (newCode?: string) => void;
  settings: EditorSettings;
  editSettings: (updates: Partial<EditorSettings>) => void;
}

const defaultCode = `const square = new makerjs.models.Square(100);

const circle = new makerjs.models.Ring(50);
circle.origin = [150, 0];

const model = {
  models: {
    square: square,
    circle: circle
  }
};

return model;`;

export const useEditorStore = create<EditorState>()((set) => ({
  code: defaultCode,
  editCode: (newCode) => set((state) => ({ ...state, code: newCode })),
  settings: {
    autorun: false,
  },
  editSettings: (updates) =>
    set((state) => ({
      settings: { ...state.settings, ...updates },
    })),
}));

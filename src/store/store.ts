import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_EDITOR_SNIPPET_ID, getCadSnippet } from '@/lib/cad/snippets';

export interface Parameter {
  name: string;
  value: number;
  //onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

interface ParametersState {
  parameters: Parameter[];
  add: (parameter: Omit<Parameter, 'onValueChange'>) => void;
  edit: (name: string, updates: Partial<Parameter>) => void;
  remove: (name: string) => void;
  replaceAll: (parameters: readonly Parameter[]) => void;
  updateValue: (name: string, value: number) => void;
}

export const useParametersStore = create<ParametersState>()(
  persist(
    (set) => ({
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
      replaceAll: (parameters) =>
        set({
          parameters: parameters.map((parameter) => ({ ...parameter })),
        }),
      updateValue: (name, value) =>
        set((state) => ({
          parameters: state.parameters.map((param) =>
            param.name === name ? { ...param, value } : param
          ),
        })),
    }),
    {
      name: 'parameters-storage',
      partialize: (state) => ({ parameters: state.parameters }),
    }
  )
);

interface EditorSettings {
  autorun: boolean;
}

interface EditorState {
  code?: string;
  editCode: (newCode?: string) => void;
  settings: EditorSettings;
  editSettings: (updates: Partial<EditorSettings>) => void;
}

export const DEFAULT_EDITOR_CODE = getCadSnippet(
  DEFAULT_EDITOR_SNIPPET_ID
).code;

export const useEditorStore = create<EditorState>()(
  persist(
    (set) => ({
      code: DEFAULT_EDITOR_CODE,
      settings: { autorun: true },
      editCode: (newCode) => set({ code: newCode }),
      editSettings: (updates) =>
        set((state) => ({
          settings: { ...state.settings, ...updates },
        })),
    }),
    {
      name: 'editor-storage',
      partialize: (state) => ({ code: state.code, settings: state.settings }),
    }
  )
);

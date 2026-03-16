import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

export const DEFAULT_EDITOR_CODE = `const door = cad
  .panel({
    width: 120,
    height: 92,
    radius: 14,
    inset: { margin: 16, radius: 8 },
    holes: [
      { kind: 'circle', x: 18, y: 18, radius: 3 },
      { kind: 'circle', x: 102, y: 18, radius: 3 },
      { kind: 'circle', x: 18, y: 74, radius: 3 },
      { kind: 'circle', x: 102, y: 74, radius: 3 }
    ]
  })
  .onLayer('cut');

const gear = cad
  .gear({
    teeth: 14,
    outerRadius: 34,
    rootRadius: 25,
    bore: 10
  })
  .centerAt([45, 45])
  .onLayer('cut');

const clock = cad.clockFace({
  radius: 42,
  rimWidth: 8,
  tickCount: 12,
  centerHole: 6
});

const maze = cad
  .trackPath(
    [
      [0, 0],
      [60, 0],
      [60, 30],
      [25, 30],
      [25, 65],
      [85, 65]
    ],
    10
  )
  .onLayer('etch');

return cad.sketch({
  door,
  gear: gear.translate(0, 130),
  clock: clock.translate(170, 10),
  maze: maze.translate(150, 145)
});`;

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

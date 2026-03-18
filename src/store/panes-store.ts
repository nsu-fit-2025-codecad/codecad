import { create } from 'zustand';

interface PanesState {
  isModelsPaneOpen: boolean;
  isParametersPaneOpen: boolean;
  isDemoPaneOpen: boolean;
  openModelsPane: () => void;
  openParametersPane: () => void;
  openDemoPane: () => void;
  closeModelsPane: () => void;
  closeParametersPane: () => void;
  closeDemoPane: () => void;
  toggleModelsPane: () => void;
  toggleParametersPane: () => void;
  toggleDemoPane: () => void;
}

export const usePanesStore = create<PanesState>()((set) => ({
  isModelsPaneOpen: true,
  isParametersPaneOpen: true,
  isDemoPaneOpen: false,
  openModelsPane: () => set({ isModelsPaneOpen: true }),
  openParametersPane: () => set({ isParametersPaneOpen: true }),
  openDemoPane: () => set({ isDemoPaneOpen: true }),
  closeModelsPane: () => set({ isModelsPaneOpen: false }),
  closeParametersPane: () => set({ isParametersPaneOpen: false }),
  closeDemoPane: () => set({ isDemoPaneOpen: false }),
  toggleModelsPane: () =>
    set((state) => ({ isModelsPaneOpen: !state.isModelsPaneOpen })),
  toggleParametersPane: () =>
    set((state) => ({ isParametersPaneOpen: !state.isParametersPaneOpen })),
  toggleDemoPane: () =>
    set((state) => ({ isDemoPaneOpen: !state.isDemoPaneOpen })),
}));

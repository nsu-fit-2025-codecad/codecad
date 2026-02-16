import { create } from 'zustand';

interface PanesState {
  isModelsPaneOpen: boolean;
  isParametersPaneOpen: boolean;
  openModelsPane: () => void;
  openParametersPane: () => void;
  closeModelsPane: () => void;
  closeParametersPane: () => void;
  toggleModelsPane: () => void;
  toggleParametersPane: () => void;
}

export const usePanesStore = create<PanesState>()((set) => ({
  isModelsPaneOpen: true,
  isParametersPaneOpen: true,
  openModelsPane: () => set({ isModelsPaneOpen: true }),
  openParametersPane: () => set({ isParametersPaneOpen: true }),
  closeModelsPane: () => set({ isModelsPaneOpen: false }),
  closeParametersPane: () => set({ isParametersPaneOpen: false }),
  toggleModelsPane: () =>
    set((state) => ({ isModelsPaneOpen: !state.isModelsPaneOpen })),
  toggleParametersPane: () =>
    set((state) => ({ isParametersPaneOpen: !state.isParametersPaneOpen })),
}));

import { create } from 'zustand';

export interface GeometryObject {
  id: string;
  type: string;
  originalModel: any;
  bbox?: any;
  position?: { x: number; y: number; rotation: number };
}

export interface NestingState {
  selectedObjects: GeometryObject[];
  containerArea: { x: number; y: number; width: number; height: number } | null;
  isNestingInProgress: boolean;
  nestingProgress: number;
  selectionMode: 'object' | 'area';
  
  // Actions
  selectObject: (object: GeometryObject) => void;
  deselectObject: (objectId: string) => void;
  selectAll: (objects: GeometryObject[]) => void;
  clearSelection: () => void;
  isSelected: (objectId: string) => boolean;
  setContainerArea: (area: { x: number; y: number; width: number; height: number } | null) => void;
  setSelectionMode: (mode: 'object' | 'area') => void;
  startNesting: () => void;
  updateProgress: (progress: number) => void;
  completeNesting: () => void;
}

export const useNestingStore = create<NestingState>((set, get) => ({
  selectedObjects: [],
  containerArea: null,
  isNestingInProgress: false,
  nestingProgress: 0,
  selectionMode: 'object',
  
  selectObject: (object) =>
    set((state) => ({
      selectedObjects: state.selectedObjects.some(obj => obj.id === object.id)
        ? state.selectedObjects
        : [...state.selectedObjects, object]
    })),
    
  deselectObject: (objectId) =>
    set((state) => ({
      selectedObjects: state.selectedObjects.filter(obj => obj.id !== objectId)
    })),
    
  selectAll: (objects) =>
    set({ selectedObjects: objects }),
    
  clearSelection: () =>
    set({ selectedObjects: [] }),
    
  isSelected: (objectId) => {
    return get().selectedObjects.some(obj => obj.id === objectId);
  },
    
  setContainerArea: (area) =>
    set({ containerArea: area }),
    
  setSelectionMode: (mode) =>
    set({ selectionMode: mode }),
    
  startNesting: () =>
    set({ isNestingInProgress: true, nestingProgress: 0 }),
    
  updateProgress: (progress) =>
    set({ nestingProgress: progress }),
    
  completeNesting: () =>
    set({ isNestingInProgress: false, nestingProgress: 100 }),
}));
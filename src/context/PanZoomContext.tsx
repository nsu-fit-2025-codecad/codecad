import React, { createContext, useContext, ReactNode } from 'react';
import { usePanZoom, PanZoomState } from '../hooks/usePanZoom';

interface PanZoomContextType {
  transform: string;
  state: PanZoomState;
  resetTransform: () => void;
  setTransform: (x: number, y: number, scale: number) => void;
}

const PanZoomContext = createContext<PanZoomContextType | undefined>(undefined);

interface PanZoomProviderProps {
  children: ReactNode;
  initialState?: Partial<PanZoomState>;
}

export const PanZoomProvider: React.FC<PanZoomProviderProps> = ({
  children,
  initialState,
}) => {
  const panZoom = usePanZoom(initialState);

  return (
    <PanZoomContext.Provider value={panZoom}>
      {children}
    </PanZoomContext.Provider>
  );
};

export const usePanZoomContext = (): PanZoomContextType => {
  const context = useContext(PanZoomContext);
  if (!context) {
    throw new Error('usePanZoomContext must be used within PanZoomProvider');
  }
  return context;
};
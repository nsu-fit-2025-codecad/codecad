import { createContext, useContext, type ReactNode } from 'react';
import { usePanZoom, type UsePanZoomReturn } from '@/hooks/usePanZoom';

const PanZoomContext = createContext<UsePanZoomReturn | undefined>(undefined);

interface PanZoomProviderProps {
  children: ReactNode;
}

export const PanZoomProvider = ({ children }: PanZoomProviderProps) => {
  const panZoom = usePanZoom();

  return (
    <PanZoomContext.Provider value={panZoom}>
      {children}
    </PanZoomContext.Provider>
  );
};

export const usePanZoomContext = (): UsePanZoomReturn => {
  const context = useContext(PanZoomContext);

  if (!context) {
    throw new Error('usePanZoomContext must be used within PanZoomProvider');
  }

  return context;
};

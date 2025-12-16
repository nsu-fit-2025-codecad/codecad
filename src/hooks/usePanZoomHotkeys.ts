import { useEffect } from 'react';

interface UsePanZoomHotkeysProps {
  resetTransform: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

export const usePanZoomHotkeys = ({
  resetTransform,
  zoomIn,
  zoomOut,
}: UsePanZoomHotkeysProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + 0 - сброс трансформации
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        resetTransform();
      }
      
      // Ctrl + '+' или Ctrl + колесо вверх - увеличение
      if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        zoomIn();
      }
      
      // Ctrl + '-' - уменьшение
      if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        zoomOut();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [resetTransform, zoomIn, zoomOut]);
};
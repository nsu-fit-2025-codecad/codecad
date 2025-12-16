import { useState, useCallback, useRef } from 'react';

interface PanZoomState {
  x: number;
  y: number;
  scale: number;
  isPanning: boolean;
}

interface UsePanZoomReturn {
  transform: {
    x: number;
    y: number;
    scale: number;
  };
  isPanning: boolean;
  startPan: (e: React.MouseEvent) => void;
  pan: (e: React.MouseEvent) => void;
  endPan: () => void;
  handleWheel: (e: React.WheelEvent) => void;
  resetTransform: () => void;
  getContainerStyle: () => React.CSSProperties;
  getSvgStyle: () => React.CSSProperties;
}

export const usePanZoom = (): UsePanZoomReturn => {
  const [state, setState] = useState({
    x: 0,
    y: 0,
    scale: 1,
    isPanning: false,
  });

  const startPointRef = useRef({ x: 0, y: 0 });
  const startTransformRef = useRef({ x: 0, y: 0 });

  const startPan = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    setState(prev => ({
      ...prev,
      isPanning: true,
    }));
    startPointRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    startTransformRef.current = {
      x: state.x,
      y: state.y,
    };
  }, [state.x, state.y]);

  const pan = useCallback((e: React.MouseEvent) => {
    if (!state.isPanning) return;
    e.preventDefault();
    
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const dx = mouseX - startPointRef.current.x;
    const dy = mouseY - startPointRef.current.y;
    
    setState(prev => ({
      ...prev,
      x: startTransformRef.current.x + dx,
      y: startTransformRef.current.y + dy,
    }));
  }, [state.isPanning]);

  const endPan = useCallback(() => {
    setState(prev => ({
      ...prev,
      isPanning: false,
    }));
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    const zoomIntensity = 0.001;
    const delta = e.deltaY * zoomIntensity;
    const newScale = Math.max(0.1, Math.min(5, state.scale - delta));
    
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Масштабирование относительно курсора мыши
    const scaleRatio = newScale / state.scale;
    const newX = mouseX - (mouseX - state.x) * scaleRatio;
    const newY = mouseY - (mouseY - state.y) * scaleRatio;
    
    setState(prev => ({
      ...prev,
      x: newX,
      y: newY,
      scale: newScale,
    }));
  }, [state.scale, state.x, state.y]);

  const resetTransform = useCallback(() => {
    setState({
      x: 0,
      y: 0,
      scale: 1,
      isPanning: false,
    });
  }, []);

  const getContainerStyle = useCallback((): React.CSSProperties => ({
    cursor: state.isPanning ? 'grabbing' : 'grab',
    overflow: 'hidden',
    userSelect: 'none',
    position: 'relative',
    width: '100%',
    height: '100%',
  }), [state.isPanning]);

  const getSvgStyle = useCallback((): React.CSSProperties => ({
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    transform: `translate(${state.x}px, ${state.y}px) scale(${state.scale})`,
    transformOrigin: '0 0',
    pointerEvents: 'none',
  }), [state.x, state.y, state.scale]);

  return {
    transform: {
      x: state.x,
      y: state.y,
      scale: state.scale,
    },
    isPanning: state.isPanning,
    startPan,
    pan,
    endPan,
    handleWheel,
    resetTransform,
    getContainerStyle,
    getSvgStyle,
  };
};
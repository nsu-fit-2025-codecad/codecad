import React, { useRef } from 'react';
import { usePanZoom } from '@/hooks/usePanZoom';

interface VisualizationAreaProps {
  svgString: string;
}

export const VisualizationArea = ({ svgString }: VisualizationAreaProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    getContainerStyle,
    getSvgStyle,
    startPan,
    pan,
    endPan,
    handleWheel,
    resetTransform,
    transform,
  } = usePanZoom();

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      startPan(e);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    pan(e);
  };

  const handleDoubleClick = () => {
    resetTransform();
  };

  return (
    <div className="relative w-full h-full">
      <div
        ref={containerRef}
        className="relative w-full h-full"
        style={getContainerStyle()}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={endPan}
        onMouseLeave={endPan}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
      >
        <div
          dangerouslySetInnerHTML={{ __html: svgString }}
          style={getSvgStyle()}
        />
      </div>

      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-xs bg-black/70 text-white px-2 py-1 rounded">
        X: {Math.round(transform.x)} Y: {Math.round(transform.y)} Zoom:{' '}
        {Math.round(transform.scale * 100)}%
      </div>
    </div>
  );
};

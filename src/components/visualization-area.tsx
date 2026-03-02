import React, { useMemo, useRef } from 'react';
import { usePanZoom } from '@/hooks/usePanZoom';
import { highlightSelectedModelInSvg } from '@/lib/svg-highlight';

interface VisualizationAreaProps {
  svgString: string;
  selectedModelId: string | null;
}

export const VisualizationArea = ({
  svgString,
  selectedModelId,
}: VisualizationAreaProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const highlightedSvg = useMemo(
    () => highlightSelectedModelInSvg(svgString, selectedModelId),
    [selectedModelId, svgString]
  );

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
    <div className="relative h-full w-full bg-background">
      <div
        ref={containerRef}
        className="relative h-full w-full"
        style={getContainerStyle()}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={endPan}
        onMouseLeave={endPan}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
      >
        <div
          dangerouslySetInnerHTML={{ __html: highlightedSvg }}
          style={getSvgStyle()}
        />
      </div>

      <div className="absolute top-4 left-1/2 z-10 -translate-x-1/2 rounded border bg-card/90 px-2 py-1 text-xs text-card-foreground shadow-sm backdrop-blur">
        X: {Math.round(transform.x)} Y: {Math.round(transform.y)} Zoom:{' '}
        {Math.round(transform.scale * 100)}%
      </div>
    </div>
  );
};

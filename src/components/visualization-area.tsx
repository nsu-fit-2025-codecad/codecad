import { CoordinateGrid } from '@/components/coordinate-grid';
import React, { useRef, useState } from 'react';
import { usePanZoom } from '@/hooks/usePanZoom';

interface VisualizationAreaProps {
  svgString: string;
}

export const VisualizationArea = ({ svgString }: VisualizationAreaProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showControls, setShowControls] = useState(true);
  
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
    if (e.button === 0) { // Левая кнопка мыши
      startPan(e);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    pan(e);
  };

  const handleDoubleClick = () => {
    resetTransform();
  };

  // Функция для динамического обновления сетки в зависимости от масштаба
  const getGridPatternSize = () => {
    // Базовый размер сетки 20px, масштабируем его с учетом зума
    const baseSize = 20;
    return Math.max(5, baseSize / transform.scale);
  };

  return (
    <div className="relative w-full h-full border border-gray-300 rounded-lg bg-white">
      {/* Основной контейнер */}
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
        {/* Сетка координат - теперь внутри того же контейнера */}
        <div style={getSvgStyle()}>
          <CoordinateGrid 
            patternSize={getGridPatternSize()}
            opacity={0.5 + 0.5 / transform.scale} // Динамическая прозрачность
          />
        </div>

        {/* SVG модель */}
        <div
          dangerouslySetInnerHTML={{ __html: svgString }}
          style={getSvgStyle()}
        />
      </div>

      {/* Панель управления (опционально) */}
      {showControls && (
        <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-white/90 backdrop-blur-sm p-2 rounded-lg shadow-lg border">
          <button
            onClick={() => {
              // Увеличение
              const event = new WheelEvent('wheel', { deltaY: -100 });
              containerRef.current?.dispatchEvent(event);
            }}
            className="p-1.5 hover:bg-gray-100 rounded"
            title="Увеличить (Ctrl + колесо вверх)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
          
          <div className="text-sm font-mono min-w-[60px] text-center">
            {Math.round(transform.scale * 100)}%
          </div>
          
          <button
            onClick={() => {
              // Уменьшение
              const event = new WheelEvent('wheel', { deltaY: 100 });
              containerRef.current?.dispatchEvent(event);
            }}
            className="p-1.5 hover:bg-gray-100 rounded"
            title="Уменьшить (Ctrl + колесо вниз)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          
          <div className="h-4 w-px bg-gray-300 mx-1" />
          
          <button
            onClick={resetTransform}
            className="p-1.5 hover:bg-gray-100 rounded text-sm"
            title="Сбросить вид (двойной клик)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          
          <button
            onClick={() => setShowControls(!showControls)}
            className="p-1.5 hover:bg-gray-100 rounded text-sm ml-1"
            title={showControls ? "Скрыть управление" : "Показать управление"}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showControls ? "M6 18L18 6M6 6l12 12" : "M4 8h16M4 16h16"} />
            </svg>
          </button>
        </div>
      )}

      {!showControls && (
        <button
          onClick={() => setShowControls(true)}
          className="absolute bottom-2 right-2 p-1.5 bg-white/80 hover:bg-white rounded shadow border"
          title="Показать управление"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        </button>
      )}

      {/* Индикатор состояния (только при перемещении) */}
      {transform.x !== 0 || transform.y !== 0 || transform.scale !== 1 ? (
        <div className="absolute top-2 left-2 text-xs bg-black/70 text-white px-2 py-1 rounded">
          X: {Math.round(transform.x)} Y: {Math.round(transform.y)} Zoom: {Math.round(transform.scale * 100)}%
        </div>
      ) : null}
    </div>
  );
};
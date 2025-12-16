import React from 'react';

interface CoordinateGridProps {
  patternSize?: number;
  opacity?: number;
}

export const CoordinateGrid = ({ 
  patternSize = 20, 
  opacity = 1 
}: CoordinateGridProps) => {
  // Динамически генерируем паттерн сетки
  const gridPattern = React.useMemo(() => {
    const size = Math.max(1, patternSize); // Минимальный размер 1px
    
    return (
      <defs>
        <pattern
          id="grid-pattern"
          x="0"
          y="0"
          width={size}
          height={size}
          patternUnits="userSpaceOnUse"
        >
          {/* Вертикальные линии */}
          <line
            x1={size}
            y1="0"
            x2={size}
            y2={size}
            stroke="#3B82F6"
            strokeOpacity={opacity * 0.4}
            strokeWidth="0.5"
          />
          {/* Горизонтальные линии */}
          <line
            x1="0"
            y1={size}
            x2={size}
            y2={size}
            stroke="#3B82F6"
            strokeOpacity={opacity * 0.4}
            strokeWidth="0.5"
          />
        </pattern>
      </defs>
    );
  }, [patternSize, opacity]);

  return (
    <svg 
      className="w-full h-full"
      style={{ pointerEvents: 'none' }}
    >
      {gridPattern}
      <rect 
        fill="url(#grid-pattern)" 
        width="100%" 
        height="100%" 
        x="0" 
        y="0" 
      />
      
      {/* Главные оси координат (более заметные) */}
      <line
        x1="0"
        y1="0"
        x2="0"
        y2="100%"
        stroke="#3B82F6"
        strokeOpacity={opacity * 0.8}
        strokeWidth="1.5"
      />
      <line
        x1="0"
        y1="0"
        x2="100%"
        y2="0"
        stroke="#3B82F6"
        strokeOpacity={opacity * 0.8}
        strokeWidth="1.5"
      />
    </svg>
  );
};
import React, { useRef, useState, useEffect } from 'react';

interface VisualizationAreaProps {
  svgString: string;
  onObjectSelect?: (objectId: string) => void;
  onAreaSelect?: (area: { x: number; y: number; width: number; height: number }) => void;
  selectedObjectIds?: string[];
  containerArea?: { x: number; y: number; width: number; height: number } | null;
}

export const VisualizationArea: React.FC<VisualizationAreaProps> = ({
  svgString,
  onObjectSelect,
  onAreaSelect,
  selectedObjectIds = [],
  containerArea
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const [isSelectingArea, setIsSelectingArea] = useState(false);
  const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 });
  const [selectionEnd, setSelectionEnd] = useState({ x: 0, y: 0 });

  // Обработчики для выделения области
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!onAreaSelect || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsSelectingArea(true);
    setSelectionStart({ x, y });
    setSelectionEnd({ x, y });
    e.stopPropagation();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSelectingArea || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setSelectionEnd({ x, y });
    e.stopPropagation();
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isSelectingArea || !onAreaSelect) return;
    
    setIsSelectingArea(false);
    
    const width = Math.abs(selectionEnd.x - selectionStart.x);
    const height = Math.abs(selectionEnd.y - selectionStart.y);
    
    if (width > 10 && height > 10) {
      const x = Math.min(selectionStart.x, selectionEnd.x);
      const y = Math.min(selectionStart.y, selectionEnd.y);
      
      onAreaSelect({ x, y, width, height });
    }
    
    e.stopPropagation();
  };

  // Обработка кликов по SVG элементам
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!onObjectSelect) return;
      
      console.log('Клик в SVG области');
      const target = e.target as HTMLElement;
      
      // Проверяем, есть ли data-object-id у элемента или его родителей
      let currentElement: Element | null = target;
      while (currentElement && currentElement !== svgContainerRef.current) {
        const objectId = currentElement.getAttribute('data-object-id');
        if (objectId) {
          console.log('Выбран объект:', objectId);
          onObjectSelect(objectId);
          e.stopPropagation();
          return;
        }
        currentElement = currentElement.parentElement;
      }
    };

    const svgContainer = svgContainerRef.current;
    if (svgContainer && onObjectSelect) {
      svgContainer.addEventListener('click', handleClick);
      return () => svgContainer.removeEventListener('click', handleClick);
    }
  }, [onObjectSelect]);

  // Обрабатываем SVG строку для добавления data-атрибутов
  const processedSvg = React.useMemo(() => {
    if (!svgString) return '';
    
    console.log('Обработка SVG строки');
    
    // Более агрессивная обработка: добавляем data-атрибуты ко всем элементам
    let result = svgString;
    
    // Добавляем data-атрибуты к группам <g>
    let gIndex = 0;
    result = result.replace(/<g([^>]*)>/gi, (match, attributes) => {
      const id = `obj-${gIndex++}`;
      return `<g data-object-id="${id}" ${attributes || ''} style="cursor: pointer;">`;
    });
    
    // Если групп не было, добавляем к paths
    if (gIndex === 0) {
      let pathIndex = 0;
      result = result.replace(/<path([^>]*)>/gi, (match, attributes) => {
        const id = `path-${pathIndex++}`;
        return `<path data-object-id="${id}" ${attributes || ''} style="cursor: pointer;">`;
      });
    }
    
    console.log('Добавлено объектов:', gIndex);
    return result;
  }, [svgString]);

  // Для отладки
  useEffect(() => {
    console.log('SVG обновлен, длина:', svgString?.length);
    console.log('Выбранные объекты:', selectedObjectIds);
  }, [svgString, selectedObjectIds]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-gray-50 overflow-auto relative"
      onMouseDown={onAreaSelect ? handleMouseDown : undefined}
      onMouseMove={isSelectingArea ? handleMouseMove : undefined}
      onMouseUp={isSelectingArea ? handleMouseUp : undefined}
      style={{ cursor: onAreaSelect ? 'crosshair' : 'default' }}
    >
      {/* SVG чертеж */}
      {processedSvg && (
        <div 
          ref={svgContainerRef}
          className="absolute inset-0"
          dangerouslySetInnerHTML={{ __html: processedSvg }}
          onClick={(e) => {
            // Обработка кликов вручную
            if (!onObjectSelect) return;
            e.stopPropagation();
          }}
        />
      )}
      
      {/* Прямоугольник выделения области */}
      {isSelectingArea && (
        <div
          className="absolute border-2 border-blue-500 bg-blue-100 bg-opacity-30 pointer-events-none z-10"
          style={{
            left: Math.min(selectionStart.x, selectionEnd.x),
            top: Math.min(selectionStart.y, selectionEnd.y),
            width: Math.abs(selectionEnd.x - selectionStart.x),
            height: Math.abs(selectionEnd.y - selectionStart.y),
          }}
        />
      )}
      
      {/* Выделенная область укладки */}
      {containerArea && !isSelectingArea && (
        <div
          className="absolute border-2 border-red-500 border-dashed bg-red-50 bg-opacity-20 pointer-events-none z-10"
          style={{
            left: containerArea.x,
            top: containerArea.y,
            width: containerArea.width,
            height: containerArea.height,
          }}
        />
      )}
      
      {/* Отладочная информация */}
      {selectedObjectIds.length > 0 && (
        <div className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded text-sm z-20">
          Выбрано: {selectedObjectIds.length}
        </div>
      )}
      
      {/* Стили для подсветки выбранных объектов */}
      <style>
        {`
          [data-object-id] {
            transition: stroke 0.2s;
            cursor: pointer !important;
          }
          
          [data-object-id]:hover {
            opacity: 0.8;
          }
          
          ${selectedObjectIds.map(id => 
            `[data-object-id="${id}"] { 
              stroke: #3b82f6 !important; 
              stroke-width: 3px !important;
              filter: drop-shadow(0 0 3px rgba(59, 130, 246, 0.7));
            }`
          ).join('\n')}
        `}
      </style>
    </div>
  );
};
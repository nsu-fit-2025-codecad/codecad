import React, { useCallback, useEffect, useState } from 'react';
import makerjs from 'makerjs';
import { ParametersPane } from '@/components/parameters-pane';
import { useEditorStore, useParametersStore } from '@/store/store';
import { CodeEditor } from '@/components/code-editor';
import { VisualizationArea } from '@/components/visualization-area';
import { NestingManager } from '@/components/nesting-manager';

// Тип для геометрического объекта
interface GeometryObject {
  id: string;
  model: any; // Модель Maker.js
  svgElement?: string; // SVG представление
}

export const HomePage = () => {
  const [svg, setSvg] = useState<string>('');
  const [objects, setObjects] = useState<GeometryObject[]>([]);
  const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([]);
  const [containerArea, setContainerArea] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const { parameters } = useParametersStore();
  const { code, settings } = useEditorStore();

  const evalInput = useCallback(() => {
    if (!code) {
      setSvg('');
      setObjects([]);
      setSelectedObjectIds([]);
      return;
    }
    
    try {
      const createModel = new Function(
        'makerjs',
        ...parameters.map((p) => p.name),
        `return (function() {
          ${code}
        })();`
      );

      const model = createModel(makerjs, ...parameters.map((p) => p.value));
      const svgString = makerjs.exporter.toSVG(model);
      
      // Создаем геометрические объекты из модели
      const geometryObjects: GeometryObject[] = [];
      
      if (model) {
        // Если модель содержит подмодели
        if (model.models && Object.keys(model.models).length > 0) {
          Object.entries(model.models).forEach(([key, subModel], index) => {
            geometryObjects.push({
              id: `obj-${index}`,
              model: subModel
            });
          });
        } else {
          // Одна модель
          geometryObjects.push({
            id: 'obj-0',
            model: model
          });
        }
      }
      
      setObjects(geometryObjects);
      setSvg(svgString);
      setSelectedObjectIds([]); // Сбрасываем выделение при новом коде
      
    } catch (error) {
      console.error('Ошибка выполнения кода:', error);
      setSvg('');
      setObjects([]);
    }
  }, [code, parameters]);

  // Обработчик завершения укладки
  const handleNestingComplete = useCallback((placedObjects: any[]) => {
    if (placedObjects.length === 0) return;
    
    try {
      // Создаем новую объединенную модель
      const newModel = { models: {} };
      
      placedObjects.forEach((obj, index) => {
        if (obj.model) {
          // Клонируем модель
          const clonedModel = makerjs.model.clone(obj.model);
          
          // Применяем трансформации
          if (obj.position) {
            // Вращение
            if (obj.position.rotation && obj.position.rotation !== 0) {
              makerjs.model.rotate(clonedModel, obj.position.rotation);
            }
            // Перемещение
            makerjs.model.move(clonedModel, [obj.position.x || 0, obj.position.y || 0]);
          }
          
          // Добавляем в общую модель
          (newModel as any).models[`nest_${index}`] = clonedModel;
        }
      });
      
      // Генерируем SVG
      const svgString = makerjs.exporter.toSVG(newModel as any);
      setSvg(svgString);
      
      console.log('Укладка применена, размещено объектов:', placedObjects.length);
      
    } catch (error) {
      console.error('Ошибка применения укладки:', error);
      alert('Ошибка при применении результата укладки');
    }
  }, []);

  // Обработчик выбора объекта
  const handleObjectSelect = useCallback((objectId: string) => {
    setSelectedObjectIds(prev => {
      if (prev.includes(objectId)) {
        return prev.filter(id => id !== objectId);
      } else {
        return [...prev, objectId];
      }
    });
  }, []);

  // Обработчик выделения области
  const handleAreaSelect = useCallback((area: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => {
    setContainerArea(area);
  }, []);

  // Автозапуск при изменении кода
  useEffect(() => {
    if (!settings.autorun) return;
    evalInput();
  }, [evalInput, settings.autorun]);

  // Получаем выбранные объекты
  const selectedObjects = objects.filter(obj => 
    selectedObjectIds.includes(obj.id)
  );

  return (
    <div className="flex h-screen w-screen bg-gray-100">
      {/* Левая панель - укладка */}
      <div className="w-80 border-r border-gray-300 bg-white p-4 overflow-auto">
        <NestingManager
          selectedObjects={selectedObjects}
          containerArea={containerArea}
          onNestingComplete={handleNestingComplete}
        />
        
        <div className="mt-6 text-sm text-gray-600">
          <h4 className="font-semibold mb-2">Статус:</h4>
          <p>Всего объектов: {objects.length}</p>
          <p>Выбрано: {selectedObjects.length}</p>
          {containerArea && (
            <p>Область укладки: {Math.round(containerArea.width)}×{Math.round(containerArea.height)}</p>
          )}
        </div>
      </div>
      
      {/* Центральная область - визуализация */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 relative">
          <VisualizationArea
            svgString={svg}
            onObjectSelect={handleObjectSelect}
            onAreaSelect={handleAreaSelect}
            selectedObjectIds={selectedObjectIds}
            containerArea={containerArea}
          />
        </div>
      </div>
      
      {/* Правая панель - параметры */}
      <div className="w-80 border-l border-gray-300">
        <ParametersPane
          onParametersEdit={() => {}}
          parameters={parameters}
        />
      </div>
      
      {/* Редактор кода (внизу) */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
        <CodeEditor
          className="w-96"
          onExecuteCode={evalInput}
        />
      </div>

      <div className="absolute top-4 left-4 flex gap-2 z-20">
        <button
          onClick={() => {
            if (objects.length > 0) {
              const newSelection = objects.slice(0, 1).map(obj => obj.id);
              setSelectedObjectIds(newSelection);
              alert(`Выбран объект: ${newSelection[0]}`);
            }
          }}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
        >
          Выбрать первый объект
        </button>
        
        <button
          onClick={() => {
            console.log('Объекты:', objects);
            console.log('SVG длина:', svg?.length);
            alert(`Всего объектов: ${objects.length}`);
          }}
          className="px-3 py-1 bg-gray-500 text-white rounded text-sm"
        >
          Отладка
        </button>
      </div>
    </div>
  );
};
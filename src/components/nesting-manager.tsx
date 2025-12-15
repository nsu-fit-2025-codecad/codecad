import React, { useState } from 'react';
import { Button } from './ui/button';
import { runSvgNest } from '@/utils/svg-nest-wrapper';

// Типы для укладки
interface Point {
  x: number;
  y: number;
}

interface Placement {
  x: number;
  y: number;
  rotation: number;
}

interface NestConfig {
  curveTolerance?: number;
  spacing?: number;
  rotations?: number;
  populationSize?: number;
  mutationRate?: number;
  useHoles?: boolean;
}

interface GeometryObject {
  id: string;
  model: any;
}

interface NestingManagerProps {
  selectedObjects: GeometryObject[];
  containerArea: { x: number; y: number; width: number; height: number } | null;
  onNestingComplete: (placedObjects: any[]) => void;
}

export const NestingManager: React.FC<NestingManagerProps> = ({
  selectedObjects,
  containerArea,
  onNestingComplete
}) => {
  const [isNesting, setIsNesting] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleRunNesting = async () => {
    if (selectedObjects.length === 0) {
      alert('Выберите объекты для укладки');
      return;
    }

    if (!containerArea) {
      alert('Выделите область для укладки');
      return;
    }

    setIsNesting(true);
    setProgress(0);

    try {
      // Простая конвертация объектов в полигоны (заглушка)
      const polygons: Point[][] = selectedObjects.map((obj, index) => {
        // Временная заглушка - создаем простой квадрат 20x20
        return [
          { x: 0, y: 0 },
          { x: 20, y: 0 },
          { x: 20, y: 20 },
          { x: 0, y: 20 }
        ];
      });

      // Контейнер (область укладки)
      const containerPolygon: Point[] = [
        { x: 0, y: 0 },
        { x: containerArea.width, y: 0 },
        { x: containerArea.width, y: containerArea.height },
        { x: 0, y: containerArea.height }
      ];

      // Конфигурация
      const config: NestConfig = {
        curveTolerance: 0.3,
        spacing: 2,
        rotations: 4,
        populationSize: 10,
        mutationRate: 0.3,
        useHoles: false,
      };

      // Запуск укладки
      const placements: Placement[] = await runSvgNest(
        polygons,
        [containerPolygon],
        config,
        (progress: number) => setProgress(Math.round(progress))
      );

      // Создаем объекты с новыми позициями
      const placedObjects = selectedObjects.map((obj, index) => ({
        ...obj,
        position: {
          x: (placements[index]?.x || 0) + containerArea.x,
          y: (placements[index]?.y || 0) + containerArea.y,
          rotation: placements[index]?.rotation || 0
        }
      }));

      onNestingComplete(placedObjects);
      alert(`Укладка завершена! Размещено ${placedObjects.length} объектов`);

    } catch (error: any) {
      console.error('Ошибка при укладке:', error);
      alert(`Ошибка при укладке: ${error.message || 'Неизвестная ошибка'}`);
    } finally {
      setIsNesting(false);
      setProgress(0);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-white shadow w-80">
      <h3 className="text-lg font-semibold mb-4">Укладка деталей</h3>
      
      <div className="space-y-4">
        <div className="text-sm text-gray-600">
          <p>Выбрано объектов: {selectedObjects.length}</p>
          {containerArea && (
            <p>Область: {containerArea.width.toFixed(0)} × {containerArea.height.toFixed(0)}</p>
          )}
        </div>

        <Button
          onClick={handleRunNesting}
          disabled={isNesting || selectedObjects.length === 0 || !containerArea}
          className="w-full"
        >
          {isNesting ? `Укладка... ${progress}%` : 'Запустить укладку'}
        </Button>

        {isNesting && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <div className="text-xs text-gray-500">
          <p>Для укладки:</p>
          <ol className="list-decimal pl-4 mt-1">
            <li>Выделите область на чертеже</li>
            <li>Выберите объекты кликом</li>
            <li>Нажмите "Запустить укладку"</li>
          </ol>
        </div>
      </div>
    </div>
  );
};
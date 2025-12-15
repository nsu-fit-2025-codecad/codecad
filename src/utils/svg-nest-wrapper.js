// Обертка для SVGnest - чисто JavaScript файл

/**
 * Запуск укладки через SVGnest
 * @param {Array<Array<{x: number, y: number}>>} polygons - Полигоны для укладки
 * @param {Array<Array<{x: number, y: number}>>} container - Контейнер для укладки
 * @param {{curveTolerance?: number, spacing?: number, rotations?: number, populationSize?: number, mutationRate?: number, useHoles?: boolean}} config - Конфигурация
 * @param {(progress: number) => void} onProgress - Callback прогресса
 * @returns {Promise<Array<{x: number, y: number, rotation: number}>>} - Размещенные объекты
 */
export const runSvgNest = async (polygons, container, config, onProgress) => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.SVGnest) {
      reject(new Error('SVGnest library not loaded. Check CDN script in index.html'));
      return;
    }

    try {
      window.SVGnest.nest(
        polygons,
        container,
        config,
        (progress) => {
          if (onProgress) onProgress(progress * 100);
        },
        (error, placements) => {
          if (error) {
            reject(error);
          } else {
            resolve(placements);
          }
        }
      );
    } catch (error) {
      reject(error);
    }
  });
};
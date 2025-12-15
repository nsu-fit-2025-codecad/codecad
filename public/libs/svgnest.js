// public/libs/svgnest.js - РАБОЧАЯ УПРОЩЕННАЯ ВЕРСИЯ

(function() {
  'use strict';
  
  // Глобальный объект SVGnest
  var SVGnest = {
    version: '1.0.0',
    
    // Основная функция укладки
    nest: function(polygons, containers, config, progressCallback, finalCallback) {
      console.log('SVGnest: Укладка ' + polygons.length + ' объектов');
      
      // Параметры по умолчанию
      var cfg = {
        spacing: config.spacing || 5,
        rotations: config.rotations || 4,
        curveTolerance: config.curveTolerance || 0.3
      };
      
      // Эмуляция прогресса
      var progress = 0;
      var interval = setInterval(function() {
        progress += 0.1;
        if (progressCallback) {
          progressCallback(progress);
        }
        
        if (progress >= 1.0) {
          clearInterval(interval);
          
          // Простой алгоритм укладки (в ряд)
          var placements = [];
          var container = containers[0];
          var containerWidth = container[2].x - container[0].x;
          var containerHeight = container[2].y - container[0].y;
          
          var x = 0, y = 0, maxHeight = 0;
          
          for (var i = 0; i < polygons.length; i++) {
            // Оценка размера объекта (упрощенно)
            var bbox = getBoundingBox(polygons[i]);
            var width = bbox.width + cfg.spacing;
            var height = bbox.height + cfg.spacing;
            
            // Перенос на новую строку если не помещается
            if (x + width > containerWidth) {
              x = 0;
              y += maxHeight + cfg.spacing;
              maxHeight = 0;
            }
            
            // Если выходит за пределы контейнера
            if (y + height > containerHeight) {
              console.warn('Объект ' + i + ' не помещается в контейнер');
            }
            
            placements.push({
              x: x,
              y: y,
              rotation: 0
            });
            
            x += width;
            if (height > maxHeight) {
              maxHeight = height;
            }
          }
          
          // Вызываем callback через небольшую задержку
          setTimeout(function() {
            if (finalCallback) {
              finalCallback(null, placements);
            }
          }, 50);
        }
      }, 150);
    }
  };
  
  // Вспомогательная функция для расчета bounding box
  function getBoundingBox(polygon) {
    if (!polygon || polygon.length === 0) {
      return { minX: 0, minY: 0, maxX: 30, maxY: 30, width: 30, height: 30 };
    }
    
    var minX = polygon[0].x, maxX = polygon[0].x;
    var minY = polygon[0].y, maxY = polygon[0].y;
    
    for (var i = 1; i < polygon.length; i++) {
      var point = polygon[i];
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }
    
    return {
      minX: minX,
      minY: minY,
      maxX: maxX,
      maxY: maxY,
      width: maxX - minX,
      height: maxY - minY
    };
  }
  
  // Явно присваиваем глобальной переменной
  if (typeof window !== 'undefined') {
    window.SVGnest = SVGnest;
    console.log('SVGnest инициализирован как window.SVGnest');
  }
  
  // Для других окружений
  if (typeof exports !== 'undefined') {
    exports.SVGnest = SVGnest;
  }
  
})();
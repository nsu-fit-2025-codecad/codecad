# Release Plan — CAD Nesting Web App

## 1. Участники релиза

### Команда разработки

* Бадин Иван 23214
* Цыганов Александр 23213

---

### Заказчик / преподаватель

Мордвинов Александр Валентинович
---

### Пользователь



---

## 2. Цели релиза

### Основной функционал

* Кодовое создание моделей через Maker.js
* Динамическая компиляция (`cad/runtime.ts`)
* SVG визуализация моделей
* Панель параметров (react store)
* Nesting engine:

  * генетический алгоритм
  * NFP (no-fit polygons)
  * оптимизация размещения
* Web Worker вычисления (`nesting.worker.ts`)
* Экспорт в `.dxf`
* Undo/Redo система
* Шаринг проекта через URL
* Demo сцены (MVP режим)

---

### Улучшения в релизе

* ускорение nesting (worker parallelization)
* стабилизация геометрии (polygon cleanup)
* улучшение UX (toolbar, panes)
* автозапуск (autorun)
* history system (snapshots)

---

## 3. Инструкция по развёртыванию

### Требования

* Node.js 18+
* npm

---

### Локальный запуск

```bash
git clone <repo_url>
cd project
npm install
npm run dev
```

---

### Деплой

* статический сайт
* автоматическая сборка:

  ```bash
  npm install
  npm run build
  npm run start
  ```
* публикация:

* платформа: Render
* ссылка: https://codecad-1.onrender.com/

---

## 4. Безопасность

### Угрозы

#### 1. Выполнение пользовательского кода

* `new Function()` в `HomePage.tsx`
* риск:

  * XSS-подобные сценарии
  * бесконечные циклы

---

#### 2. Перегрузка CPU

* nesting (genetic algorithm)
* сложные полигоны

---

#### 3. Memory leaks

* большие модели
* worker computation

---

### Меры защиты

* Web Workers для изоляции вычислений
* ограничения:

  * max iterations nesting
  * max polygons
* try/catch в runtime:

  * `cad/runtime.ts`
* sandbox подход для eval-кода
* debounce autorun (180ms)

---

## 5. Туториал / кейс использования

### Сценарий тестирования

#### Шаг 1 — открыть приложение

URL: https://codecad-1.onrender.com/

---

#### Шаг 2 — вставить код модели(пример)

```js
const mountingPlate = cad
  .panel({
    width: plateWidth,
    height: plateHeight,
    radius: plateRadius,
    holes: [
      { kind: 'circle', x: 18, y: 18, radius: 3.5 },
      { kind: 'circle', x: plateWidth - 18, y: 18, radius: 3.5 },
      { kind: 'circle', x: 18, y: plateHeight - 18, radius: 3.5 },
      { kind: 'circle', x: plateWidth - 18, y: plateHeight - 18, radius: 3.5 }
    ]
  })
  .cut(cad.slot(slotLength, 12).centerAt([plateWidth / 2, 28]))
  .cut(
    cad
      .roundRect(windowWidth, windowHeight, 8)
      .centerAt([plateWidth / 2, plateHeight - 38])
  )
  .cut(cad.circle(6).centerAt([plateWidth / 2, plateHeight - 38]))
  .onLayer('cut');

return cad.flatLayout(
  {
    mountingPlate
  },
  { columns: 1, gapX: 0, gapY: 0 }
);
```

---

#### Шаг 3 — визуализация

* модель появляется в SVG canvas

---

#### Шаг 4 — параметры

* изменить значения в `ParametersPane`
* модель обновляется

---

#### Шаг 5 — nesting

* выбрать модель
* запустить алгоритм
* наблюдать прогресс (`NestingStatus`)

---

#### Шаг 6 — экспорт

* скачать `.dxf`

---

### Ожидаемый результат

* модели не пересекаются
* оптимальное размещение
* корректный DXF файл

---

## 6. Готовая сборка

### Артефакты релиза

#### Frontend build

```
build/
```

#### GitHub Release

* исходники
* README

---

### Платформа хранения

* GitHub Releases
* Render deployment

---



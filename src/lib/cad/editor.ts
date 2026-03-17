import { getCadSnippetEditorCode, type CadSnippetId } from '@/lib/cad/snippets';

const CAD_EDITOR_EXTRA_LIB_PATH = 'ts:cad-runtime-globals.d.ts';

interface CompletionDefinition {
  label: string;
  detail: string;
  documentation: string;
  insertText: string;
  kind: 'function' | 'method' | 'snippet';
  snippetId?: CadSnippetId;
}

interface DisposableLike {
  dispose(): void;
}

interface EditorPositionLike {
  lineNumber: number;
  column: number;
}

interface EditorWordLike {
  startColumn: number;
  endColumn: number;
}

interface EditorModelLike {
  getWordUntilPosition(position: EditorPositionLike): EditorWordLike;
  getLineContent(lineNumber: number): string;
}

interface CompletionRangeLike {
  startLineNumber: number;
  endLineNumber: number;
  startColumn: number;
  endColumn: number;
}

interface CompletionItemLike {
  label: string;
  detail: string;
  documentation: {
    value: string;
  };
  insertText: string;
  insertTextRules?: number;
  kind: number;
  range: CompletionRangeLike;
  sortText: string;
}

interface CompletionProviderLike {
  triggerCharacters?: string[];
  provideCompletionItems(
    model: EditorModelLike,
    position: EditorPositionLike
  ): {
    suggestions: CompletionItemLike[];
  };
}

interface MonacoEditorApi {
  languages: {
    CompletionItemKind: {
      Function: number;
      Method: number;
      Snippet: number;
    };
    CompletionItemInsertTextRule: {
      InsertAsSnippet: number;
    };
    typescript: {
      javascriptDefaults: {
        addExtraLib(content: string, filePath?: string): DisposableLike;
      };
    };
    registerCompletionItemProvider(
      languageId: string,
      provider: CompletionProviderLike
    ): DisposableLike;
  };
}

export const CAD_EDITOR_EXTRA_LIB = `
type Point2D = readonly [number, number];
type Anchor2D =
  | 'origin'
  | 'center'
  | 'topLeft'
  | 'top'
  | 'topRight'
  | 'right'
  | 'bottomRight'
  | 'bottom'
  | 'bottomLeft'
  | 'left';
type PanelEdgeKind = 'plain' | 'tabs' | 'notches';

type PanelEdgeOptions =
  | { kind: 'plain' }
  | {
      kind: 'tabs' | 'notches';
      count: number;
      segmentLength: number;
      depth?: number;
      inset?: number;
    };

interface PanelEdgesOptions {
  top?: PanelEdgeOptions;
  right?: PanelEdgeOptions;
  bottom?: PanelEdgeOptions;
  left?: PanelEdgeOptions;
}

interface PanelInsetOptions {
  margin: number;
  radius?: number;
}

type PanelHoleSpec =
  | { kind: 'circle'; x: number; y: number; radius: number }
  | {
      kind: 'slot';
      x: number;
      y: number;
      length: number;
      width: number;
      angleDeg?: number;
    };

interface PanelOptions {
  width: number;
  height: number;
  radius?: number;
  inset?: PanelInsetOptions;
  thickness?: number;
  clearance?: number;
  edges?: PanelEdgesOptions;
  holes?: readonly PanelHoleSpec[];
}

interface FlatLayoutOptions {
  columns: number;
  gapX: number;
  gapY: number;
}

interface CadEntity {
  translate(x: number, y: number): CadEntity;
  rotate(angleDeg: number, origin?: Point2D): CadEntity;
  scale(factor: number, origin?: Point2D): CadEntity;
  mirror(axis: 'x' | 'y'): CadEntity;
  union(other: CadEntity): CadEntity;
  cut(other: CadEntity): CadEntity;
  intersect(other: CadEntity): CadEntity;
  moveTo(point: Point2D, anchor?: Anchor2D): CadEntity;
  centerAt(point: Point2D): CadEntity;
  alignTo(target: CadEntity | Point2D, fromAnchor?: Anchor2D, toAnchor?: Anchor2D): CadEntity;
  array(count: number, stepX: number, stepY?: number): CadEntity;
  grid(columns: number, rows: number, stepX: number, stepY: number): CadEntity;
  polarArray(count: number, angleStepDeg: number, options?: {
    radius?: number;
    origin?: Point2D;
    startAngleDeg?: number;
    rotateItems?: boolean;
  }): CadEntity;
  onLayer(layer: string): CadEntity;
  tag(...tags: string[]): CadEntity;
}

interface CadRuntime {
  rect(width: number, height: number): CadEntity;
  circle(radius: number): CadEntity;
  ring(outerRadius: number, innerRadius: number): CadEntity;
  roundRect(width: number, height: number, radius: number): CadEntity;
  capsule(width: number, height: number): CadEntity;
  slot(length: number, width: number): CadEntity;
  polyline(points: readonly Point2D[], options?: { closed?: boolean }): CadEntity;
  trackPath(points: readonly Point2D[], width: number, options?: { closed?: boolean }): CadEntity;
  frame(width: number, height: number, thickness: number, options?: { radius?: number }): CadEntity;
  panel(options: {
    width: number;
    height: number;
    radius?: number;
    inset?: {
      margin: number;
      radius?: number;
    };
    thickness?: number;
    clearance?: number;
    edges?: {
      top?:
        | { kind: 'plain' }
        | {
            kind: 'tabs' | 'notches';
            count: number;
            segmentLength: number;
            depth?: number;
            inset?: number;
          };
      right?:
        | { kind: 'plain' }
        | {
            kind: 'tabs' | 'notches';
            count: number;
            segmentLength: number;
            depth?: number;
            inset?: number;
          };
      bottom?:
        | { kind: 'plain' }
        | {
            kind: 'tabs' | 'notches';
            count: number;
            segmentLength: number;
            depth?: number;
            inset?: number;
          };
      left?:
        | { kind: 'plain' }
        | {
            kind: 'tabs' | 'notches';
            count: number;
            segmentLength: number;
            depth?: number;
            inset?: number;
          };
    };
    holes?: readonly Array<
      | {
          kind: 'circle';
          x: number;
          y: number;
          radius: number;
        }
      | {
          kind: 'slot';
          x: number;
          y: number;
          length: number;
          width: number;
          angleDeg?: number;
        }
    >;
  }): CadEntity;
  spokeWheel(options: {
    outerRadius: number;
    innerRadius: number;
    spokes: number;
    spokeWidth?: number;
    hubRadius?: number;
    bore?: number;
  }): CadEntity;
  gear(options: {
    teeth: number;
    outerRadius: number;
    rootRadius: number;
    bore?: number;
    toothFraction?: number;
    rootFraction?: number;
    rotationDeg?: number;
  }): CadEntity;
  clockFace(options: {
    radius: number;
    rimWidth?: number;
    tickCount?: number;
    tickLength?: number;
    tickWidth?: number;
    centerHole?: number;
  }): CadEntity;
  fromSvgPathData(pathData: string, options?: { bezierAccuracy?: number }): CadEntity;
  flatLayout(
    parts: { [id: string]: CadEntity },
    options: {
      columns: number;
      gapX: number;
      gapY: number;
    }
  ): CadEntity;
  assembly(children: Record<string, CadEntity>): CadEntity;
  sketch(children: Record<string, CadEntity>): CadEntity;
  compileToMaker(value: CadEntity): unknown;
}

declare const cad: CadRuntime;
declare const makerjs: any;
`;

const CAD_FACTORY_COMPLETIONS: CompletionDefinition[] = [
  {
    label: 'rect',
    detail: 'cad.rect(width, height)',
    documentation: 'Создаёт прямоугольник от локальной точки [0, 0].',
    insertText: 'rect(${1:width}, ${2:height})',
    kind: 'function',
  },
  {
    label: 'circle',
    detail: 'cad.circle(radius)',
    documentation: 'Создаёт круг с центром в локальной точке [0, 0].',
    insertText: 'circle(${1:radius})',
    kind: 'function',
  },
  {
    label: 'roundRect',
    detail: 'cad.roundRect(width, height, radius)',
    documentation: 'Создаёт скруглённый прямоугольник.',
    insertText: 'roundRect(${1:width}, ${2:height}, ${3:radius})',
    kind: 'function',
  },
  {
    label: 'panel',
    detail: 'cad.panel(options)',
    documentation:
      'Создаёт плоскую панель. Может включать отверстия и профили кромок.',
    insertText:
      "panel({\n  width: ${1:120},\n  height: ${2:82},\n  thickness: ${3:3},\n  clearance: ${4:0.15},\n  edges: {\n    top: { kind: 'notches', count: ${5:2}, segmentLength: ${6:24} },\n    bottom: { kind: 'notches', count: ${7:2}, segmentLength: ${8:24} },\n    left: { kind: 'tabs', count: ${9:2}, segmentLength: ${10:18} },\n    right: { kind: 'tabs', count: ${11:2}, segmentLength: ${12:18} }\n  }\n})",
    kind: 'function',
  },
  {
    label: 'flatLayout',
    detail: 'cad.flatLayout(parts, options)',
    documentation: 'Раскладывает набор деталей в строки и столбцы.',
    insertText:
      'flatLayout({\n  ${1:front}: ${2:cad.panel({ width: 120, height: 80 })}\n}, { columns: ${3:2}, gapX: ${4:18}, gapY: ${5:18} })',
    kind: 'function',
  },
  {
    label: 'gear',
    detail: 'cad.gear(options)',
    documentation:
      'Создаёт декоративную шестерню с настраиваемой шириной зуба и впадины.',
    insertText:
      'gear({\n  teeth: ${1:14},\n  outerRadius: ${2:34},\n  rootRadius: ${3:25},\n  bore: ${4:10}\n})',
    kind: 'function',
  },
  {
    label: 'clockFace',
    detail: 'cad.clockFace(options)',
    documentation:
      'Создаёт циферблат с ободом, делениями и центральным отверстием.',
    insertText:
      'clockFace({\n  radius: ${1:42},\n  rimWidth: ${2:8},\n  tickCount: ${3:12},\n  centerHole: ${4:6}\n})',
    kind: 'function',
  },
  {
    label: 'trackPath',
    detail: 'cad.trackPath(points, width, options?)',
    documentation: 'Создаёт широкую дорожку по центральной линии.',
    insertText:
      'trackPath([\n  [${1:0}, ${2:0}],\n  [${3:60}, ${4:0}],\n  [${5:60}, ${6:30}]\n], ${7:10})',
    kind: 'function',
  },
  {
    label: 'sketch',
    detail: 'cad.sketch(children)',
    documentation:
      'Создаёт корневой sketch, который обычно возвращается из кода.',
    insertText: 'sketch({\n  ${1:part}: ${2:cad.rect(100, 60)}\n})',
    kind: 'function',
  },
];

const CAD_METHOD_COMPLETIONS: CompletionDefinition[] = [
  {
    label: 'centerAt',
    detail: 'shape.centerAt([x, y])',
    documentation:
      'Ставит фигуру так, чтобы её центр оказался в указанной точке.',
    insertText: 'centerAt([${1:x}, ${2:y}])',
    kind: 'method',
  },
  {
    label: 'moveTo',
    detail: "shape.moveTo([x, y], 'anchor')",
    documentation:
      'Переносит выбранную опорную точку фигуры в указанное место.',
    insertText: "moveTo([${1:x}, ${2:y}], '${3:center}')",
    kind: 'method',
  },
  {
    label: 'alignTo',
    detail: "shape.alignTo(target, 'fromAnchor', 'toAnchor')",
    documentation:
      'Выравнивает опорную точку текущей фигуры по опорной точке цели.',
    insertText: "alignTo(${1:target}, '${2:center}', '${3:center}')",
    kind: 'method',
  },
  {
    label: 'cut',
    detail: 'shape.cut(other)',
    documentation: 'Вычитает одну фигуру из другой.',
    insertText: 'cut(${1:other})',
    kind: 'method',
  },
  {
    label: 'union',
    detail: 'shape.union(other)',
    documentation: 'Объединяет текущую фигуру с другой.',
    insertText: 'union(${1:other})',
    kind: 'method',
  },
  {
    label: 'intersect',
    detail: 'shape.intersect(other)',
    documentation: 'Оставляет только область пересечения двух фигур.',
    insertText: 'intersect(${1:other})',
    kind: 'method',
  },
  {
    label: 'polarArray',
    detail: 'shape.polarArray(count, angleStepDeg, options?)',
    documentation: 'Повторяет фигуру по окружности.',
    insertText:
      'polarArray(${1:count}, ${2:angleStepDeg}, { radius: ${3:40}, rotateItems: ${4:true} })',
    kind: 'method',
  },
  {
    label: 'onLayer',
    detail: "shape.onLayer('cut')",
    documentation: 'Назначает слой Maker.js для итоговой геометрии.',
    insertText: "onLayer('${1:cut}')",
    kind: 'method',
  },
];

export const CAD_EDITOR_SNIPPETS: CompletionDefinition[] = [
  {
    label: 'cad sketch',
    detail: 'Минимальный sketch',
    documentation: 'Быстрый старт с cad.sketch и одной базовой деталью.',
    insertText: getCadSnippetEditorCode('quickStart'),
    kind: 'snippet',
    snippetId: 'quickStart',
  },
  {
    label: 'cad scene',
    detail: 'Небольшая сцена',
    documentation:
      'Вставляет компактную сцену с базой, дверцей, часами, дорожкой и фигурой.',
    insertText: getCadSnippetEditorCode('defaultEditorScene'),
    kind: 'snippet',
    snippetId: 'defaultEditorScene',
  },
  {
    label: 'cad panel',
    detail: 'Пример панели',
    documentation: 'Вставляет панель с кромками типа tabs/notches.',
    insertText: getCadSnippetEditorCode('helperPanel'),
    kind: 'snippet',
    snippetId: 'helperPanel',
  },
  {
    label: 'cad flat layout',
    detail: 'Раскладка деталей',
    documentation:
      'Вставляет набор согласованных панелей и раскладывает их на листе.',
    insertText: getCadSnippetEditorCode('helperFlatLayout'),
    kind: 'snippet',
    snippetId: 'helperFlatLayout',
  },
  {
    label: 'cad gear',
    detail: 'Пример шестерни',
    documentation: 'Вставляет декоративную шестерню и ставит её по центру.',
    insertText: getCadSnippetEditorCode('helperGear'),
    kind: 'snippet',
    snippetId: 'helperGear',
  },
  {
    label: 'cad clock',
    detail: 'Пример циферблата',
    documentation:
      'Вставляет циферблат с ободом, делениями и центральным отверстием.',
    insertText: getCadSnippetEditorCode('helperClockFace'),
    kind: 'snippet',
    snippetId: 'helperClockFace',
  },
  {
    label: 'cad track',
    detail: 'Пример дорожки',
    documentation: 'Вставляет простую дорожку для лабиринтов и треков.',
    insertText: getCadSnippetEditorCode('primitiveTrackPath'),
    kind: 'snippet',
    snippetId: 'primitiveTrackPath',
  },
];

let extraLibDisposable: DisposableLike | null = null;
let completionDisposable: DisposableLike | null = null;

const toCompletionKind = (
  monaco: MonacoEditorApi,
  kind: CompletionDefinition['kind']
): number => {
  switch (kind) {
    case 'function':
      return monaco.languages.CompletionItemKind.Function;
    case 'method':
      return monaco.languages.CompletionItemKind.Method;
    case 'snippet':
      return monaco.languages.CompletionItemKind.Snippet;
  }
};

const createCompletionItems = (
  monaco: MonacoEditorApi,
  range: CompletionRangeLike,
  definitions: readonly CompletionDefinition[]
): CompletionItemLike[] =>
  definitions.map((definition, index) => ({
    label: definition.label,
    detail: definition.detail,
    documentation: {
      value: definition.documentation,
    },
    insertText: definition.insertText,
    insertTextRules:
      definition.kind === 'snippet'
        ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
        : undefined,
    kind: toCompletionKind(monaco, definition.kind),
    range,
    sortText: `${index}`.padStart(3, '0'),
  }));

const linePrefixEndsWithDot = (linePrefix: string): boolean =>
  /\.\s*$/.test(linePrefix);

const linePrefixTargetsCadFactories = (linePrefix: string): boolean =>
  /cad\.[\w$]*$/.test(linePrefix);

export const configureCadEditor = (monaco: MonacoEditorApi): void => {
  if (!extraLibDisposable) {
    extraLibDisposable =
      monaco.languages.typescript.javascriptDefaults.addExtraLib(
        CAD_EDITOR_EXTRA_LIB,
        CAD_EDITOR_EXTRA_LIB_PATH
      );
  }

  if (completionDisposable) {
    return;
  }

  completionDisposable = monaco.languages.registerCompletionItemProvider(
    'javascript',
    {
      triggerCharacters: ['.'],
      provideCompletionItems(model, position) {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };
        const linePrefix = model
          .getLineContent(position.lineNumber)
          .slice(0, position.column - 1);

        if (linePrefixTargetsCadFactories(linePrefix)) {
          return {
            suggestions: createCompletionItems(
              monaco,
              range,
              CAD_FACTORY_COMPLETIONS
            ),
          };
        }

        if (linePrefixEndsWithDot(linePrefix)) {
          return {
            suggestions: createCompletionItems(
              monaco,
              range,
              CAD_METHOD_COMPLETIONS
            ),
          };
        }

        return {
          suggestions: createCompletionItems(
            monaco,
            range,
            CAD_EDITOR_SNIPPETS
          ),
        };
      },
    }
  );
};

export const resetCadEditorEnhancementsForTest = (): void => {
  completionDisposable?.dispose();
  extraLibDisposable?.dispose();
  completionDisposable = null;
  extraLibDisposable = null;
};

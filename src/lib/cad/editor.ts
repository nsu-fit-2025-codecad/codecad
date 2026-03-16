const CAD_EDITOR_EXTRA_LIB_PATH = 'ts:cad-runtime-globals.d.ts';

interface CompletionDefinition {
  label: string;
  detail: string;
  documentation: string;
  insertText: string;
  kind: 'function' | 'method' | 'snippet';
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
    inset?: { margin: number; radius?: number };
    holes?: readonly Array<
      | { kind: 'circle'; x: number; y: number; radius: number }
      | { kind: 'slot'; x: number; y: number; length: number; width: number; angleDeg?: number }
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
    documentation: 'Create a rectangle from the top-left origin.',
    insertText: 'rect(${1:width}, ${2:height})',
    kind: 'function',
  },
  {
    label: 'circle',
    detail: 'cad.circle(radius)',
    documentation: 'Create a circle centered at the local origin.',
    insertText: 'circle(${1:radius})',
    kind: 'function',
  },
  {
    label: 'roundRect',
    detail: 'cad.roundRect(width, height, radius)',
    documentation: 'Create a rounded rectangle.',
    insertText: 'roundRect(${1:width}, ${2:height}, ${3:radius})',
    kind: 'function',
  },
  {
    label: 'panel',
    detail: 'cad.panel(options)',
    documentation:
      'Create a laser-cut style panel with optional inset and holes.',
    insertText:
      'panel({\n  width: ${1:120},\n  height: ${2:92},\n  radius: ${3:14},\n  inset: { margin: ${4:16}, radius: ${5:8} }\n})',
    kind: 'function',
  },
  {
    label: 'gear',
    detail: 'cad.gear(options)',
    documentation:
      'Create a decorative gear outline with configurable tooth and valley widths.',
    insertText:
      'gear({\n  teeth: ${1:14},\n  outerRadius: ${2:34},\n  rootRadius: ${3:25},\n  bore: ${4:10}\n})',
    kind: 'function',
  },
  {
    label: 'clockFace',
    detail: 'cad.clockFace(options)',
    documentation: 'Create a clock face body with etched rim and ticks.',
    insertText:
      'clockFace({\n  radius: ${1:42},\n  rimWidth: ${2:8},\n  tickCount: ${3:12},\n  centerHole: ${4:6}\n})',
    kind: 'function',
  },
  {
    label: 'trackPath',
    detail: 'cad.trackPath(points, width, options?)',
    documentation: 'Create a wide track from a centerline path.',
    insertText:
      'trackPath([\n  [${1:0}, ${2:0}],\n  [${3:60}, ${4:0}],\n  [${5:60}, ${6:30}]\n], ${7:10})',
    kind: 'function',
  },
  {
    label: 'sketch',
    detail: 'cad.sketch(children)',
    documentation: 'Create the root document returned by editor code.',
    insertText: 'sketch({\n  ${1:part}: ${2:cad.rect(100, 60)}\n})',
    kind: 'function',
  },
];

const CAD_METHOD_COMPLETIONS: CompletionDefinition[] = [
  {
    label: 'centerAt',
    detail: 'shape.centerAt([x, y])',
    documentation:
      'Move the shape so its placement center lands at the target point.',
    insertText: 'centerAt([${1:x}, ${2:y}])',
    kind: 'method',
  },
  {
    label: 'moveTo',
    detail: "shape.moveTo([x, y], 'anchor')",
    documentation: 'Move a specific anchor of the shape to a target point.',
    insertText: "moveTo([${1:x}, ${2:y}], '${3:center}')",
    kind: 'method',
  },
  {
    label: 'alignTo',
    detail: "shape.alignTo(target, 'fromAnchor', 'toAnchor')",
    documentation:
      'Align one anchor on the current shape to another target anchor.',
    insertText: "alignTo(${1:target}, '${2:center}', '${3:center}')",
    kind: 'method',
  },
  {
    label: 'cut',
    detail: 'shape.cut(other)',
    documentation: 'Subtract another shape from the current one.',
    insertText: 'cut(${1:other})',
    kind: 'method',
  },
  {
    label: 'union',
    detail: 'shape.union(other)',
    documentation: 'Union the current shape with another shape.',
    insertText: 'union(${1:other})',
    kind: 'method',
  },
  {
    label: 'intersect',
    detail: 'shape.intersect(other)',
    documentation: 'Keep only the overlapping area between two shapes.',
    insertText: 'intersect(${1:other})',
    kind: 'method',
  },
  {
    label: 'polarArray',
    detail: 'shape.polarArray(count, angleStepDeg, options?)',
    documentation: 'Repeat a shape around a circle.',
    insertText:
      'polarArray(${1:count}, ${2:angleStepDeg}, { radius: ${3:40}, rotateItems: ${4:true} })',
    kind: 'method',
  },
  {
    label: 'onLayer',
    detail: "shape.onLayer('cut')",
    documentation: 'Assign a Maker.js layer to the compiled geometry.',
    insertText: "onLayer('${1:cut}')",
    kind: 'method',
  },
];

export const CAD_EDITOR_SNIPPETS: CompletionDefinition[] = [
  {
    label: 'cad sketch',
    detail: 'Busy-board sketch scaffold',
    documentation: 'Start with a cad.sketch root and a single panel.',
    insertText:
      'return cad.sketch({\n  panel: cad.panel({\n    width: ${1:120},\n    height: ${2:92},\n    radius: ${3:14}\n  })\n});',
    kind: 'snippet',
  },
  {
    label: 'cad panel',
    detail: 'Panel helper snippet',
    documentation: 'Insert a laser-cut panel with inset and corner holes.',
    insertText:
      "const ${1:panel} = cad.panel({\n  width: ${2:120},\n  height: ${3:92},\n  radius: ${4:14},\n  inset: { margin: ${5:16}, radius: ${6:8} },\n  holes: [\n    { kind: 'circle', x: 18, y: 18, radius: 3 },\n    { kind: 'circle', x: 102, y: 18, radius: 3 }\n  ]\n});",
    kind: 'snippet',
  },
  {
    label: 'cad gear',
    detail: 'Gear helper snippet',
    documentation: 'Insert a decorative gear and center it on the canvas.',
    insertText:
      'const ${1:gear} = cad.gear({\n  teeth: ${2:14},\n  outerRadius: ${3:34},\n  rootRadius: ${4:25},\n  bore: ${5:10}\n}).centerAt([${6:45}, ${7:45}]);',
    kind: 'snippet',
  },
  {
    label: 'cad clock',
    detail: 'Clock face snippet',
    documentation: 'Insert a clock face with rim, ticks, and center hole.',
    insertText:
      'const ${1:clock} = cad.clockFace({\n  radius: ${2:42},\n  rimWidth: ${3:8},\n  tickCount: ${4:12},\n  centerHole: ${5:6}\n});',
    kind: 'snippet',
  },
  {
    label: 'cad track',
    detail: 'Track path snippet',
    documentation: 'Insert a simple track path for busy-board mazes.',
    insertText:
      'const ${1:maze} = cad.trackPath([\n  [${2:0}, ${3:0}],\n  [${4:60}, ${5:0}],\n  [${6:60}, ${7:30}],\n  [${8:25}, ${9:30}]\n], ${10:10});',
    kind: 'snippet',
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
